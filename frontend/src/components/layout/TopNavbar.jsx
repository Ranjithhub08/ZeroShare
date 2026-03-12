import React from 'react';
import { useLocation } from 'react-router-dom';
import SearchBar from '../ui/SearchBar';
import NotificationIcon from '../ui/NotificationIcon';
import DropdownMenu from '../ui/DropdownMenu';
import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';

const TopNavbar = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/vault': return 'Personal Data Vault';
      case '/consents': return 'Consent Requests';
      case '/audit': return 'Audit Logs';
      case '/settings': return 'Settings';
      default: return 'ZeroShare';
    }
  };

  const userMenuItems = [
    { label: 'Profile Settings', icon: User, onClick: () => console.log('Profile') },
    { label: 'Preferences', icon: SettingsIcon, onClick: () => console.log('Prefs') },
    { type: 'divider' },
    { label: 'Log out', icon: LogOut, danger: true, onClick: () => console.log('Logout') }
  ];

  return (
    <header className="topnavbar">
      <div className="topnavbar-left">
        <h1 className="topnavbar-title">
          {getPageTitle()}
        </h1>
        <div className="topnavbar-search-wrapper">
          <SearchBar placeholder="Search items, requests, or logs..." />
        </div>
      </div>

      <div className="topnavbar-right">
        <NotificationIcon count={3} />
        <div className="topnavbar-divider" />
        <DropdownMenu 
          items={userMenuItems}
          trigger={
            <div className="avatar-trigger">
              <div className="avatar-circle">
                RK
              </div>
            </div>
          }
        />
      </div>
    </header>
  );
};

export default TopNavbar;
