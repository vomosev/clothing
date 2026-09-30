'use client';

import EmptyState from './EmptyState';

export default function Table({
  columns = [],
  rows = [],
  getRowKey,
  emptyMessage = 'Nothing to show here yet.',
  caption,
  className = '',
}) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeColumns.length === 0) {
    return (
      <EmptyState
        title="Table unavailable"
        description="No columns were configured for this table, so there is nothing to display."
        tone="error"
      />
    );
  }

  if (safeRows.length === 0) {
    return <EmptyState title="Nothing here yet" description={emptyMessage} />;
  }

  const keyFor = (row, index) => {
    if (typeof getRowKey === 'function') {
      try {
        const key = getRowKey(row, index);
        if (key !== undefined && key !== null && key !== '') return String(key);
      } catch (err) {
        return `row-${index}`;
      }
    }
    if (row && typeof row === 'object') {
      if (row.id !== undefined && row.id !== null) return String(row.id);
      if (row.reference) return String(row.reference);
    }
    return `row-${index}`;
  };

  const cellValue = (column, row, rowIndex) => {
    try {
      if (typeof column.render === 'function') {
        return column.render(row, rowIndex);
      }
      const raw = row ? row[column.key] : undefined;
      if (raw === undefined || raw === null || raw === '') return '—';
      if (typeof raw === 'object') return String(raw);
      return raw;
    } catch (err) {
      return '—';
    }
  };

  return (
    <div className={`table-wrap${className ? ` ${className}` : ''}`} role="region" tabIndex={0}>
      <table className="table">
        {caption ? <caption className="table__caption">{caption}</caption> : null}
        <thead className="table__head">
          <tr>
            {safeColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`table__th table__cell--${column.align || 'start'}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {safeRows.map((row, rowIndex) => (
            <tr key={keyFor(row, rowIndex)} className="table__row">
              {safeColumns.map((column) => (
                <td
                  key={column.key}
                  className={`table__td table__cell--${column.align || 'start'}`}
                  data-label={typeof column.header === 'string' ? column.header : undefined}
                >
                  {cellValue(column, row, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}