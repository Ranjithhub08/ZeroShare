import { motion } from 'framer-motion';
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Shield, FileCheck, Activity, Users,
  LogOut, BrainCircuit, Bell, BarChart3, Lock, Clock, ScrollText, AppWindow, Database,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';

const AdminSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const links = [
    { name: 'Admin Overview',   path: '/admin/dashboard',    icon: LayoutDashboard },
    { name: 'Pending Queue',    path: '/admin/pending',      icon: Clock },
    { name: 'All Consents',     path: '/admin/consents',     icon: FileCheck },
    { name: 'Threat Dashboard', path: '/admin/threats',      icon: Bell },
    { name: 'Live Activity',    path: '/admin/activity',     icon: Activity },
    { name: 'User Management',  path: '/admin/users',        icon: Users },
    { name: 'App Registry',     path: '/admin/apps',         icon: AppWindow },
    { name: 'Data Vault',       path: '/admin/data-vault',   icon: Database },
    { name: 'Action Log',       path: '/admin/action-log',   icon: ScrollText },
    { name: 'ML Analytics',     path: '/admin/ml',           icon: BrainCircuit },
    { name: 'Reports & GDPR',   path: '/admin/reports',      icon: BarChart3 },
  ];

  const bottomLinks = [
    { name: 'System Settings',  path: '/admin/settings',   icon: BarChart3 },
  ];

  const renderLinks = (items) => (
    <div className="flex flex-col gap-1.5 px-4">
      {items.map((link) => (
        <NavLink key={link.name} to={link.path}
          className={({ isActive }) => cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
            isActive ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div layoutId="admin-sidebar-pill"
                  className="absolute inset-0 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex h-5 w-5 items-center justify-center">
                <link.icon size={18} strokeWidth={isActive ? 2.5 : 2}
                  className={cn("transition-all duration-300",
                    isActive ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "group-hover:text-zinc-300"
                  )}
                />
              </div>
              <span className={cn("relative z-10 flex-1 tracking-wide", isActive ? "font-semibold" : "")}>
                {link.name}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-[260px] bg-zinc-950/40 backdrop-blur-2xl border-r border-rose-500/10 flex flex-col pt-6 pb-6 shadow-2xl">
      {/* Brand */}
      <div className="flex items-center gap-3 px-8 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]">
          <Lock size={18} fill="currentColor" className="opacity-90" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tighter text-zinc-100 leading-none">ZeroShare</span>
          <span className="text-[10px] font-medium tracking-widest text-rose-400 uppercase mt-0.5">Admin Portal</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="mb-4 px-8 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Administration</div>
        {renderLinks(links)}
      </div>

      <div className="mt-auto pt-6">
        <div className="mb-4 px-8 text-xs font-semibold tracking-wider text-zinc-500 uppercase">System</div>
        {renderLinks(bottomLinks)}
        <div className="px-4 mt-2">
          <button onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-red-400 transition-all">
            <LogOut size={18} className="transition-all group-hover:text-red-400" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
