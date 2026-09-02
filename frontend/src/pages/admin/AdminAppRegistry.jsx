import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { AppWindow, RefreshCw, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/services/api';

const AdminAppRegistry = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('total_requests');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/app-registry');
      setApps(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = apps
    .filter(a => !search || a.app_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => parseInt(b[sort]) - parseInt(a[sort]));

  const approvalRate = (a) => {
    const total = parseInt(a.approved) + parseInt(a.denied) + parseInt(a.revoked);
    return total === 0 ? 0 : Math.round((parseInt(a.approved) / total) * 100);
  };

  const riskColor = (app) => {
    const rate = parseInt(app.high_risk) / Math.max(1, parseInt(app.total_requests));
    if (rate > 0.5) return 'text-rose-400';
    if (rate > 0.2) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AppWindow className="text-rose-400" size={28} /> App Registry
          </h1>
          <p className="text-muted-foreground mt-1">Every app and website that's ever requested consent.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center border border-blue-500/20 bg-blue-500/5">
          <p className="text-3xl font-bold text-blue-400">{apps.length}</p>
          <p className="text-sm text-muted-foreground">Unique Apps</p>
        </Card>
        <Card className="p-4 text-center border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-3xl font-bold text-emerald-400">{apps.reduce((s, a) => s + parseInt(a.approved), 0)}</p>
          <p className="text-sm text-muted-foreground">Total Approved</p>
        </Card>
        <Card className="p-4 text-center border border-rose-500/20 bg-rose-500/5">
          <p className="text-3xl font-bold text-rose-400">{apps.reduce((s, a) => s + parseInt(a.high_risk), 0)}</p>
          <p className="text-sm text-muted-foreground">High-Risk Requests</p>
        </Card>
        <Card className="p-4 text-center border border-amber-500/20 bg-amber-500/5">
          <p className="text-3xl font-bold text-amber-400">{apps.reduce((s, a) => s + parseInt(a.pending), 0)}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Input placeholder="Search apps…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-[260px]" />
        <div className="flex gap-1.5 text-xs">
          {[['total_requests','Most Requests'],['high_risk','Most Risky'],['unique_users','Most Users']].map(([key, label]) => (
            <button key={key} onClick={() => setSort(key)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${sort === key ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card className="border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No apps found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3">App / Site</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Requests</th>
                  <th className="text-left px-4 py-3">Approval Rate</th>
                  <th className="text-left px-4 py-3">High Risk</th>
                  <th className="text-left px-4 py-3">Avg Score</th>
                  <th className="text-left px-4 py-3">Users</th>
                  <th className="text-left px-4 py-3">Last Request</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <AppWindow size={12} className="text-primary" />
                        </div>
                        <span className="font-medium text-xs max-w-[160px] truncate">{a.app_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs border", a.requester_type === 'website' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' : 'bg-purple-500/15 text-purple-400 border-purple-500/20')}>
                        {a.requester_type || 'app'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{a.total_requests}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${approvalRate(a)}%` }} />
                        </div>
                        <span className="text-xs text-emerald-400">{approvalRate(a)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium", riskColor(a))}>{a.high_risk}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.avg_risk_score || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users size={11} />
                        {a.unique_users}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.last_request ? new Date(a.last_request).toLocaleDateString() : '—'}
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

export default AdminAppRegistry;
