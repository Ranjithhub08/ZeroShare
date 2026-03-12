import React from 'react';

const DashboardCard = ({ children, title, action, className = '' }) => {
  return (
    <div className={`dashboard-card ${className}`}>
      {(title || action) && (
        <div className="dashboard-card-header">
          {title && <h3 className="dashboard-card-title">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="dashboard-card-content">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;
