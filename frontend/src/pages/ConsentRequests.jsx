import React, { useState, useEffect } from 'react';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchBar from '../components/ui/SearchBar';

const ConsentRequests = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConsents = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/consents/list');
      const json = await res.json();
      const consents = json.data || json;
      setData(consents);
      setFilteredData(consents);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch consents', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  useEffect(() => {
    const filtered = data.filter(row =>
      row.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.data_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.purpose.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const handleAction = async (id, actionType) => {
    try {
      const endpoint = actionType === 'APPROVE' ? '/approve' : '/reject';
      await fetch(`http://localhost:5001/api/consents${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchConsents();
    } catch (err) {
      console.error(`Failed to ${actionType} consent`, err);
    }
  };

  const columns = [
    { header: 'Application Name', accessor: 'app_name', render: (row) => <span className="text-medium">{row.app_name}</span> },
    { header: 'Requested Data Type', accessor: 'data_type', render: (row) => <span className="text-secondary">{row.data_type}</span> },
    { header: 'Purpose', accessor: 'purpose', render: (row) => <span className="text-secondary">{row.purpose}</span> },
    { header: 'Access Duration', accessor: 'duration', render: (row) => <span className="text-secondary">{row.duration}</span> },
    { header: 'Risk Level', accessor: 'risk_level', render: (row) => {
      const colorMap = { low: 'success', medium: 'warning', high: 'danger' };
      const color = colorMap[row.risk_level] || 'neutral';
      return <StatusBadge status={row.risk_level.toUpperCase()} className={`badge-${color}`} />;
    }},
    { header: 'Request Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Actions', accessor: 'actions', render: (row) => (
      row.status === 'PENDING' ? (
        <div className="flex-row-gap-2">
          <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'APPROVE'); }}>Approve</Button>
          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'REJECT'); }}>Reject</Button>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRequest(row); setIsModalOpen(true); }}>View Details</Button>
        </div>
      ) : row.status === 'GRANTED' ? (
        <div className="flex-row-gap-2">
          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'REJECT'); }}>Revoke</Button>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRequest(row); setIsModalOpen(true); }}>View Details</Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRequest(row); setIsModalOpen(true); }}>View Details</Button>
      )
    )}
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-header-title">Consent Requests</h2>
          <p className="dashboard-header-desc">
            Review and govern applications requesting access to your vault data.
          </p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <SearchBar 
            placeholder="Search by app, data type, or purpose..." 
            className="search-bar-md" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? <p className="text-secondary">Loading...</p> : <DataTable columns={columns} data={filteredData} />}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Consent Details"
      >
        {selectedRequest && (
          <div className="flex-col-gap-5">
            <div>
              <p className="text-sm text-secondary">Application Name</p>
              <p className="text-medium">{selectedRequest.app_name}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Requested Data</p>
              <p className="text-medium">{selectedRequest.data_type}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Purpose</p>
              <p className="text-medium">{selectedRequest.purpose}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Duration</p>
              <p className="text-medium">{selectedRequest.duration}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Request Timestamp</p>
              <p className="text-medium">{new Date(selectedRequest.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ConsentRequests;
