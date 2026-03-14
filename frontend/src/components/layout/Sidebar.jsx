import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, FileCheck, Activity, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const links = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Data Vault', path: '/vault', icon: Shield },
    { name: 'Consent Hub', path: '/consents', icon: FileCheck },
    { name: 'Audit Trail', path: '/audit', icon: Activity },
  ];

  const bottomLinks = [
    { name: 'System Settings', path: '/settings', icon: Settings },
  ];

  const renderNavLinks = (linkItems) => (
    <div className="flex flex-col gap-1.5 px-4">
      {linkItems.map((link) => (
        <NavLink
          key={link.name}
          to={link.path}
          className={({ isActive }) => cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
            isActive 
              ? "text-zinc-50" 
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {({ isActive }) => (
            <>
              {/* Animated glassmorphic active background */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              
              <div className="relative z-10 flex h-5 w-5 items-center justify-center">
                <link.icon 
                  size={18} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={cn(
                    "transition-all duration-300",
                    isActive ? "text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "group-hover:text-zinc-300"
                  )}
                />
              </div>
              
              <span className={cn(
                "relative z-10 flex-1 tracking-wide",
                isActive ? "text-shadow-sm font-semibold" : ""
              )}>
                {link.name}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-[260px] bg-zinc-950/40 backdrop-blur-2xl border-r border-white/5 flex flex-col pt-6 pb-6 shadow-2xl">
      <div className="flex items-center gap-3 px-8 mb-10 group cursor-pointer">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
          <Shield size={20} fill="currentColor" className="opacity-90" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tighter text-zinc-100 leading-none">ZeroShare</span>
          <span className="text-[10px] font-medium tracking-widest text-primary uppercase mt-0.5 opacity-80">Elite Network</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        <div className="mb-4 px-8 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Main Navigation</div>
        {renderNavLinks(links)}
      </div>

      <div className="mt-auto pt-6">
        <div className="mb-4 px-8 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Configuration</div>
        {renderNavLinks(bottomLinks)}
      </div>
    </aside>
  );
};

export default Sidebar;
