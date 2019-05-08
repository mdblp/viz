import bows from 'bows';
import crossfilter from 'crossfilter'; // eslint-disable-line import/no-unresolved
import moment from 'moment-timezone';
import _ from 'lodash';

import {
  BGM_DATA_KEY,
  CGM_DATA_KEY,
  DEFAULT_BG_BOUNDS,
  MS_IN_DAY,
  MS_IN_MIN,
  MGDL_UNITS,
} from './constants';

import {
  convertToMGDL,
  convertToMmolL,
} from './bloodglucose';

import {
  addDuration,
  getMsPer24,
  getOffset,
  getTimezoneFromTimePrefs,
} from './datetime';

import { getLatestPumpUpload } from './device';
import StatUtil from './StatUtil';
import { statFetchMethods } from './stat';

/* eslint-disable lodash/prefer-lodash-method */
/* global __DEV__ */

export class DataUtil {
  /**
   * @param {Array} data Raw Tidepool data
   */
  constructor(data = []) {
    this.log = bows('DataUtil');
    this.startTimer = __DEV__ ? name => console.time(name) : _.noop;
    this.endTimer = __DEV__ ? name => console.timeEnd(name) : _.noop;
    this.init(data);
  }

  init = data => {
    this.startTimer('init total');
    this.data = crossfilter([]);
    this.endpoints = {};

    this.addData(data);

    this.buildDimensions();
    this.buildFilters();
    this.buildSorts();
    this.endTimer('init total');
  };

  addData = data => {
    this.startTimer('addData');
    this.log('addData', 'count', data.length);
    _.each(data, this.setDatumHammerTime);
    this.data.add(_.filter(_.uniqBy(data, 'id'), _.isPlainObject));
    this.endTimer('addData');
  };

  /* eslint-disable no-param-reassign */
  setDatumHammerTime = d => {
    if (d.time) d.time = Date.parse(d.time);
    if (d.deviceTime) d.deviceTime = Date.parse(d.deviceTime);
  };

  normalizeDatum = d => {
    const { timezoneName } = this.timePrefs || {};

    if (timezoneName) {
      d.normalTime = d.time;
      d.displayOffset = -getOffset(d.time, timezoneName);
    } else {
      // timezoneOffset is an optional attribute according to the Tidepool data model
      if (d.timezoneOffset != null && d.conversionOffset != null) {
        d.normalTime = addDuration(d.time, d.timezoneOffset * MS_IN_MIN + d.conversionOffset);
      } else {
        d.normalTime = _.isEmpty(d.deviceTime) ? d.time : `${d.deviceTime}.000Z`;
      }

      // displayOffset always 0 when not timezoneAware
      d.displayOffset = 0;
      if (d.deviceTime && d.normalTime.slice(0, -5) !== d.deviceTime) {
        d.warning = 'Combining `time` and `timezoneOffset` does not yield `deviceTime`.';
      }
    }

    if (d.type === 'basal') {
      d.normalEnd = addDuration(d.normalTime, d.duration);
      d.subType = d.deliveryType; // TODO: is this needed?
    }

    if (d.type === 'cbg' || d.type === 'smbg') {
      this.normalizeDatumBgUnits(d);

      d.msPer24 = getMsPer24(d.normalTime, timezoneName); // TODO: This is the SLOOOWWW one

      // const date = new Date(d.normalTime);
      // const utcDate = new Date(Date.UTC(
      //   date.getUTCFullYear(),
      //   date.getUTCMonth(),
      //   date.getUTCDay(),
      //   date.getUTCHours(),
      //   date.getUTCMinutes(),
      //   date.getUTCSeconds(),
      //   date.getUTCMilliseconds(),
      // ));
      // const dateFloor = new Date(Date.UTC(
      //   date.getUTCFullYear(),
      //   date.getUTCMonth(),
      //   date.getUTCDay()
      // ));

      // const dateFloor = new Date(utcDate.getTime());
      // const offsetMS = d.displayOffset * 60000;


      // const normalDate = new Date(d.normalTime);
      // const dateFloor = new Date(normalDate.getTime());
      // dateFloor.setUTCHours(0);
      // dateFloor.setUTCMinutes(0);
      // dateFloor.setUTCSeconds(0);
      // dateFloor.setUTCMilliseconds(0);
      // d.msPer24 = normalDate - dateFloor;


      // d.msPer24b = normalDate - dateFloor;
      // d.msPer24b = utcDate - dateFloor;

      // if (!this.mismatchThrown1 && d.msPer24 !== d.msPer24b + offsetMS) {
      //   console.error('msPer24 mismatch!', d.msPer24, d.msPer24b, offsetMS, d.msPer24b + offsetMS);
      //   this.mismatchThrown1 = true;
      // }
    }
  };

  normalizeDatumBgUnits = d => {
    const bgUnits = _.get(this.bgPrefs, 'bgUnits');

    if (d.units !== bgUnits) {
      d.units = bgUnits;
      d.value = bgUnits === MGDL_UNITS ? convertToMGDL(d.value) : convertToMmolL(d.value);
    }
  };
  /* eslint-enable no-param-reassign */

  removeData = predicate => {
    this.clearFilters();
    this.data.remove(predicate);
  };

  buildDimensions = () => {
    this.startTimer('buildDimensions');
    this.dimension = {};

    this.dimension.byTime = this.data.dimension(
      d => d.time
      // d => moment.utc(d.time).tz('UTC').toISOString()
    );

    this.dimension.byDeviceTime = this.data.dimension(
      d => d.deviceTime
      // d => moment.utc(d.deviceTime).tz('UTC').toISOString()
    );

    this.dimension.byDayOfWeek = this.data.dimension(
      d => moment.utc(d.time).tz('UTC').day()
    );

    this.dimension.byType = this.data.dimension(d => d.type);
    this.endTimer('buildDimensions');
  };

  buildFilters = () => {
    this.startTimer('buildFilters');
    this.filter = {};
    this.filter.byActiveDays = activeDays => this.dimension.byDayOfWeek
      .filterFunction(d => _.includes(activeDays, d));

    this.filter.byEndpoints = endpoints => this.dimension.byTime.filterRange(endpoints);
    this.filter.byType = type => this.dimension.byType.filterExact(type);
    this.endTimer('buildFilters');
  };

  buildSorts = () => {
    this.startTimer('buildSorts');
    this.sort = {};
    this.sort.byTime = array => (
      crossfilter.quicksort.by(d => d.time)(array, 0, array.length)
    );
    this.endTimer('buildSorts');
  };

  clearFilters = () => {
    this.dimension.byTime.filterAll();
    this.dimension.byDayOfWeek.filterAll();
    this.dimension.byType.filterAll();
  };

  setBgSources = () => {
    const bgSources = {
      cbg: this.filter.byType(CGM_DATA_KEY).top(Infinity).length > 0,
      smbg: this.filter.byType(BGM_DATA_KEY).top(Infinity).length > 0,
    };

    if (bgSources.cbg) {
      bgSources.current = CGM_DATA_KEY;
    } else if (bgSources.smbg) {
      bgSources.current = BGM_DATA_KEY;
    }

    this.bgSources = bgSources;
  };

  setLatestPump = () => {
    const uploadData = this.sort.byTime(this.filter.byType('upload').top(Infinity));
    const latestPumpUpload = getLatestPumpUpload(uploadData);
    const latestUploadSource = _.get(latestPumpUpload, 'source', '').toLowerCase();

    this.latestPump = {
      deviceModel: _.get(latestPumpUpload, 'deviceModel', ''),
      manufacturer: latestUploadSource === 'carelink' ? 'medtronic' : latestUploadSource,
    };
  };

  setMetaData = () => {
    this.startTimer('setMetaData');
    this.setBgSources();
    this.setLatestPump();
    this.endTimer('setMetaData');
  };

  setEndpoints = endpoints => {
    this.endpoints = {};

    if (endpoints) {
      const days = moment.utc(endpoints[1]).diff(moment.utc(endpoints[0])) / MS_IN_DAY;
      this.endpoints.current = {
        range: _.map(endpoints, e => moment.utc(e).valueOf()),
        days,
        activeDays: days,
      };

      this.endpoints.next = {
        range: [
          this.endpoints.current.range[1],
          moment.utc(endpoints[1]).add(this.endpoints.current.days, 'days').valueOf(),
        ],
      };

      this.endpoints.prev = {
        range: [
          moment.utc(endpoints[0]).subtract(this.endpoints.current.days, 'days').valueOf(),
          this.endpoints.current.range[0],
        ],
      };
    }
  };

  setActiveDays = activeDays => {
    this.activeDays = activeDays || [0, 1, 2, 3, 4, 5, 6];

    _.each(_.keys(this.endpoints), range => {
      if (range.days) {
        // TODO: this only works if we have a number of days divisible by 7
        this.endpoints[range].activeDays = range.days / 7 * this.activeDays.length;
      }
    });
  };

  setTypes = types => {
    this.types = _.isArray(types) ? types : [];

    if (_.isPlainObject(types)) {
      this.types = _.map(types, (value, type) => ({
        type,
        ...value,
      }));
    }
  };

  setTimePrefs = (timePrefs = {}) => {
    const {
      timezoneAware = false,
    } = timePrefs;

    let timezoneName = timePrefs.timezoneName || undefined;

    if (timezoneAware) {
      timezoneName = getTimezoneFromTimePrefs(timePrefs);
    }

    this.timePrefs = {
      timezoneAware,
      timezoneName,
    };
  };

  setBGPrefs = (bgPrefs = {}) => {
    const {
      bgBounds = DEFAULT_BG_BOUNDS[MGDL_UNITS],
      bgUnits = MGDL_UNITS,
    } = bgPrefs;

    this.bgPrefs = {
      bgBounds,
      bgUnits,
    };
  };

  queryData = (query = {}) => {
    this.startTimer('queryData total');
    const {
      activeDays,
      endpoints,
      stats,
      timePrefs,
      bgPrefs,
      types,
    } = query;

    // TODO: Must ensure that we get the desired endpoints in UTC time so that when we display in
    // the desired time zone, we have all the data.

    // Clear all previous filters
    this.clearFilters();

    // TODO: set meta data based on the entire data set, or only current range?
    this.setMetaData();

    this.setEndpoints(endpoints);
    this.setActiveDays(activeDays);
    this.setTypes(types);
    this.setTimePrefs(timePrefs);
    this.setBGPrefs(bgPrefs);

    const data = {
      current: {},
      next: {},
      prev: {},
    };

    _.each(_.keys(data), range => {
      if (this.endpoints[range]) {
        // Filter the data set by date range
        this.filter.byEndpoints(this.endpoints[range].range);

        // Filter out any inactive days of the week
        if (this.activeDays) this.filter.byActiveDays(this.activeDays);

        const activeDays = 1; // TODO: get count of actual active days

        // Generate the stats for current range
        if (range === 'current' && stats) {
          this.startTimer('generate stats');
          const selectedStats = _.isString(stats) ? _.map(stats.split(','), _.trim) : stats;
          data[range].stats = {};

          this.statUtil = new StatUtil(this, this.endpoints[range]);
          _.each(selectedStats, stat => {
            const method = statFetchMethods[stat];

            if (_.isFunction(this.statUtil[method])) {
              this.startTimer(`stat | ${stat}`);
              data[range].stats[stat] = this.statUtil[method]();
              this.endTimer(`stat | ${stat}`);
            }
          });
          delete this.statUtil;
          this.endTimer('generate stats');
        }

        data[range].endpoints = this.endpoints[range];

        // Populate requested data
        if (this.types.length) {
          data[range].data = {};

          _.each(this.types, ({ type, select, sort = {} }) => {
            const fields = _.isString(select) ? _.map(select.split(','), _.trim) : select;
            let typeData = this.filter.byType(type).top(Infinity);

            // Normalize data
            this.startTimer(`normalize | ${type} | ${range}`);
            _.each(typeData, this.normalizeDatum);
            this.endTimer(`normalize | ${type} | ${range}`);

            // Sort data
            this.startTimer(`sort | ${type} | ${range}`);
            let sortOpts = sort;
            if (_.isString(sortOpts)) {
              const sortArray = _.map(sort.split(','), _.trim);
              sortOpts = {
                field: sortArray[0],
                order: sortArray[1],
              };
            }

            if (sortOpts.field) {
              typeData = _.sortBy(typeData, [sortOpts.field]);
            }

            if (sortOpts.order === 'desc') typeData.reverse();
            this.endTimer(`sort | ${type} | ${range}`);

            // Pick selected fields
            this.startTimer(`select fields | ${type} | ${range}`);
            typeData = _.map(typeData, d => _.pick(d, fields));
            this.endTimer(`select fields | ${type} | ${range}`);

            data[range].data[type] = typeData;
          });
        }
      }
    });
    this.endTimer('queryData total');

    return {
      data,
      timePrefs: this.timePrefs,
      bgPrefs: this.bgPrefs,
      metaData: {
        latestPump: this.latestPump,
        bgSources: this.bgSources,
      },
    };
  };
}

export default DataUtil;
