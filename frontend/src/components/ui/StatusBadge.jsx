import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
  const getVariant = () => {
    switch (status.toUpperCase()) {
      case 'GRANTED':
      case 'ACTIVE':
        return 'badge-success';
      case 'REVOKED':
      case 'DENIED':
        return 'badge-danger';
      case 'PENDING':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <span className={`badge ${getVariant()} ${className}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
};

export default StatusBadge;
