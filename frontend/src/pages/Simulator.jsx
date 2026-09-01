import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AppWindow, Globe, ShieldAlert, ShieldCheck, CheckCircle2,
  XCircle, Clock, Zap, AlertTriangle, Unlock, RefreshCw,
  ChevronRight, Database, Activity, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api';

const APPS = [
  { id: 1, name: 'JobPortal',       type: 'app',     icon: '💼', color: 'blue',   purpose: 'recruitment', assets: ['Resume', 'Email', 'Education', 'Phone'], trust: 0.75 },
  { id: 2, name: 'BankKYC',         type: 'app',     icon: '🏦', color: 'green',  purpose: 'kyc',         assets: ['ID Proof', 'Address', 'Financial Record'], trust: 0.85 },
  { id: 3, name: 'HealthcareApp',   type: 'app',     icon: '🏥', color: 'red',    purpose: 'healthcare',  assets: ['Medical Record', 'Email', 'Phone'], trust: 0.60 },
  { id: 4, name: 'EducationPortal', type: 'website', icon: '🎓', color: 'purple', purpose: 'education',   assets: ['Resume', 'Education', 'Email'], trust: 0.70 },
  { id: 5, name: 'MarketingCo',     type: 'app',     icon: '📊', color: 'orange', purpose: 'marketing',   assets: ['Email', 'Phone', 'Address', 'Resume'], trust: 0.30 },
];

const DURATIONS = ['1 Hour', '24 Hours', '7 Days', '30 Days', '6 Months', '1 Year', 'Permanent'];

const colorMap = {
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400' },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  red:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400' },
  purple: { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400' },
  orange: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400' },
};

const riskColor = (level) => {
  if (level === 'high')   return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  if (level === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
};

export default function Simulator() {
  const [selectedApp, setSelectedApp]     = useState(null);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [duration, setDuration]           = useState('24 Hours');
  const [mlResult, setMlResult]           = useState(null);
  const [mlLoading, setMlLoading]         = useState(false);
  const [policy, setPolicy]               = useState(null);
  const [step, setStep]                   = useState('select'); // select | review | result
  const [result, setResult]               = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [testToken, setTestToken]         = useState('');
  const [testAsset, setTestAsset]         = useState('');
  const [testLoading, setTestLoading]     = useState(false);
  const [accessTest, setAccessTest]       = useState(null);

  // Fetch ML score + policy whenever inputs change
  useEffect(() => {
    if (!selectedApp || selectedAssets.length === 0) { setMlResult(null); setPolicy(null); return; }
    const timer = setTimeout(async () => {
      setMlLoading(true);
      try {
        const [mlRes, policyRes] = await Promise.all([
          api.post('/ml/score', {
            app_name: selectedApp.name,
            data_type: selectedAssets.join(', '),
            purpose: selectedApp.purpose,
            duration,
            requester_type: selectedApp.type,
          }),
          api.post('/applications/policy/check', {
            purpose: selectedApp.purpose,
            data_types: selectedAssets,
          }),
        ]);
        setMlResult(mlRes.data);
        setPolicy(policyRes.data);
      } catch { /* ignore */ }
      finally { setMlLoading(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedApp, selectedAssets, duration]);

  const toggleAsset = (asset) =>
    setSelectedAssets(prev => prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/consents', {
        app_name: selectedApp.name,
        data_type: selectedAssets.join(', '),
        purpose: selectedApp.purpose,
        duration,
        requester_type: selectedApp.type,
      });
      setResult({ type: 'ok' });
      setStep('result');
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || 'Failed' });
      setStep('result');
    } finally { setSubmitting(false); }
  };

  const handleTestAccess = async () => {
    setTestLoading(true);
    try {
      const res = await api.post('/gateway/access', { token: testToken, asset: testAsset });
      setAccessTest({ success: true, data: res.data });
    } catch (err) {
      setAccessTest({ success: false, reason: err.response?.data?.error || 'Access denied' });
    } finally { setTestLoading(false); }
  };

  const reset = () => {
    setSelectedApp(null); setSelectedAssets([]); setDuration('24 Hours');
    setMlResult(null); setPolicy(null); setStep('select'); setResult(null);
    setAccessTest(null); setTestToken(''); setTestAsset('');
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Third-Party Simulator</h1>
          <p className="text-muted-foreground mt-1 text-sm">Simulate how external applications request access to your personal data.</p>
        </div>
        {step !== 'select' && <Button variant="outline" onClick={reset} className="gap-2"><RefreshCw className="h-4 w-4" /> Reset</Button>}
      </motion.header>

      {/* ── STEP 1 & 2 & 3 ── */}
      {step === 'select' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">

          {/* Select App */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Step 1 — Select Application</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {APPS.map(app => {
                const c = colorMap[app.color];
                const sel = selectedApp?.id === app.id;
                return (
                  <motion.div key={app.id} whileHover={{ y: -3 }}
                    onClick={() => { setSelectedApp(app); setSelectedAssets([]); }}
                    className={cn('glass-card p-5 cursor-pointer transition-all border-2',
                      sel ? `${c.border} ${c.bg}` : 'border-white/5 hover:border-white/20')}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{app.icon}</span>
                      <div>
                        <p className="font-bold text-white">{app.name}</p>
                        <p className="text-xs text-zinc-500 capitalize">{app.type} · {app.purpose}</p>
                      </div>
                      {app.type === 'website'
                        ? <Globe className="h-4 w-4 text-blue-400 ml-auto" />
                        : <AppWindow className="h-4 w-4 text-zinc-400 ml-auto" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Trust Score</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', app.trust >= 0.7 ? 'bg-emerald-400' : app.trust >= 0.5 ? 'bg-amber-400' : 'bg-rose-400')}
                            style={{ width: `${app.trust * 100}%` }} />
                        </div>
                        <span className={cn('text-xs font-bold', app.trust >= 0.7 ? 'text-emerald-400' : app.trust >= 0.5 ? 'text-amber-400' : 'text-rose-400')}>
                          {Math.round(app.trust * 100)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Select Assets */}
          {selectedApp && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Step 2 — Select Requested Data</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedApp.assets.map(asset => {
                  const unnecessary = policy?.minimization?.unnecessary?.includes(asset);
                  return (
                    <button key={asset} onClick={() => toggleAsset(asset)}
                      className={cn('p-3 rounded-xl border text-sm font-medium transition-all text-left',
                        selectedAssets.includes(asset) ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20')}>
                      <div className="flex items-center gap-2">
                        {selectedAssets.includes(asset) ? <CheckCircle2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                        {asset}
                      </div>
                      {policy && (
                        <span className={cn('text-[10px] mt-1 block', unnecessary ? 'text-rose-400' : 'text-emerald-400')}>
                          {unnecessary ? '⚠ Unnecessary' : '✓ Required'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Step 3 — Access Duration</p>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                        duration === d ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-zinc-400 hover:border-white/20')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* ML Risk Preview */}
              {(mlLoading || mlResult) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={cn('rounded-xl border p-5 space-y-3',
                    mlResult ? `${riskColor(mlResult.risk_level)}` : 'border-white/10 bg-white/5')}>
                  {mlLoading
                    ? <div className="flex items-center gap-2 text-zinc-400 text-sm"><RefreshCw className="h-4 w-4 animate-spin" /> Analysing risk...</div>
                    : mlResult && (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Zap className="h-4 w-4" /><span className="font-bold text-white">AI Risk Assessment</span></div>
                          <Badge variant="outline" className={cn('font-bold text-sm px-3', riskColor(mlResult.risk_level))}>
                            {mlResult.risk_level?.toUpperCase()} · {mlResult.score}/100
                          </Badge>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${mlResult.score}%` }} transition={{ duration: 1 }}
                            className={cn('h-full rounded-full', mlResult.risk_level === 'high' ? 'bg-rose-400' : mlResult.risk_level === 'medium' ? 'bg-amber-400' : 'bg-emerald-400')} />
                        </div>
                        <ul className="space-y-1">{mlResult.factors?.map((f, i) => <li key={i} className="text-xs text-zinc-400">{f}</li>)}</ul>
                        {policy?.minimization?.unnecessary?.length > 0 && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-rose-400">Data Minimization Warning</p>
                              <p className="text-xs text-zinc-400 mt-0.5">Unnecessary: <span className="text-rose-400">{policy.minimization.unnecessary.join(', ')}</span></p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                </motion.div>
              )}

              <Button onClick={() => setStep('review')} disabled={selectedAssets.length === 0}
                className="bg-primary hover:bg-primary/90 text-white w-full gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                Review Request <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── REVIEW ── */}
      {step === 'review' && selectedApp && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <span className="text-3xl">{selectedApp.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedApp.name}</h2>
                <p className="text-sm text-zinc-400 capitalize">{selectedApp.purpose} · {selectedApp.type}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Requested Data</p>
              {selectedAssets.map(asset => (
                <div key={asset} className={cn('flex items-center justify-between p-3 rounded-lg border',
                  policy?.minimization?.unnecessary?.includes(asset) ? 'border-rose-500/20 bg-rose-500/5' : 'border-white/5 bg-white/[0.02]')}>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">{asset}</span>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px]',
                    policy?.minimization?.unnecessary?.includes(asset) ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400')}>
                    {policy?.minimization?.unnecessary?.includes(asset) ? 'Unnecessary' : 'Required'}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-zinc-400" /><span className="text-sm text-zinc-300">Duration</span></div>
              <span className="text-sm font-bold text-white">{duration}</span>
            </div>
            {mlResult && (
              <div className={cn('p-4 rounded-xl border', riskColor(mlResult.risk_level))}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">AI Risk Score</span>
                  <span className="text-2xl font-black">{mlResult.score}/100</span>
                </div>
                <p className="text-xs opacity-80">{mlResult.risk_level?.toUpperCase()} RISK · {mlResult.confidence}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">← Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                {submitting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</> : <><Shield className="h-4 w-4" /> Send Request</>}
              </Button>
            </div>
          </Card>

          {/* Gateway Test Panel */}
          <Card className="border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-white">Access Gateway Test</h3>
            </div>
            <p className="text-xs text-zinc-500">After approving a consent in Governance, get the token and test the access gateway here.</p>
            <div className="space-y-3">
              <Input placeholder="Paste access token..." value={testToken} onChange={e => setTestToken(e.target.value)} className="font-mono text-xs" />
              <Input placeholder="Asset to request (e.g. Resume)" value={testAsset} onChange={e => setTestAsset(e.target.value)} />
              <Button onClick={handleTestAccess} disabled={testLoading || !testToken || !testAsset} className="w-full gap-2">
                {testLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                Test Gateway Access
              </Button>
            </div>
            {accessTest && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={cn('p-4 rounded-xl border', accessTest.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
                <div className="flex items-center gap-2 mb-2">
                  {accessTest.success ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <ShieldAlert className="h-5 w-5 text-rose-400" />}
                  <span className={cn('font-bold text-sm', accessTest.success ? 'text-emerald-400' : 'text-rose-400')}>
                    {accessTest.success ? '200 OK — Access Granted' : `403 FORBIDDEN — ${accessTest.reason}`}
                  </span>
                </div>
                {accessTest.success && accessTest.data?.data && (
                  <pre className="text-xs text-zinc-400 bg-black/30 p-2 rounded-lg overflow-auto max-h-32">
                    {JSON.stringify(accessTest.data.data, null, 2)}
                  </pre>
                )}
              </motion.div>
            )}
          </Card>
        </motion.div>
      )}

      {/* ── RESULT ── */}
      {step === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-10">
          {result?.type === 'ok' ? (
            <>
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Consent Request Sent!</h2>
                <p className="text-zinc-400 mt-2">The request is now PENDING your approval in the Governance page.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>New Request</Button>
                <Button onClick={() => window.location.href = '/consents'} className="bg-primary text-white">Review in Governance →</Button>
              </div>
            </>
          ) : (
            <>
              <div className="h-20 w-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-rose-400" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Request Failed</h2>
                <p className="text-zinc-400 mt-2">{result?.message}</p>
              </div>
              <Button variant="outline" onClick={reset}>Try Again</Button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
