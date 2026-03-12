import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, FileCheck, Activity, Settings } from 'lucide-react';

const Sidebar = () => {
  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Data Vault', path: '/vault', icon: Shield },
    { name: 'Consent Requests', path: '/consents', icon: FileCheck },
    { name: 'Audit Logs', path: '/audit', icon: Activity },
  ];

  const bottomLinks = [
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const renderNavLinks = (linkItems) => (
    linkItems.map((link) => (
      <NavLink
        key={link.name}
        to={link.path}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <link.icon className="nav-link-icon" size={18} />
        {link.name}
      </NavLink>
    ))
  );

  return (
    <aside className="sidebar-container">
      <div className="sidebar-header">
        <div className="sidebar-logo-group">
          <div className="sidebar-logo">
            <Shield size={16} color="var(--color-brand-contrast)" />
          </div>
          <span className="sidebar-brand-text">
            ZeroShare
          </span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {renderNavLinks(links)}
      </nav>

      <div className="sidebar-nav-bottom">
        <nav className="sidebar-nav-bottom-list">
           {renderNavLinks(bottomLinks)}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
