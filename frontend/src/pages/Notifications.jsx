import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/services/api';

const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const Notifications = () => {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifs(res.data.data || res.data.notifications || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifs(n => n.map(x => x.id === id ? { ...x, status: 'read' } : x));
    } catch (e) { console.error(e); }
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifs(n => n.map(x => ({ ...x, status: 'read' })));
    } catch (e) { console.error(e); }
  };

  const unread = notifs.filter(n => n.status !== 'read').length;

  const filtered = filter === 'ALL' ? notifs
    : filter === 'UNREAD' ? notifs.filter(n => n.status !== 'read')
    : notifs.filter(n => n.status === 'read');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="text-primary" size={28} /> Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            {unread > 0 ? <span className="text-primary font-medium">{unread} unread</span> : 'All caught up!'} · {notifs.length} total
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={markAll} className="gap-1.5">
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {['ALL','UNREAD','READ'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              filter === f ? 'bg-primary/20 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            )}>{f}</button>
        ))}
      </div>

      <Card className="border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={36} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(n => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer",
                  n.status !== 'read' && "bg-primary/5"
                )}
                onClick={() => n.status !== 'read' && markRead(n.id)}
              >
                <div className="mt-0.5 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                  {n.event_type?.includes('🔴') || n.title?.includes('🔴') ? '🔴'
                    : n.event_type?.includes('📋') || n.title?.includes('📋') ? '📋'
                    : n.event_type?.includes('🚨') || n.title?.includes('🚨') ? '🚨'
                    : n.event_type?.includes('🔄') || n.title?.includes('🔄') ? '🔄'
                    : n.event_type?.includes('📢') || n.title?.includes('📢') ? '📢'
                    : '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-semibold", n.status !== 'read' && "text-foreground")}>
                      {n.title || n.event_type || 'Notification'}
                    </p>
                    {n.status !== 'read' && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default Notifications;
