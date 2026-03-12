import React from 'react';
import { Bell } from 'lucide-react';

const NotificationIcon = ({ count = 0 }) => {
  return (
    <button className="notification-btn">
      <Bell size={18} />
      {count > 0 && (
        <span className="notification-badge" />
      )}
    </button>
  );
};

export default NotificationIcon;
