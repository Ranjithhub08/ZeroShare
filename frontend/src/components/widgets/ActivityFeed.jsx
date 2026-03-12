import React from 'react';
import { Shield, FileCheck, Eye } from 'lucide-react';

const ActivityFeed = () => {
  const activities = [
    { id: 1, action: 'Consent Granted', app: 'HealthApp Plus', time: '2 hours ago', icon: FileCheck, color: 'var(--accent-color)' },
    { id: 2, action: 'Data Accessed', app: 'FinanceTracker', time: '5 hours ago', icon: Eye, color: 'var(--primary-color)' },
    { id: 3, action: 'New Data Added', app: 'Personal Vault', time: 'Yesterday', icon: Shield, color: 'var(--text-main)' },
  ];

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Recent Activity</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {activities.map((item, index) => (
          <div key={item.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
            {index !== activities.length - 1 && (
              <div style={{ position: 'absolute', left: '15px', top: '32px', bottom: '-24px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
            )}
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              backgroundColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: `1px solid ${item.color}`
            }}>
              <item.icon size={14} color={item.color} />
            </div>
            <div>
              <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                {item.action} <span style={{ color: 'var(--text-muted)' }}>by</span> {item.app}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{item.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
