import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, ShieldAlert, User, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/services/api';

const RISK_COLORS = { high: 'text-rose-400', medium: 'text-amber-400', low: 'text-emerald-400' };

const AdminPending = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selected, setSelected] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/pending');
      setItems(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    setActionLoading(`${id}-${status}`);
    try {
      await api.patch(`/consents/${id}/status`, { status });
      await load();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const bulkAct = async (status) => {
    if (!selected.length) return;
    setActionLoading('bulk');
    try {
      await Promise.all(selected.map(id => api.patch(`/consents/${id}/status`, { status })));
      setSelected([]);
      await load();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === items.length ? [] : items.map(i => i.id));

  const hoursLabel = (h) => {
    const hrs = parseFloat(h);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${Math.floor(hrs)}h waiting`;
    return `${Math.floor(hrs / 24)}d waiting`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Clock className="text-amber-400" size={28} /> Pending Approval Queue
          </h1>
          <p className="text-muted-foreground mt-1">{items.length} request{items.length !== 1 ? 's' : ''} waiting for your review.</p>
        </div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" disabled={!!actionLoading} onClick={() => bulkAct('GRANTED')}>
                <CheckCircle2 size={14} /> Approve {selected.length}
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" disabled={!!actionLoading} onClick={() => bulkAct('DENIED')}>
                <XCircle size={14} /> Deny {selected.length}
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-lg">All clear!</p>
            <p className="text-muted-foreground text-sm mt-1">No pending consent requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" className="accent-rose-500" checked={selected.length === items.length && items.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">App / Site</th>
                  <th className="text-left px-4 py-3">Data Type</th>
                  <th className="text-left px-4 py-3">Purpose</th>
                  <th className="text-left px-4 py-3">Risk</th>
                  <th className="text-left px-4 py-3">Waiting</th>
                  <th className="text-left px-4 py-3">Renewal?</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", selected.includes(c.id) && "bg-amber-500/5")}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="accent-rose-500" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <User size={13} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-xs">{c.user_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{c.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-xs">{c.app_name || c.requester_url || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.data_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{c.purpose}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ShieldAlert size={13} className={RISK_COLORS[c.risk_level] || 'text-muted-foreground'} />
                        <span className={cn('text-xs font-medium capitalize', RISK_COLORS[c.risk_level])}>{c.risk_level || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-amber-400 font-medium">{hoursLabel(c.hours_waiting)}</td>
                    <td className="px-4 py-3">
                      {c.renewal_requested
                        ? <Badge className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/20">🔄 Renewal</Badge>
                        : <span className="text-xs text-muted-foreground">New</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          disabled={!!actionLoading} title="Approve"
                          onClick={() => act(c.id, 'GRANTED')}>
                          <CheckCircle2 size={14} />
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          disabled={!!actionLoading} title="Deny"
                          onClick={() => act(c.id, 'DENIED')}>
                          <XCircle size={14} />
                        </Button>
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

export default AdminPending;
