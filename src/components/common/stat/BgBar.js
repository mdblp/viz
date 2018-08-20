import React, { PropTypes } from 'react';
import _ from 'lodash';
import { Point, Rect, VictoryLabel } from 'victory';
import colors from '../../../styles/colors.css';
import MGDLIcon from './assets/mgdl-inv-24-px.svg';
import MMOLIcon from './assets/mgdl-inv-24-px.svg'; // TODO: Replace with mmol icon when avail
import { MGDL_UNITS } from '../../../utils/constants';

/* global atob */

export const BgBarLabel = props => {
  const {
    barWidth,
    bgPrefs: { bgUnits } = {},
    domain,
    width,
    scale,
    text,
    y,
  } = props;

  const labelStyle = _.assign({}, props.style, {
    pointerEvents: 'none',
  });

  const iconSrc = bgUnits === MGDL_UNITS ? MGDLIcon : MMOLIcon;
  const svgIcon = atob(iconSrc.replace(/data:image\/svg\+xml;base64,/, ''));

  return (
    <g>
      <VictoryLabel
        {...props}
        renderInPortal={false}
        style={labelStyle}
        text={text}
        textAnchor="end"
        verticalAnchor="middle"
        width={width}
        dx={-20}
        x={scale.y(domain.x[1])}
        y={y}
      />
      <g
        transform={`translate(${scale.y(domain.x[1]) - 20}, -${barWidth / 2})`}
        dangerouslySetInnerHTML={{ __html: svgIcon }} // eslint-disable-line react/no-danger
      />
    </g>
  );
};

BgBarLabel.propTypes = {
  domain: PropTypes.object.isRequired,
  scale: PropTypes.object,
  text: PropTypes.func,
  y: PropTypes.number,
};

BgBarLabel.displayName = 'BgBarLabel';

export const BgBar = props => {
  const {
    barWidth,
    bgPrefs: { bgBounds } = {},
    chartLabelWidth,
    datum,
    domain,
    index,
    scale,
    width,
  } = props;

  const widthCorrection = (width - chartLabelWidth) / width;
  const widths = {
    low: scale.y(bgBounds.targetLowerBound) * widthCorrection,
    target: scale.y(bgBounds.targetUpperBound - bgBounds.targetLowerBound) * widthCorrection,
    high: scale.y(domain.x[1] - bgBounds.targetUpperBound) * widthCorrection,
  };

  const yPos = scale.x(index + 1) - (barWidth / 2);

  return (
    <g>
      <Rect
        {...props}
        x={0}
        y={yPos}
        width={widths.low}
        height={barWidth}
        style={{
          stroke: 'transparent',
          fill: colors.low,
        }}
      />
      <Rect
        {...props}
        x={widths.low}
        y={yPos}
        width={widths.target}
        height={barWidth}
        style={{
          stroke: 'transparent',
          fill: colors.target,
        }}
      />
      <Rect
        {...props}
        x={(widths.low + widths.target)}
        y={yPos}
        width={widths.high}
        height={barWidth}
        style={{
          stroke: 'transparent',
          fill: colors.high,
        }}
      />
      <Point
        x={scale.y(datum.y) * widthCorrection}
        y={yPos + (barWidth / 2)}
        style={{
          fill: colors.target,
          stroke: colors.white,
          strokeWidth: 2,
        }}
        size={barWidth * 2}
      />
    </g>
  );
};

BgBar.propTypes = {
  bgPrefs: PropTypes.object,
};

BgBar.displayName = 'BgBar';

export default BgBar;
