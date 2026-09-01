import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Clock, Search, Filter, ShieldAlert, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import api from '@/services/api';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  PENDING:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  GRANTED:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  DENIED:   'bg-rose-500/15 text-rose-400 border-rose-500/20',
  REVOKED:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const RISK_COLORS = {
  high:   'text-rose-400',
  medium: 'text-amber-400',
  low:    'text-emerald-400',
};

const AdminConsents = () => {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/consents?limit=20&page=${page}&sortBy=created_at&sortDir=DESC`);
      setConsents(res.data.consents || res.data.data?.consents || []);
      setTotal(res.data.total || res.data.data?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchConsents(); }, [fetchConsents]);

  const updateStatus = async (id, status) => {
    setActionLoading(`${id}-${status}`);
    try {
      await api.patch(`/consents/${id}/status`, { status });
      await fetchConsents();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const filtered = consents.filter(c => {
    const matchFilter = filter === 'ALL' || c.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.app_name?.toLowerCase().includes(q) || c.data_type?.toLowerCase().includes(q) || c.user_name?.toLowerCase().includes(q) || c.user_email?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Consent Requests</h1>
        <p className="text-muted-foreground mt-1">Review and action every consent request across all users.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by app, data type, or user…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {['ALL','PENDING','GRANTED','DENIED','REVOKED'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                filter === s ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'border-border text-muted-foreground hover:text-foreground'
              )}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading consents…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No consents match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">App / Site</th>
                  <th className="text-left px-4 py-3 font-medium">Data Type</th>
                  <th className="text-left px-4 py-3 font-medium">Purpose</th>
                  <th className="text-left px-4 py-3 font-medium">Risk</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Duration</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
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
                    <td className="px-4 py-3 font-medium">{c.app_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.data_type}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">{c.purpose}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ShieldAlert size={13} className={RISK_COLORS[c.risk_level] || 'text-muted-foreground'} />
                        <span className={cn('text-xs font-medium capitalize', RISK_COLORS[c.risk_level])}>{c.risk_level || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs border', STATUS_COLORS[c.status])}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.duration || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === 'PENDING' && (
                          <>
                            <Button size="sm" variant="ghost"
                              className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              disabled={!!actionLoading}
                              onClick={() => updateStatus(c.id, 'GRANTED')}>
                              <CheckCircle2 size={14} />
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              disabled={!!actionLoading}
                              onClick={() => updateStatus(c.id, 'DENIED')}>
                              <XCircle size={14} />
                            </Button>
                          </>
                        )}
                        {c.status === 'GRANTED' && (
                          <Button size="sm" variant="ghost"
                            className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            disabled={!!actionLoading}
                            onClick={() => updateStatus(c.id, 'REVOKED')}>
                            <RotateCcw size={14} />
                          </Button>
                        )}
                        {['DENIED','REVOKED'].includes(c.status) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>{total} total consent{total !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded border border-border disabled:opacity-40">Prev</button>
            <span className="px-2 py-1">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={filtered.length < 20} className="px-2 py-1 rounded border border-border disabled:opacity-40">Next</button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AdminConsents;
