import React from 'react';

const DataTable = ({ columns, data, onRowClick }) => {
  return (
    <div className="datatable-wrapper">
      <table className="datatable">
        <thead>
          <tr className="datatable-header-row">
            {columns.map((col, idx) => (
              <th key={idx} className="datatable-th">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="datatable-empty">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`datatable-row ${onRowClick ? 'clickable' : ''}`}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="datatable-td">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
