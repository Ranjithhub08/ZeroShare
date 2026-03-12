import React from 'react';

const StatCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '0.5rem' }}>{title}</h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)' }}>{value}</div>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
          <Icon size={24} color="var(--primary-color)" />
        </div>
      </div>
      {trend && (
        <div style={{ fontSize: '0.875rem', color: trend > 0 ? 'var(--accent-color)' : 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: '600' }}>{trend > 0 ? '+' : ''}{trend}%</span> from last month
        </div>
      )}
    </div>
  );
};

export default StatCard;
