import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlobalSearchBar from '@/components/ui/GlobalSearchBar';
import NotificationBell from '@/components/ui/NotificationBell';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';

const TopNavbar = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Overview';
      case '/vault': return 'Data Vault';
      case '/consents': return 'Consent Hub';
      case '/audit': return 'Audit Trail';
      case '/settings': return 'System Settings';
      default: return 'ZeroShare Elite';
    }
  };

  return (
    <motion.header 
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 flex h-20 w-full items-center justify-between px-8 bg-zinc-950/60 backdrop-blur-2xl border-b border-white/10"
    >
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-center px-12 max-w-3xl">
         <GlobalSearchBar />
      </div>

      <div className="flex items-center gap-5">
        <NotificationBell />
        <div className="h-4 w-[1px] bg-white/10" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">RK</AvatarFallback>
              </Avatar>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 mt-3 bg-zinc-950/90 backdrop-blur-xl border-white/10">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Ranjith Kumar</p>
                <p className="text-xs leading-none text-muted-foreground">admin@zeroshare.io</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer gap-3 p-3">
              <User className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-200">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-3 p-3">
              <SettingsIcon className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-200">Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer gap-3 p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:text-red-300 focus:bg-red-500/10">
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
};

export default TopNavbar;
