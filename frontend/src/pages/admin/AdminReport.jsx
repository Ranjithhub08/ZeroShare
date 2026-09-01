import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { BarChart3, Download, ShieldCheck, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { cn } from '@/lib/utils';

const AdminReport = () => {
  const [mlReport, setMlReport] = useState(null);
  const [gdpr, setGdpr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [mlRes, gdprRes] = await Promise.all([
          api.get('/admin/ml-report'),
          api.get('/admin/gdpr-report'),
        ]);
        setMlReport(mlRes.data);
        setGdpr(gdprRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const exportCSV = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem('zs_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/admin/audit-export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `zeroshare-audit-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExportLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="text-rose-400" size={28} /> Reports & Compliance
          </h1>
          <p className="text-muted-foreground mt-1">System-wide ML analytics, GDPR compliance, and audit exports.</p>
        </div>
        <Button onClick={exportCSV} disabled={exportLoading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export Audit CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-rose-400" size={28} /></div>
      ) : (
        <>
          {/* GDPR Compliance */}
          {gdpr && (
            <Card className={`p-5 border bg-card ${gdpr.status === 'COMPLIANT' ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShieldCheck size={16} className={gdpr.status === 'COMPLIANT' ? 'text-emerald-400' : 'text-rose-400'} />
                  GDPR Compliance Report
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${gdpr.summary.compliance_score >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gdpr.summary.compliance_score}/100
                  </span>
                  <Badge className={gdpr.status === 'COMPLIANT' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}>
                    {gdpr.status === 'COMPLIANT' ? '✅ COMPLIANT' : '⚠️ NEEDS ATTENTION'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {[
                  { label: 'Total Users', value: gdpr.summary.total_users },
                  { label: 'Total Consents', value: gdpr.summary.total_consents },
                  { label: 'Permanent (no expiry)', value: gdpr.summary.permanent_consents, warn: gdpr.summary.permanent_consents > 0 },
                  { label: 'High-Risk Active', value: gdpr.summary.high_risk_active, warn: gdpr.summary.high_risk_active > 0 },
                  { label: 'Overdue Revocations', value: gdpr.summary.overdue_revocations, warn: gdpr.summary.overdue_revocations > 0 },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-3 text-center ${s.warn ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-muted/30'}`}>
                    <p className={`text-xl font-bold ${s.warn ? 'text-rose-400' : ''}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {gdpr.issues?.length > 0 && (
                <div className="space-y-2">
                  {gdpr.issues.map((issue, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${issue.severity === 'high' ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300'}`}>
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      {issue.issue}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ML System Report */}
          {mlReport && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <Card className="p-5 border border-border bg-card">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-rose-400" /> Risk Distribution</h2>
                <div className="space-y-3">
                  {mlReport.risk_distribution?.map(r => (
                    <div key={r.risk_level}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={cn('capitalize font-medium', r.risk_level === 'high' ? 'text-rose-400' : r.risk_level === 'medium' ? 'text-amber-400' : 'text-emerald-400')}>
                          {r.risk_level}
                        </span>
                        <span className="text-muted-foreground">{r.count} consents</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${r.risk_level === 'high' ? 'bg-rose-500' : r.risk_level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (r.count / (mlReport.risk_distribution.reduce((a, b) => a + parseInt(b.count), 0))) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Data Types */}
              <Card className="p-5 border border-border bg-card">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><FileText size={16} className="text-rose-400" /> Most Requested Data Types</h2>
                <div className="space-y-2">
                  {mlReport.top_data_types?.slice(0, 6).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="font-medium">{d.data_type}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{d.count} requests</span>
                        {d.avg_score && <span className={parseFloat(d.avg_score) >= 60 ? 'text-rose-400' : 'text-amber-400'}>avg score: {Math.round(d.avg_score)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Riskiest Apps */}
              <Card className="p-5 border border-border bg-card lg:col-span-2">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-rose-400" /> Riskiest Apps (by High-Risk Consents)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left px-3 py-2">App Name</th>
                      <th className="text-left px-3 py-2">Total Requests</th>
                      <th className="text-left px-3 py-2">High Risk</th>
                      <th className="text-left px-3 py-2">Denied</th>
                      <th className="text-left px-3 py-2">Risk Level</th>
                    </tr></thead>
                    <tbody>
                      {mlReport.riskiest_apps?.map((a, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{a.app_name}</td>
                          <td className="px-3 py-2">{a.total}</td>
                          <td className="px-3 py-2 text-rose-400 font-semibold">{a.high_risk}</td>
                          <td className="px-3 py-2 text-amber-400">{a.denied}</td>
                          <td className="px-3 py-2">
                            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (a.high_risk / a.total) * 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default AdminReport;
