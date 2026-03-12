import React, { useState, useEffect } from 'react';
import DataTable from '../components/ui/DataTable';
import SearchBar from '../components/ui/SearchBar';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { Download } from 'lucide-react';

const AuditLogs = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/audit/list');
      const json = await res.json();
      setData(json);
      setFilteredData(json);
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
    const filtered = data.filter(log => 
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.app_name && log.app_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.data_accessed && log.data_accessed.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

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
        <Button variant="secondary" className="flex-center-gap-2">
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <SearchBar 
            placeholder="Search logs by event or resource..." 
            className="search-bar-md" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
