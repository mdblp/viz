/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2016, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import i18next from 'i18next';

import { formatLocalizedFromUTC, getHourMinuteFormat } from '../../../utils/datetime';

import Tooltip from '../../common/tooltips/Tooltip';
import colors from '../../../styles/colors.css';
import styles from './ParameterTooltip.css';

class ParameterTooltip extends React.Component {
  renderParameter(parameter) {
    const prev = (parameter.previousValue !== undefined)
      ? <div className={styles.previous}>{parameter.previousValue}&rarr;</div>
      : <div>&nbsp;</div>;
    return (
      <div className={styles.pa} key={parameter.id}>
        <div className={styles.date}>{
          formatLocalizedFromUTC(
            parameter.normalTime,
            this.props.timePrefs,
            getHourMinuteFormat())
          }
        </div>
        <div className={styles.label}>{i18next.t(`params:::${parameter.name}`)} </div>
        {prev}
        <div className={styles.value}>{parameter.value}</div>
        <div className={styles.units}>{i18next.t(`${parameter.units}`)}</div>
      </div>
    );
  }

  renderParameters(parameters) {
    const rows = [];
    for (let i = 0; i < parameters.length; ++i) {
      rows.push(this.renderParameter(parameters[i]));
    }

    return <div className={styles.container}>{rows}</div>;
  }

  render() {
    const { parameter, timePrefs, title } = this.props;

    let dateTitle = null;
    if (title === null) {
      dateTitle = {
        source: _.get(parameter, 'source', 'tidepool'),
        normalTime: parameter.normalTime,
        timezone: _.get(parameter, 'timezone', 'UTC'),
        timePrefs,
      };
    }

    return (
      <Tooltip
        {...this.props}
        title={title}
        dateTitle={dateTitle}
        content={this.renderParameters(this.props.parameter.params)}
      />
    );
  }
}

ParameterTooltip.propTypes = {
  position: PropTypes.shape({
    top: PropTypes.number.isRequired,
    left: PropTypes.number.isRequired,
  }).isRequired,
  offset: PropTypes.shape({
    top: PropTypes.number.isRequired,
    left: PropTypes.number,
    horizontal: PropTypes.number,
  }),
  title: PropTypes.node,
  tail: PropTypes.bool,
  side: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  tailColor: PropTypes.string,
  tailWidth: PropTypes.number,
  tailHeight: PropTypes.number,
  backgroundColor: PropTypes.string,
  borderColor: PropTypes.string,
  borderWidth: PropTypes.number,
  parameter: PropTypes.shape({
    normalTime: PropTypes.string.isRequired,
    params: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        normalTime: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        previousValue: PropTypes.string,
        units: PropTypes.string.isRequired,
      })).isRequired,
  }).isRequired,
  timePrefs: PropTypes.object.isRequired,
};

ParameterTooltip.defaultProps = {
  tail: true,
  side: 'right',
  tailWidth: 9,
  tailHeight: 17,
  tailColor: colors.deviceEvent,
  borderColor: colors.deviceEvent,
  borderWidth: 2,
  title: null,
};

export default ParameterTooltip;
