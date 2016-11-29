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

import _ from 'lodash';
import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as actions from '../../../redux/actions/';
import LabeledCheckbox from '../../common/controls/LabeledCheckbox';

import styles from './RangeSelect.css';

const RangeSelect = (props) =>
  (<div className={styles.container}>
    <LabeledCheckbox
      checked={props.trendsState.cbgFlags.cbg100Enabled}
      name="hundred"
      label="100% of Readings"
      onFn={_.partial(props.turnOnCbgRange, '100')}
      offFn={_.partial(props.turnOffCbgRange, '100')}
    />
    <LabeledCheckbox
      checked={props.trendsState.cbgFlags.cbg80Enabled}
      name="eighty"
      label="80% of Readings"
      onFn={_.partial(props.turnOnCbgRange, '80')}
      offFn={_.partial(props.turnOffCbgRange, '80')}
    />
    <LabeledCheckbox
      checked={props.trendsState.cbgFlags.cbg50Enabled}
      name="fifty"
      label="50% of Readings"
      onFn={_.partial(props.turnOnCbgRange, '50')}
      offFn={_.partial(props.turnOffCbgRange, '50')}
    />
    <LabeledCheckbox
      checked={props.trendsState.cbgFlags.cbgMedianEnabled}
      name="median"
      label="Median"
      onFn={_.partial(props.turnOnCbgRange, 'median')}
      offFn={_.partial(props.turnOffCbgRange, 'median')}
    />
  </div>);

RangeSelect.propTypes = {
  trendsState: PropTypes.object.isRequired,
  changeCbgRange: PropTypes.func.isRequired,
  turnOnCbgRange: PropTypes.func.isRequired,
  turnOffCbgRange: PropTypes.func.isRequired,
};

export function mapStateToProps(state, ownProps) {
  const userId = _.get(ownProps, 'currentPatientInViewId');
  return {
    trendsState: _.get(state, ['viz', 'trends', userId], {}),
  };
}

export function mapDispatchToProps(dispatch, ownProps) {
  return bindActionCreators({
    turnOnCbgRange: _.partial(
      actions.turnOnCbgRange, ownProps.currentPatientInViewId
    ),
    turnOffCbgRange: _.partial(
      actions.turnOffCbgRange, ownProps.currentPatientInViewId
    ),
  }, dispatch);
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  (stateProps, dispatchProps, ownProps) => (_.assign({}, ownProps, stateProps, dispatchProps)),
)(RangeSelect);