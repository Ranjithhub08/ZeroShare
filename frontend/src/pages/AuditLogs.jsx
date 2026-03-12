import React, { useState, useEffect } from 'react';
import DataTable from '../components/ui/DataTable';
import SearchBar from '../components/ui/SearchBar';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { Download, ArrowUpDown } from 'lucide-react';

const AuditLogs = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortAsc, setSortAsc] = useState(false);

  const eventTypes = ['All', ...new Set(data.map(log => log.event_type))];

  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/audit/logs');
      const json = await res.json();
      const logs = json.data || json;
      setData(logs);
      setFilteredData(logs);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = data.filter(log => {
      const matchesSearch = 
        log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.app_name && log.app_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.data_accessed && log.data_accessed.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterType === 'All' || log.event_type === filterType;
      
      return matchesSearch && matchesFilter;
    });

    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

    setFilteredData(filtered);
  }, [searchQuery, filterType, data, sortAsc]);

  const columns = [
    { header: 'Event Type', accessor: 'event_type', render: (row) => <span className="text-medium">{row.event_type}</span> },
    { header: 'Application Name', accessor: 'app_name', render: (row) => <span className="text-secondary">{row.app_name || 'System'}</span> },
    { header: 'Data Accessed', accessor: 'data_accessed', render: (row) => <span className="text-secondary">{row.data_accessed || '-'}</span> },
    { header: 'Timestamp', accessor: 'timestamp', render: (row) => <span className="text-tertiary text-xs">{new Date(row.timestamp).toLocaleString()}</span> },
    { header: 'Status', accessor: 'status', render: (row) => {
      const status = row.status.toUpperCase();
      return <StatusBadge status={status} />;
    }},
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-header-title">Audit Logs</h2>
          <p className="dashboard-header-desc">
            Immutable record of all actions across your ZeroShare account.
          </p>
        </div>
        <div className="flex-row-gap-2">
          <Button 
            variant="secondary" 
            className="flex-center-gap-2"
            onClick={() => setSortAsc(!sortAsc)}
          >
            <ArrowUpDown size={16} /> {sortAsc ? 'Oldest First' : 'Newest First'}
          </Button>
          <Button variant="secondary" className="flex-center-gap-2">
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <SearchBar 
            placeholder="Search logs by event or resource..." 
            className="search-bar-md" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-secondary">Loading audit logs...</p>
        ) : (
          <DataTable columns={columns} data={filteredData} />
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
