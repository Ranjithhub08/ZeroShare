import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import api from '@/services/api';
import * as wsService from '@/services/websocket';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unread ?? 0);
      }
    } catch { /* network error — fail silently */ }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Connect WebSocket for real-time push
    const token = localStorage.getItem('zs_token');
    if (token) wsService.connect(token);

    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === 'notification') {
        setNotifications(prev => [msg.data, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    // Fallback poll every 60s (WebSocket handles the rest)
    const interval = setInterval(fetchNotifications, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
      setUnreadCount(0);
    } catch { /* noop */ }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* noop */ }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-9 w-9 relative rounded-full ring-offset-background transition-all", isOpen && "bg-muted")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4.5 w-4.5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 z-50 overflow-hidden"
          >
            <NotificationDropdown
              notifications={notifications}
              onClose={() => setIsOpen(false)}
              onMarkAllRead={handleMarkAllRead}
              onMarkRead={handleMarkOneRead}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
