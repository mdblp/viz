import React from 'react';
import i18next from 'i18next';
import _ from 'lodash';

import Table from './common/Table';

import styles from './Diabeloop.css';

const t = i18next.t.bind(i18next);

export default class HistoryTable extends Table {
  static get title() {
    return {
      label: {
        main: `${t('Parameters History')}`,
      },
      className: styles.bdlgSettingsHeader,
    };
  }

  static get columns() {
    return [
      {
        key: 'level',
        label: t('Level'),
      },
      {
        key: 'parameterChange',
        label: t('Parameter'),

      },
      {
        key: 'valueChange',
        label: t('Value'),

      },
      {
        key: 'parameterDate',
        label: t('Date'),
      },
    ];
  }

  renderSpannedRow(normalizedColumns, rowKey, rowData) {
    const { switchToDailyIconClass, onSwitchToDaily } = this.props;
    let content = rowData.spannedContent;
    if (!content) {
      content = '&nbsp;';
    }
    return (
      <tr key={rowKey} className={styles.spannedRow}>
        <td colSpan={normalizedColumns.length}>
          {content}
          <i className={`${switchToDailyIconClass} ${styles.clickableIcon}`} onClick={onSwitchToDaily.bind(this, rowData.isoDate, 'Diabeloop parameters history')} />
        </td>
      </tr>);
  }

  renderRows(normalizedColumns) {
    const rows = this.getAllRows(this.props.rows);
    const rowData = _.map(rows, (row, key) => {
      if (row.isSpanned) {
        return this.renderSpannedRow(normalizedColumns, key, row);
      } else {
        return this.renderRow(normalizedColumns, key, row);
      }
    });
    return (<tbody key={`tbody_${rowData.length}`}>{rowData}</tbody>);
  }

  getParameterChange(parameter) {
    const { unknownParameterIcon, addedParameterIcon,
      deletedParameterIcon, updatedParameterIcon } = this.props;
    let icon = unknownParameterIcon;
    switch (parameter.changeType) {
      case 'added':
        icon = addedParameterIcon;
        break;
      case 'deleted':
        icon = deletedParameterIcon;
        break;
      case 'updated':
        icon = updatedParameterIcon;
        break;
      default:
        break;
    }
    return (
      <span>
        {icon}
        <span className={styles.parameterHistory}>{t(parameter.name)}</span>
      </span>
    );
  }

  getValueChange(parameter) {
    const { changeValueArrowIcon } = this.props;
    const value = <span>{`${parameter.value} ${parameter.unit}`}</span>;
    let previousValue;
    let spanClass = styles.historyValue;
    switch (parameter.changeType) {
      case 'added':
        spanClass = `${spanClass} ${styles.valueAdded}`;
        break;
      case 'deleted':
        spanClass = `${spanClass} ${styles.valueDeleted}`;
        break;
      case 'updated':
        spanClass = `${spanClass} ${styles.valueUpdated}`;
        previousValue = <span>{`${parameter.previousValue} ${parameter.previousUnit}`}</span>;
        break;
      default:
        break;
    }
    return (
      <span className={spanClass}>
        {parameter.changeType === 'updated' ? ([previousValue, changeValueArrowIcon, value]) : value}
      </span>
    );
  }

  getAllRows(history) {
    const rows = [];

    if (_.isArray(history)) {
      const currentParameters = new Map();

      const nHistory = history.length;
      for (let i = 0; i < nHistory; i++) {
        const parameters = history[i].parameters;

        if (_.isArray(parameters)) {
          const nParameters = parameters.length;
          let latestDate = new Date(0);

          // Compare b->a since there is a reverse order at the end
          parameters.sort((a, b) =>
            b.level.toString().localeCompare(a.level.toString())
            || b.name.localeCompare(a.name)
          );

          for (let j = 0; j < nParameters; j++) {
            const parameter = parameters[j];
            const row = { ...parameter };
            const changeDate = new Date(parameter.effectiveDate);

            if (latestDate.getTime() < changeDate.getTime()) {
              latestDate = changeDate;
            }
            row.parameterDate = changeDate.toLocaleString();

            switch (row.changeType) {
              case 'added':
                if (currentParameters.has(parameter.name)) {
                  // eslint-disable-next-line max-len
                  console.warn(`History: Parameter ${parameter.name} was added, but present in current parameters`);
                }
                currentParameters.set(parameter.name, {
                  value: parameter.value,
                  unit: parameter.unit,
                });
                break;
              case 'deleted':
                if (currentParameters.has(parameter.name)) {
                  currentParameters.delete(parameter.name);
                } else {
                  // eslint-disable-next-line max-len
                  console.warn(`History: Parameter ${parameter.name} was removed, but not present in current parameters`);
                }
                break;
              case 'updated':
                if (currentParameters.has(parameter.name)) {
                  const currParam = currentParameters.get(parameter.name);
                  row.previousUnit = currParam.unit;
                  row.previousValue = currParam.value;
                } else {
                  // eslint-disable-next-line max-len
                  console.warn(`History: Parameter ${parameter.name} was updated, but not present in current parameters`);
                  row.changeType = 'added';
                }

                currentParameters.set(parameter.name, {
                  value: parameter.value,
                  unit: parameter.unit,
                });
                break;
              default:
                console.warn(`Unknown change type ${row.changeType}:`, row);
                break;
            }

            row.parameterChange = this.getParameterChange(row);
            row.valueChange = this.getValueChange(row);

            rows.push(row);
          }

          rows.push({
            isSpanned: true,
            spannedContent: latestDate.toLocaleString(),
            isoDate: latestDate.toISOString(),
          });
        }
      }
    }

    return rows.reverse();
  }
}