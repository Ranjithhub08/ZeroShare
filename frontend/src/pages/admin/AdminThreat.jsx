import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, User, RotateCcw, Loader2, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { cn } from '@/lib/utils';

const AdminThreat = () => {
  const [threats, setThreats] = useState([]);
  const [suspicious, setSuspicious] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forceApp, setForceApp] = useState('');
  const [forceReason, setForceReason] = useState('');
  const [forceLoading, setForceLoading] = useState(false);
  const [forceResult, setForceResult] = useState(null);
  const [broadcast, setBroadcast] = useState({ title: '', message: '' });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [threatRes, suspRes] = await Promise.all([
          api.get('/admin/threats'),
          api.get('/admin/suspicious'),
        ]);
        setThreats(threatRes.data.threats || []);
        setSuspicious(suspRes.data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const forceRevoke = async () => {
    if (!forceApp.trim()) return;
    setForceLoading(true); setForceResult(null);
    try {
      const res = await api.post('/admin/force-revoke', { app_name: forceApp, reason: forceReason });
      setForceResult(res.data);
    } catch (e) { setForceResult({ error: 'Failed' }); }
    finally { setForceLoading(false); }
  };

  const sendBroadcast = async () => {
    if (!broadcast.title || !broadcast.message) return;
    setBroadcastLoading(true); setBroadcastResult(null);
    try {
      const res = await api.post('/admin/broadcast', { ...broadcast, send_email: true });
      setBroadcastResult(res.data);
    } catch (e) { setBroadcastResult({ error: 'Failed' }); }
    finally { setBroadcastLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-rose-400" size={28} /> Threat Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">High-risk consents, suspicious users, and emergency controls.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 border border-rose-500/20 bg-rose-500/5 text-center">
          <p className="text-3xl font-bold text-rose-400">{threats.length}</p>
          <p className="text-sm text-muted-foreground">High-Risk Consents</p>
        </Card>
        <Card className="p-4 border border-amber-500/20 bg-amber-500/5 text-center">
          <p className="text-3xl font-bold text-amber-400">{suspicious.length}</p>
          <p className="text-sm text-muted-foreground">Suspicious Users</p>
        </Card>
        <Card className="p-4 border border-blue-500/20 bg-blue-500/5 text-center">
          <p className="text-3xl font-bold text-blue-400">{threats.filter(t => t.status === 'GRANTED').length}</p>
          <p className="text-sm text-muted-foreground">Active High-Risk Grants</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Force Revoke All */}
        <Card className="p-5 border border-rose-500/20 bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><RotateCcw size={16} className="text-rose-400" /> Force Revoke All (by App)</h2>
          <p className="text-xs text-muted-foreground mb-3">Instantly revoke ALL consents for a specific app across ALL users. Use when an app is found malicious.</p>
          <div className="space-y-2">
            <Input placeholder="App name (e.g. BadApp Inc.)" value={forceApp} onChange={e => setForceApp(e.target.value)} />
            <Input placeholder="Reason (sent to all affected users)" value={forceReason} onChange={e => setForceReason(e.target.value)} />
            <Button onClick={forceRevoke} disabled={forceLoading || !forceApp.trim()} className="w-full bg-rose-600 hover:bg-rose-700 text-white gap-2">
              {forceLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Force Revoke All Access
            </Button>
          </div>
          {forceResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${forceResult.error ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {forceResult.error || `✅ Revoked ${forceResult.revoked} consent(s) — all users notified.`}
            </div>
          )}
        </Card>

        {/* Broadcast Alert */}
        <Card className="p-5 border border-amber-500/20 bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Zap size={16} className="text-amber-400" /> Broadcast Alert to All Users</h2>
          <p className="text-xs text-muted-foreground mb-3">Send a security alert notification + email to every user instantly.</p>
          <div className="space-y-2">
            <Input placeholder="Alert title (e.g. Data Breach Detected)" value={broadcast.title} onChange={e => setBroadcast(p => ({ ...p, title: e.target.value }))} />
            <textarea placeholder="Message body…" value={broadcast.message}
              onChange={e => setBroadcast(p => ({ ...p, message: e.target.value }))}
              className="w-full h-20 rounded-lg bg-muted border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <Button onClick={sendBroadcast} disabled={broadcastLoading || !broadcast.title || !broadcast.message} className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2">
              {broadcastLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Send Broadcast
            </Button>
          </div>
          {broadcastResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${broadcastResult.error ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {broadcastResult.error || `✅ ${broadcastResult.message}`}
            </div>
          )}
        </Card>
      </div>

      {/* Suspicious Users */}
      {suspicious.length > 0 && (
        <Card className="p-5 border border-amber-500/20 bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><AlertTriangle size={16} className="text-amber-400" /> Suspicious Users (2+ High-Risk Consents)</h2>
          <div className="space-y-2">
            {suspicious.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-rose-400 font-semibold">{u.high_risk} high-risk</span>
                  <span className="text-muted-foreground">{u.total_consents} total</span>
                  {u.is_suspended && <Badge className="bg-rose-500/15 text-rose-400 text-xs">Suspended</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* High-Risk Consents Table */}
      <Card className="p-5 border border-border bg-card">
        <h2 className="font-semibold flex items-center gap-2 mb-4"><ShieldAlert size={16} className="text-rose-400" /> All High-Risk Consents</h2>
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
         threats.length === 0 ? <div className="text-sm text-muted-foreground">No high-risk consents found.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">App</th>
                <th className="text-left px-3 py-2">Data Type</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Score</th>
              </tr></thead>
              <tbody>
                {threats.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2">{t.user_name}<br/><span className="text-muted-foreground">{t.user_email}</span></td>
                    <td className="px-3 py-2 font-medium">{t.app_name}</td>
                    <td className="px-3 py-2">{t.data_type}</td>
                    <td className="px-3 py-2">
                      <Badge className={cn('text-xs', t.status === 'GRANTED' ? 'bg-rose-500/15 text-rose-400' : 'bg-muted text-muted-foreground')}>{t.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-rose-400 font-bold">{t.risk_score ?? '—'}</td>
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

export default AdminThreat;
