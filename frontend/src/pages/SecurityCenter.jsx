import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert, ShieldCheck, Activity, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, Lock, Hash, Zap, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api';

export default function SecurityCenter() {
  const [anomalies, setAnomalies]     = useState([]);
  const [accessLogs, setAccessLogs]   = useState([]);
  const [auditVerify, setAuditVerify] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [verifying, setVerifying]     = useState(false);
  const [stats, setStats]             = useState({ high: 0, medium: 0, low: 0, totalAccess: 0, denied: 0 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [anomalyRes, logsRes] = await Promise.all([
        api.get('/gateway/anomalies?limit=10'),
        api.get('/gateway/access-logs?limit=20'),
      ]);
      const a = anomalyRes.data.anomalies || [];
      const l = logsRes.data.logs || [];
      setAnomalies(a);
      setAccessLogs(l);
      setStats({
        high:        a.filter(x => x.severity === 'HIGH').length,
        medium:      a.filter(x => x.severity === 'MEDIUM').length,
        low:         a.filter(x => x.severity === 'LOW').length,
        totalAccess: l.length,
        denied:      l.filter(x => x.result === 'DENIED').length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.get('/gateway/audit/verify');
      setAuditVerify(res.data);
    } catch { setAuditVerify({ intact: false, verified: 0, tampered: 0, issues: [] }); }
    finally { setVerifying(false); }
  };

  const handleResolve = async (id) => {
    try { await api.put(`/gateway/anomalies/${id}/resolve`); fetchAll(); } catch {}
  };

  const severityColor = (s) => {
    if (s === 'HIGH')   return 'border-rose-500/30 text-rose-400 bg-rose-500/10';
    if (s === 'MEDIUM') return 'border-amber-500/30 text-amber-400 bg-amber-500/10';
    return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Security Center</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time anomaly detection, access gateway logs, and audit integrity.</p>
        </div>
        <Button variant="outline" onClick={fetchAll} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </motion.header>

      {/* Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'High Anomalies',  value: stats.high,        color: 'text-rose-400',    icon: ShieldAlert },
          { label: 'Med Anomalies',   value: stats.medium,      color: 'text-amber-400',   icon: AlertTriangle },
          { label: 'Low Anomalies',   value: stats.low,         color: 'text-blue-400',    icon: Activity },
          { label: 'Total Accesses',  value: stats.totalAccess, color: 'text-emerald-400', icon: Database },
          { label: 'Denied Requests', value: stats.denied,      color: 'text-rose-400',    icon: XCircle },
        ].map(s => (
          <Card key={s.label} className="border bg-card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</span>
              <s.icon className={cn('h-4 w-4', s.color)} />
            </div>
            <span className={cn('text-3xl font-black', s.color)}>{s.value}</span>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Events */}
        <Card className="border bg-card p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-rose-400" />
              <h2 className="font-bold text-white">Anomaly Events</h2>
            </div>
            <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">
              {anomalies.filter(a => a.status === 'OPEN').length} Open
            </Badge>
          </div>
          <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
            ) : anomalies.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-zinc-500">
                <ShieldCheck className="h-8 w-8 opacity-30" />
                <p className="text-sm">No anomalies detected</p>
              </div>
            ) : anomalies.map(a => (
              <div key={a.id} className="flex items-start justify-between p-4 hover:bg-white/[0.02]">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', severityColor(a.severity))}>{a.severity}</Badge>
                    <span className="text-xs text-zinc-400 font-mono">{a.app_name || 'Unknown App'}</span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{a.reason}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">Score: {a.anomaly_score}/100 · {new Date(a.created_at).toLocaleString()}</p>
                </div>
                {a.status === 'OPEN'
                  ? <Button size="sm" variant="ghost" onClick={() => handleResolve(a.id)} className="h-7 text-xs text-emerald-400 hover:bg-emerald-500/10 shrink-0 ml-2">Resolve</Button>
                  : <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] shrink-0 ml-2">Resolved</Badge>}
              </div>
            ))}
          </div>
        </Card>

        {/* Access Gateway Logs */}
        <Card className="border bg-card p-0 overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-white/5 bg-white/[0.02]">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-white">Access Gateway Log</h2>
          </div>
          <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
            ) : accessLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-zinc-500">
                <Lock className="h-8 w-8 opacity-30" />
                <p className="text-sm">No access attempts yet. Use the Simulator to generate traffic.</p>
              </div>
            ) : accessLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className={cn('h-2 w-2 rounded-full shrink-0', log.result === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400')} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-zinc-200">{log.app_name || 'Unknown'} → {log.data_type || log.action}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                    {log.denial_reason && <span className="text-[10px] text-rose-400">{log.denial_reason}</span>}
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px] font-bold shrink-0',
                  log.result === 'SUCCESS' ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400')}>
                  {log.result}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Audit Chain Integrity */}
      <Card className="border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-white">Audit Chain Integrity</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Verify audit logs have not been tampered with using SHA-256 hash chaining.</p>
            </div>
          </div>
          <Button onClick={handleVerify} disabled={verifying} className="gap-2 bg-primary hover:bg-primary/90 text-white">
            {verifying ? <><RefreshCw className="h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="h-4 w-4" /> Verify Integrity</>}
          </Button>
        </div>

        {auditVerify ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={cn('p-5 rounded-xl border', auditVerify.intact ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
            <div className="flex items-center gap-3 mb-3">
              {auditVerify.intact ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <XCircle className="h-6 w-6 text-rose-400" />}
              <div>
                <p className={cn('font-bold', auditVerify.intact ? 'text-emerald-400' : 'text-rose-400')}>
                  {auditVerify.intact ? 'Audit Chain Intact — No Tampering Detected' : 'Tampering Detected!'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{auditVerify.verified} events verified · {auditVerify.tampered} issues found</p>
              </div>
            </div>
            {auditVerify.issues?.length > 0 && (
              <div className="space-y-1 mt-3">
                {auditVerify.issues.map((issue, i) => (
                  <p key={i} className="text-xs text-rose-400">Event #{issue.id} ({issue.event}): {issue.issue}</p>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-zinc-500">
            <Hash className="h-5 w-5 opacity-30" />
            <p className="text-sm">Click "Verify Integrity" to check the audit chain for tampering.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
