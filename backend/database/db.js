const mockData = {
  consents: [
    { id: '1', app_name: 'HealthFit', purpose: 'Daily step count and heart rate sync', data_type: 'Health Data', risk_level: 'LOW', status: 'GRANTED', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', app_name: 'SecurePay', purpose: 'Financial transaction verification', data_type: 'Financial Data', risk_level: 'HIGH', status: 'PENDING', created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', app_name: 'IdentityGuard', purpose: 'Single sign-on for government services', data_type: 'Identity Data', risk_level: 'MEDIUM', status: 'GRANTED', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: '4', app_name: 'SocialPlus', purpose: 'Profile enrichment and friend matching', data_type: 'Social Data', risk_level: 'MEDIUM', status: 'REVOKED', created_at: new Date(Date.now() - 172800000).toISOString() },
  ],
  audit_logs: [
    { id: '101', event_type: 'CONSENT_GRANTED', app_name: 'HealthFit', data_accessed: 'Health Data', description: 'User granted access to health data', status: 'COMPLETED', timestamp: new Date(Date.now() - 500000).toISOString() },
    { id: '102', event_type: 'Data Accessed', app_name: 'IdentityGuard', data_accessed: 'Identity Data', description: 'App accessed user identity data', status: 'COMPLETED', timestamp: new Date(Date.now() - 1200000).toISOString() },
    { id: '103', event_type: 'CONSENT_DENIED', app_name: 'SocialPlus', data_accessed: 'Social Data', description: 'User denied access to social data', status: 'FAILED', timestamp: new Date(Date.now() - 2400000).toISOString() },
  ],
  user_data: [
    { id: '201', data_type: 'Resume', value: '...', created_at: new Date(Date.now() - 432000000).toISOString() },
    { id: '202', data_type: 'Email', value: '...', created_at: new Date(Date.now() - 345600000).toISOString() },
    { id: '203', data_type: 'ID', value: '...', created_at: new Date(Date.now() - 259200000).toISOString() },
    { id: '204', data_type: 'Resume', value: '...', created_at: new Date(Date.now() - 172800000).toISOString() },
  ],
  notifications: [
    { id: '301', event_type: 'CONSENT_REQUEST', message: 'New consent request from HealthFit', status: 'unread', timestamp: new Date(Date.now() - 600000).toISOString() },
    { id: '302', event_type: 'CONSENT_GRANTED', message: 'Consent request approved for SecurePay', status: 'unread', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '303', event_type: 'DATA_ACCESS', message: 'IdentityGuard accessed your ID data', status: 'read', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: '304', event_type: 'CONSENT_REVOKED', message: 'You revoked consent for SocialPlus', status: 'read', timestamp: new Date(Date.now() - 172800000).toISOString() },
  ],
  users: [
    {
      id: 'user_1',
      full_name: 'Ranjith Kumar',
      email: 'ranjith@example.com',
      avatar_url: 'https://ui-avatars.com/api/?name=Ranjith+Kumar&background=3b82f6&color=fff',
      notification_preferences: {
        consent_requests: true,
        data_access: true,
        system_alerts: false
      },
      created_at: new Date(Date.now() - 31536000000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

module.exports = {
  query: async (text, params) => {
    console.log(`Mock DB Query: ${text}`);
    
    // Handle COUNT(*) queries
    if (text.startsWith('SELECT COUNT(*) FROM')) {
      const table = text.split(' ')[3].split(' ')[0]; // Basic parsing for 'FROM table'
      const statusMatch = text.match(/status = '([^']+)'/);
      const eventMatch = text.match(/event_type = '([^']+)'/);
      
      let data = mockData[table] || [];
      if (statusMatch) data = data.filter(item => item.status === statusMatch[1]);
      if (eventMatch) data = data.filter(item => item.event_type === eventMatch[1]);
      
      return { rows: [{ count: data.length.toString() }] };
    }

    // Handle TO_CHAR date grouping (Consent Activity)
    if (text.includes('TO_CHAR(created_at')) {
      const groups = {};
      mockData.consents.forEach(c => {
        const date = c.created_at.split('T')[0];
        groups[date] = (groups[date] || 0) + 1;
      });
      return { rows: Object.entries(groups).map(([date, count]) => ({ date, count })) };
    }

    // Handle Data Type Distribution
    if (text.includes('GROUP BY data_type')) {
      const groups = {};
      mockData.user_data.forEach(d => {
        groups[d.data_type] = (groups[d.data_type] || 0) + 1;
      });
      const total = mockData.user_data.length;
      return { rows: Object.entries(groups).map(([data_type, count]) => ({
        data_type,
        count,
        percentage: ((count / total) * 100).toFixed(2)
      })) };
    }

    let data = [];
    if (text.includes('FROM user_data')) data = [...mockData.user_data];
    else if (text.includes('FROM consents')) data = [...mockData.consents];
    else if (text.includes('FROM audit_logs')) data = [...mockData.audit_logs];
    else if (text.includes('FROM notifications')) data = [...mockData.notifications];
    else if (text.includes('FROM users')) data = [...mockData.users];

    // Handle Search (ILIKE) with Projections
    if (text.includes('ILIKE')) {
      const q = params[0].replace(/%/g, '').toLowerCase();
      data = data.filter(item => {
        return Object.values(item).some(val => 
          val && val.toString().toLowerCase().includes(q)
        );
      });

      // Simple mock projection/alias handling for search
      data = data.map(item => {
        const mapped = { ...item };
        if (text.includes('user_data')) {
          mapped.title = item.data_type;
          mapped.timestamp = item.created_at;
          mapped.type = 'vault';
        } else if (text.includes('consents')) {
          mapped.title = item.app_name;
          mapped.timestamp = item.created_at;
          mapped.type = 'consent';
        } else if (text.includes('audit_logs')) {
          mapped.title = item.event_type;
          mapped.timestamp = item.timestamp;
          mapped.type = 'audit';
        }
        return mapped;
      });
    }

    // Handle Filtering (Basic for this mock)
    if (text.includes("status = '")) {
      const match = text.match(/status = '([^']+)'/);
      if (match) data = data.filter(item => item.status === match[1]);
    }

    // Handle Sorting
    if (text.includes('ORDER BY')) {
      const parts = text.split('ORDER BY')[1].trim().split(' ');
      const orderPart = parts[0].replace(',', '');
      const direction = text.toUpperCase().includes('DESC') ? 'DESC' : 'ASC';
      
      data.sort((a, b) => {
        const valA = a[orderPart] || '';
        const valB = b[orderPart] || '';
        if (typeof valA === 'string') {
          return direction === 'DESC' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return direction === 'DESC' ? valB - valA : valA - valB;
      });
    }

    // Handle Pagination
    if (text.includes('LIMIT')) {
      const limitMatch = text.match(/LIMIT (\d+)/i);
      const offsetMatch = text.match(/OFFSET (\d+)/i);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 10;
      const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
      data = data.slice(offset, offset + limit);
    }

    if (text.includes('UPDATE consents')) {
      const [status, id] = params;
      const index = mockData.consents.findIndex(c => c.id === id);
      if (index !== -1) {
        mockData.consents[index].status = status;
        mockData.consents[index].updated_at = new Date().toISOString();
        return { rows: [mockData.consents[index]] };
      }
    }

    if (text.includes('UPDATE users')) {
      const id = 'user_1';
      const userIndex = mockData.users.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        // Simple update for mock (handles object merges)
        if (params[0] && typeof params[0] === 'object') {
          mockData.users[userIndex] = { ...mockData.users[userIndex], ...params[0], updated_at: new Date().toISOString() };
        } else if (text.includes('notification_preferences')) {
          mockData.users[userIndex].notification_preferences = params[0];
          mockData.users[userIndex].updated_at = new Date().toISOString();
        }
        return { rows: [mockData.users[userIndex]] };
      }
    }

    return { rows: data };
  },
};
