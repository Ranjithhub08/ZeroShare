import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import SearchBar from '../components/ui/SearchBar';
import StatusBadge from '../components/ui/StatusBadge';
import { Plus, Trash2, Eye } from 'lucide-react';

const DataVault = () => {
  const [data] = useState([
    { id: 'DAT-001', type: 'Personal Address', size: '12 KB', uploaded: 'Oct 24, 2023', status: 'Active' },
    { id: 'DAT-002', type: 'Medical Record (2023)', size: '2.4 MB', uploaded: 'Oct 21, 2023', status: 'Active' },
    { id: 'DAT-003', type: 'Financial Statement Q3', size: '540 KB', uploaded: 'Oct 15, 2023', status: 'Active' },
    { id: 'DAT-004', type: 'Emergency Contacts', size: '4 KB', uploaded: 'Sep 30, 2023', status: 'Archived' },
  ]);

  const columns = [
    { header: 'Data ID', accessor: 'id', render: (row) => <span className="text-mono text-secondary">{row.id}</span> },
    { header: 'Data Type', accessor: 'type', render: (row) => <span className="text-medium">{row.type}</span> },
    { header: 'Size', accessor: 'size', render: (row) => <span className="text-tertiary">{row.size}</span> },
    { header: 'Added On', accessor: 'uploaded', render: (row) => <span className="text-secondary">{row.uploaded}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status === 'Active' ? 'ACTIVE' : 'REVOKED'} /> },
    { header: '', accessor: 'actions', render: () => (
      <div className="flex-end-gap-2">
        <Button variant="ghost" size="sm" className="p-1"><Eye size={16} /></Button>
        <Button variant="ghost" size="sm" className="p-1 text-danger"><Trash2 size={16} /></Button>
      </div>
    )}
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-header-title">Data Vault</h2>
          <p className="dashboard-header-desc">
            Manage the underlying personal data points securely stored on ZeroShare.
          </p>
        </div>
        <Button variant="primary">
          <Plus size={16} className="mr-2" /> Add Data
        </Button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <SearchBar placeholder="Filter by type or ID..." className="search-bar-sm" />
          <Button variant="secondary" size="sm">Filter Options</Button>
        </div>

        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default DataVault;
