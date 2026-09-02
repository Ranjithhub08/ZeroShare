import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { Users, FileCheck, AlertTriangle, ShieldCheck, Clock, TrendingUp, Activity, BrainCircuit, Server, Database, Zap, Wifi } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <Card className="p-5 flex items-center gap-4 border border-border bg-card">
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </Card>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentConsents, setRecentConsents] = useState([]);
  const [trends, setTrends] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [consentRes, trendRes, healthRes] = await Promise.all([
          api.get('/consents?limit=5&sortBy=created_at&sortDir=DESC'),
          api.get('/ml/risk-trends'),
          api.get('/admin/health'),
        ]);
        const consents = consentRes.data.consents || consentRes.data.data?.consents || [];
        const total = consentRes.data.total || consentRes.data.data?.total || 0;
        const granted = consents.filter(c => c.status === 'GRANTED').length;
        const pending = consents.filter(c => c.status === 'PENDING').length;
        const denied  = consents.filter(c => c.status === 'DENIED').length;
        setRecentConsents(consents);
        setStats({ total, pending, granted, denied });
        setTrends(trendRes.data.data || []);
        setHealth(healthRes.data);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const statusColor = (s) =>
    s === 'GRANTED' ? 'bg-emerald-500/15 text-emerald-400' :
    s === 'DENIED'  ? 'bg-rose-500/15 text-rose-400' :
    s === 'REVOKED' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-blue-500/15 text-blue-400';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, <span className="text-rose-400 font-semibold">{user?.name}</span> — you have full system access.</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Card key={i} className="h-24 animate-pulse bg-muted" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileCheck}    label="Total Consents"  value={stats?.total}   color="bg-blue-600"    />
          <StatCard icon={Clock}        label="Pending Review"  value={stats?.pending} color="bg-amber-600"   sub="Awaiting your decision" />
          <StatCard icon={ShieldCheck}  label="Approved"        value={stats?.granted} color="bg-emerald-600" />
          <StatCard icon={AlertTriangle}label="Denied"          value={stats?.denied}  color="bg-rose-600"    />
        </div>
      )}

      {/* System Health */}
      {health && (
        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-rose-400" />
            <h2 className="font-semibold">System Health</h2>
            <span className="ml-auto text-xs text-muted-foreground">Uptime: {Math.floor((health.uptime_seconds || 0) / 60)}m</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Database size={14} className={health.db?.status === 'online' ? 'text-emerald-400' : 'text-rose-400'} />
              <div>
                <p className="text-xs font-medium">Database</p>
                <p className={`text-xs ${health.db?.status === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {health.db?.status === 'online' ? `Online · ${health.db.response_ms}ms` : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <BrainCircuit size={14} className={health.ml?.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'} />
              <div>
                <p className="text-xs font-medium">ML Service</p>
                <p className={`text-xs ${health.ml?.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {health.ml?.status === 'ok' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Wifi size={14} className="text-blue-400" />
              <div>
                <p className="text-xs font-medium">Active Sessions</p>
                <p className="text-xs text-blue-400">{health.stats?.active_sessions || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Zap size={14} className="text-amber-400" />
              <div>
                <p className="text-xs font-medium">Pending Reviews</p>
                <p className="text-xs text-amber-400">{health.stats?.pending_consents || 0}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent consent requests */}
        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Activity size={16} className="text-rose-400" /> Recent Consent Requests</h2>
            <a href="/admin/consents" className="text-xs text-rose-400 hover:underline">View all →</a>
          </div>
          {recentConsents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consents yet.</p>
          ) : (
            <div className="space-y-2">
              {recentConsents.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.app_name}</p>
                    <p className="text-xs text-muted-foreground">{c.data_type} · {c.user_name || c.user_email}</p>
                  </div>
                  <Badge className={cn('text-xs', statusColor(c.status))}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Risk trends */}
        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit size={16} className="text-rose-400" />
            <h2 className="font-semibold">High-Risk App Trends</h2>
          </div>
          {trends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trend data yet — needs 2+ consents per app.</p>
          ) : (
            <div className="space-y-2">
              {trends.slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium">{t.app_name}</span>
                      <span className={t.denial_rate >= 50 ? 'text-rose-400' : 'text-amber-400'}>{t.denial_rate}% denied</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${t.denial_rate >= 50 ? 'bg-rose-500' : 'bg-amber-500'}`}
                        style={{ width: `${t.denial_rate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
