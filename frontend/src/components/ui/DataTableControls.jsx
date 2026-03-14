import React, { useState, useRef, useEffect } from 'react';
import { Settings, Download, Check } from 'lucide-react';
import Button from './Button';

const DataTableControls = ({ columns, visibleColumns, onVisibleColumnsChange, onExportCSV, data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (accessor) => {
    if (visibleColumns.includes(accessor)) {
      if (visibleColumns.length > 1) {
        onVisibleColumnsChange(visibleColumns.filter(c => c !== accessor));
      }
    } else {
      onVisibleColumnsChange([...visibleColumns, accessor]);
    }
  };

  const handleExport = () => {
    if (onExportCSV) {
      onExportCSV();
    } else {
      // Default simple CSV export logic
      const headers = columns.filter(c => c.accessor && c.header).map(c => c.header).join(',');
      const rows = data.map(row => 
        columns.filter(c => c.accessor && c.header).map(c => {
          const val = row[c.accessor];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      ).join('\n');
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "table_data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="table-controls-group">
      <div className="relative" ref={dropdownRef}>
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex-center-gap-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Settings size={16} /> Columns
        </Button>
        
        {isOpen && (
          <div className="column-toggle-dropdown">
            <h4 className="column-toggle-title">Display Columns</h4>
            <div className="column-toggle-list">
              {columns.filter(c => c.accessor).map(col => (
                <label key={col.accessor} className="column-toggle-item">
                  <input 
                    type="checkbox" 
                    checked={visibleColumns.includes(col.accessor)}
                    onChange={() => toggleColumn(col.accessor)}
                    className="hidden"
                  />
                  <div className={`checkbox-custom ${visibleColumns.includes(col.accessor) ? 'checked' : ''}`}>
                    {visibleColumns.includes(col.accessor) && <Check size={12} />}
                  </div>
                  <span>{col.header}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button 
        variant="secondary" 
        size="sm" 
        className="flex-center-gap-2"
        onClick={handleExport}
      >
        <Download size={16} /> Export CSV
      </Button>
    </div>
  );
};

export default DataTableControls;
