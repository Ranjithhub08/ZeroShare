import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { Activity, Monitor, Globe, Clock, RefreshCw, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const AdminActivity = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/activity');
      setSessions(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const parseUA = (ua = '') => {
    if (!ua) return 'Unknown device';
    if (ua.includes('Mobile')) return '📱 Mobile';
    if (ua.includes('Tablet')) return '📟 Tablet';
    return '💻 Desktop';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="text-rose-400" size={28} /> Live Activity Monitor
          </h1>
          <p className="text-muted-foreground mt-1">Sessions from the last 24 hours. Active = last seen within 30 min.</p>
        </div>
        <Button onClick={load} variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-3xl font-bold text-emerald-400">{sessions.filter(s => s.activity_status === 'active').length}</p>
          <p className="text-sm text-muted-foreground">Active (30 min)</p>
        </Card>
        <Card className="p-4 text-center border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-3xl font-bold text-yellow-400">{sessions.length}</p>
          <p className="text-sm text-muted-foreground">Sessions (24 hrs)</p>
        </Card>
        <Card className="p-4 text-center border border-blue-500/20 bg-blue-500/5">
          <p className="text-3xl font-bold text-blue-400">{new Set(sessions.map(s => s.user_id)).size}</p>
          <p className="text-sm text-muted-foreground">Unique Users</p>
        </Card>
        <Card className="p-4 text-center border border-purple-500/20 bg-purple-500/5">
          <p className="text-3xl font-bold text-purple-400">{new Set(sessions.map(s => s.ip_address)).size}</p>
          <p className="text-sm text-muted-foreground">Unique IPs</p>
        </Card>
      </div>

      <Card className="border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading active sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No sessions in the last 24 hours. Restart the backend if this seems wrong.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">IP Address</th>
                <th className="text-left px-4 py-3">Device</th>
                <th className="text-left px-4 py-3">Session Started</th>
                <th className="text-left px-4 py-3">Last Active</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <User size={13} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-400">{s.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-xs">{parseUA(s.user_agent)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(s.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-emerald-400 font-medium">{timeAgo(s.last_used_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${s.activity_status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-500'}`} />
                        <span className={`text-xs font-medium ${s.activity_status === 'active' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {s.activity_status === 'active' ? 'Active' : 'Idle'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default AdminActivity;
