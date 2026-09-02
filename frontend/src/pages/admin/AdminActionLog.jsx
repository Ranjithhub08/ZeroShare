import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { ScrollText, RefreshCw, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const ACTION_COLORS = {
  GRANTED:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  DENIED:   'bg-rose-500/15 text-rose-400 border-rose-500/20',
  REVOKED:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  SUSPENDED:'bg-orange-500/15 text-orange-400 border-orange-500/20',
  DELETED:  'bg-red-500/15 text-red-400 border-red-500/20',
  BROADCAST:'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FORCE_REVOKE:'bg-rose-500/15 text-rose-400 border-rose-500/20',
  BULK_GRANTED:'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  BULK_DENIED:'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const AdminActionLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/action-log');
      setLogs(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const actions = ['ALL', 'GRANTED', 'DENIED', 'REVOKED', 'BULK', 'SUSPENDED', 'DELETED', 'BROADCAST'];
  const filtered = filter === 'ALL' ? logs
    : filter === 'BULK' ? logs.filter(l => l.action?.startsWith('BULK_'))
    : logs.filter(l => l.action === filter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ScrollText className="text-rose-400" size={28} /> Admin Action Log
          </h1>
          <p className="text-muted-foreground mt-1">Complete audit trail of all admin actions.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {actions.map(a => (
          <button key={a} onClick={() => setFilter(a)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === a ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {a}
          </button>
        ))}
      </div>

      <Card className="border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No actions logged yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Shield size={14} className="text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs border ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground border-border'}`}>
                      {log.action}
                    </Badge>
                    <span className="text-sm font-medium">{log.admin_name || log.admin_email || 'Admin'}</span>
                    {log.details && <span className="text-sm text-muted-foreground truncate">{log.details}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{timeAgo(log.created_at)}</span>
                    <span>·</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                    {log.target_type && <><span>·</span><span>Target: {log.target_type} #{log.target_id}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default AdminActionLog;
