import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AppWindow,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  Shield,
  Download,
  Plus,
  ArrowUpRight,
  Activity,
  Zap,
  Lock,
  History,
  ShieldOff,
  Globe,
  ExternalLink,
  AlertTriangle,
  Loader2,
  ScanSearch,
  RefreshCw,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const ConsentRequests = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewConsentModalOpen, setIsNewConsentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newConsentData, setNewConsentData] = useState({
    requester_type: 'app',
    app_name: '',
    requester_url: '',
    data_type: '',
    purpose: '',
    duration: '30 Days'
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Anomaly warning (shown after consent created)
  const [anomalyWarning, setAnomalyWarning] = useState(null);

  // Feature 11 — Privacy Summary
  const [isPrivacySummaryOpen, setIsPrivacySummaryOpen] = useState(false);
  const [privacySummary, setPrivacySummary] = useState(null);
  const [privacySummaryLoading, setPrivacySummaryLoading] = useState(false);

  const fetchPrivacySummary = async () => {
    setIsPrivacySummaryOpen(true);
    setPrivacySummaryLoading(true);
    try {
      const res = await api.get('/ml/privacy-summary');
      setPrivacySummary(res.data);
    } catch { setPrivacySummary({ error: 'Could not load privacy summary' }); }
    finally { setPrivacySummaryLoading(false); }
  };

  // Data Breach Checker
  const [isBreachCheckerOpen, setIsBreachCheckerOpen] = useState(false);
  const [breachEmail, setBreachEmail] = useState('');
  const [breachPassword, setBreachPassword] = useState('');
  const [breachResult, setBreachResult] = useState(null);
  const [breachLoading, setBreachLoading] = useState(false);

  const checkBreach = async () => {
    if (!breachEmail && !breachPassword) return;
    setBreachLoading(true); setBreachResult(null);
    try {
      const res = await api.post('/ml/check-breach', {
        email: breachEmail || undefined,
        password: breachPassword || undefined,
      });
      setBreachResult(res.data);
    } catch { setBreachResult({ error: 'Breach check unavailable — ML service offline' }); }
    finally { setBreachLoading(false); }
  };

  // Website Risk Analyzer
  const [isWebsiteAnalyzerOpen, setIsWebsiteAnalyzerOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteAnalysis, setWebsiteAnalysis] = useState(null);
  const [websiteAnalysisLoading, setWebsiteAnalysisLoading] = useState(false);

  const [geoRisk, setGeoRisk] = useState(null);

  const analyzeWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setWebsiteAnalysisLoading(true);
    setWebsiteAnalysis(null);
    setGeoRisk(null);
    try {
      const [siteRes, geoRes] = await Promise.all([
        api.post('/ml/analyze-website', { url: websiteUrl.trim() }),
        api.post('/ml/check-geo-risk', { url: websiteUrl.trim() }).catch(() => ({ data: null })),
      ]);
      setWebsiteAnalysis(siteRes.data);
      if (geoRes.data) setGeoRisk(geoRes.data);
    } catch (err) {
      setWebsiteAnalysis({ error: 'Analysis failed — ML service may be offline' });
    } finally {
      setWebsiteAnalysisLoading(false);
    }
  };

  // Live ML risk preview in New Consent modal
  const [mlPreview, setMlPreview] = useState(null);
  const [mlPreviewLoading, setMlPreviewLoading] = useState(false);

  // Debounced ML score call
  const [durationSuggestion, setDurationSuggestion] = useState(null);
  const [minimizationWarning, setMinimizationWarning] = useState(null);

  const mlDebounceRef = React.useRef(null);
  const fetchMlPreview = React.useCallback((formData) => {
    clearTimeout(mlDebounceRef.current);
    if (!formData.data_type || !formData.purpose) {
      setMlPreview(null); setDurationSuggestion(null); setMinimizationWarning(null); return;
    }
    mlDebounceRef.current = setTimeout(async () => {
      setMlPreviewLoading(true);
      try {
        const appName = formData.app_name || formData.requester_url || 'unknown';
        const [scoreRes, durationRes, minimRes] = await Promise.all([
          api.post('/ml/score', formData),
          api.post('/ml/suggest-duration', formData).catch(() => ({ data: null })),
          api.post('/ml/check-minimization', {
            app_name: appName,
            data_type: formData.data_type,
            purpose: formData.purpose,
          }).catch(() => ({ data: null })),
        ]);
        setMlPreview(scoreRes.data);
        if (durationRes.data?.suggested_duration) setDurationSuggestion(durationRes.data);
        else setDurationSuggestion(null);
        if (minimRes.data?.excessive) setMinimizationWarning(minimRes.data);
        else setMinimizationWarning(null);
      } catch { /* ML offline — ignore */ }
      finally { setMlPreviewLoading(false); }
    }, 600);
  }, []);

  // Mock Recent Activity
  const recentActions = [
    { id: 1, type: 'approved', app: 'Vertex Analytics', time: '2m ago' },
    { id: 2, type: 'rejected', app: 'Shadow Protocol', time: '15m ago' },
    { id: 3, type: 'revoked', app: 'Nexus Identity', time: '1h ago' },
    { id: 4, type: 'created', app: 'Alpha Systems', time: '3h ago' }
  ];

  // Helper for Risk Scoring
  const getRiskScore = (row) => {
    const t = row.data_type?.toLowerCase() || '';
    const d = row.duration?.toLowerCase() || '';
    if (t.includes('id') || t.includes('passport') || d.includes('permanent')) return { level: 'High', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    if (t.includes('financial') || t.includes('resume') || d.includes('90')) return { level: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { level: 'Low', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  // Trigger ML preview whenever relevant form fields change
  React.useEffect(() => {
    if (isNewConsentModalOpen) fetchMlPreview(newConsentData);
  }, [newConsentData.data_type, newConsentData.purpose, newConsentData.duration, newConsentData.requester_type, newConsentData.requester_url, isNewConsentModalOpen, fetchMlPreview]);

  // Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('DESC');

  const columns = [
    {
      header: 'Requestor',
      accessor: 'app_name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-md border bg-muted/50", row.requester_type === 'website' && "border-blue-500/30 bg-blue-500/10")}>
            {row.requester_type === 'website'
              ? <Globe className="h-4 w-4 text-blue-400" />
              : <AppWindow className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">{row.app_name}</span>
            {row.requester_type === 'website' && row.requester_url ? (
              <a href={row.requester_url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-blue-400 mt-0.5 hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                onClick={e => e.stopPropagation()}>
                {row.requester_url.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            ) : (
              <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">App</span>
            )}
          </div>
        </div>
      )
    },
    { 
      header: 'Scope', 
      accessor: 'data_type', 
      sortable: true, 
      render: (row) => (
        <Badge variant="secondary" className="font-medium text-[11px] px-2 py-0">
          {row.data_type}
        </Badge>
      )
    },
    { 
      header: 'Risk', 
      accessor: 'risk_level',
      sortable: true,
      render: (row) => {
        const s = getRiskScore(row);
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider px-2 py-0", s.color)}>
              {s.level} Risk
            </Badge>
            {row.risk_score != null && (
              <span className={cn("text-[10px] font-mono font-bold", s.color.split(' ')[0])}>
                {row.risk_score}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Timeline',
      accessor: 'duration',
      sortable: true,
      render: (row) => {
        const isGranted = row.status === 'GRANTED';
        const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
        const now = new Date();
        const msLeft = expiresAt ? expiresAt - now : null;
        const daysLeft = msLeft ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : null;
        const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
        const isExpired = daysLeft !== null && daysLeft <= 0;

        return (
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-tight">
               <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {row.duration}
               </span>
               {isGranted && !expiresAt && <span className="text-primary italic">Permanent</span>}
            </div>
            {isGranted && expiresAt && (
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "text-[10px] font-semibold",
                  isExpired ? "text-rose-500" : isExpiringSoon ? "text-amber-400" : "text-emerald-400"
                )}>
                  {isExpired
                    ? "Expired"
                    : isExpiringSoon
                    ? `Expires in ${daysLeft}d`
                    : `Expires ${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`}
                </span>
                {!isExpired && (
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: isExpiringSoon ? `${(daysLeft/7)*100}%` : '70%' }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn("h-full shadow-sm", isExpiringSoon ? "bg-amber-400" : "bg-primary shadow-[0_0_10px_rgba(168,85,247,0.5)]")}
                    />
                  </div>
                )}
              </div>
            )}
            {isGranted && !expiresAt && (
               <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '70%' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-primary shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                  />
               </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (row) => {
        const isPending = row.status === 'PENDING';
        const isGranted = row.status === 'GRANTED';
        const isRevoked = row.status === 'REVOKED';
        return (
          <Badge
            variant="outline"
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
              isPending && "border-amber-500/50 text-amber-500 bg-amber-500/5",
              isGranted && "border-emerald-500/50 text-emerald-500 bg-emerald-500/5",
              isRevoked && "border-rose-500/50 text-rose-500 bg-rose-500/5",
              !isPending && !isGranted && !isRevoked && "border-zinc-500/50 text-zinc-400 bg-zinc-500/5"
            )}
          >
            {row.status}
          </Badge>
        );
      }
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => {
        const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
        const daysLeft = expiresAt ? Math.ceil((expiresAt - Date.now()) / 86400000) : null;
        const isExpiringSoon = row.status === 'GRANTED' && daysLeft !== null && daysLeft <= 7;
        return (
          <div className="flex justify-end gap-1 items-center">
            {row.status === 'PENDING' && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
                ⏳ Awaiting admin review
              </span>
            )}
            {row.status === 'GRANTED' && !isExpiringSoon && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1">
                ✅ Approved by admin
              </span>
            )}
            {row.status === 'GRANTED' && isExpiringSoon && !row.renewal_requested && (
              <Button size="sm" variant="outline"
                className="h-7 px-2 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                onClick={async (e) => { e.stopPropagation(); try { await api.post(`/consents/${row.id}/renew`); fetchConsents(); } catch (err) { console.error('Renewal failed', err); } }}
                title="Request renewal">
                <RefreshCw size={11} /> Renew
              </Button>
            )}
            {row.status === 'GRANTED' && row.renewal_requested && (
              <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1">
                🔄 Renewal requested
              </span>
            )}
            {row.status === 'DENIED' && (
              <span className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-2 py-1">
                ❌ Denied by admin
              </span>
            )}
            {row.status === 'REVOKED' && (
              <span className="text-xs text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 rounded-md px-2 py-1">
                🚫 Revoked
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); setSelectedRequest(row); setIsModalOpen(true); }}
              title="View details"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/consents', {
        params: { page, limit, sortBy, sortDir }
      });
      if (res.data.success) {
        setData(res.data.consents);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch consents', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortDir]);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const handleAction = async (id, actionType) => {
    try {
      const endpointMap = {
        APPROVE: '/consents/approve',
        REJECT: '/consents/reject',
        REVOKE: '/consents/revoke',
      };
      await api.post(endpointMap[actionType], { id });
      fetchConsents();
    } catch (err) {
      console.error(`Failed to ${actionType} consent`, err);
    }
  };

  const pendingIds = data.filter(r => r.status === 'PENDING').map(r => r.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every(id => selectedIds.has(id));

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    try {
      await api.post('/consents/bulk', { ids: Array.from(selectedIds), action });
      setSelectedIds(new Set());
      fetchConsents();
    } catch (err) {
      console.error('Bulk action failed', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCreateConsent = async () => {
    const isWebsite = newConsentData.requester_type === 'website';
    if (isWebsite && !newConsentData.requester_url) return;
    if (!isWebsite && !newConsentData.app_name) return;
    if (!newConsentData.data_type || !newConsentData.purpose) return;
    setSubmitLoading(true);
    setSubmitError('');
    try {
      const res = await api.post('/consents', newConsentData);
      setIsNewConsentModalOpen(false);
      setNewConsentData({ requester_type: 'app', app_name: '', requester_url: '', data_type: '', purpose: '', duration: '30 Days' });
      setMlPreview(null);
      setSubmitError('');
      fetchConsents();
      if (res.data?.anomaly?.anomaly) {
        setAnomalyWarning(res.data.anomaly);
        setTimeout(() => setAnomalyWarning(null), 12000);
      }
      const appName = newConsentData.requester_type === 'website' ? newConsentData.requester_url : newConsentData.app_name;
      if (appName) {
        api.get(`/ml/permission-creep?app_name=${encodeURIComponent(appName)}`).then(cr => {
          if (cr.data?.data?.creep) {
            setAnomalyWarning(prev => prev || cr.data.data);
            setTimeout(() => setAnomalyWarning(null), 15000);
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to create consent', err);
      setSubmitError(err.response?.data?.error || 'Failed to submit consent. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const downloadCSV = () => {
    // Basic CSV Export implementation
    const headers = ['Requestor', 'Scope', 'Risk', 'Duration', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
        [row.app_name, row.data_type, row.risk_level, row.duration, row.status, new Date(row.created_at).toLocaleDateString()].map(str => `"${str}"`).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'ZeroShare_Consent_Requests.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSort = (key, direction) => {
    setSortBy(key);
    setSortDir(direction);
    setPage(1);
  };

  const filteredData = data.filter(row => {
    const query = searchQuery.toLowerCase();
    return (
      (row.app_name?.toLowerCase().includes(query)) ||
      (row.data_type?.toLowerCase().includes(query)) ||
      (row.purpose?.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex flex-col gap-8 p-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Governance</h1>
            <p className="text-muted-foreground mt-1 text-sm">Review and authorize data access requests from external applications.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 bg-card" onClick={downloadCSV}>
               <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" className="gap-2 bg-card border-rose-500/30 text-rose-400 hover:bg-rose-500/10" onClick={() => { setIsBreachCheckerOpen(true); setBreachResult(null); setBreachEmail(''); setBreachPassword(''); }}>
               <ShieldOff className="h-4 w-4" /> Breach Check
            </Button>
            <Button variant="outline" className="gap-2 bg-card border-purple-500/30 text-purple-400 hover:bg-purple-500/10" onClick={fetchPrivacySummary}>
               <Activity className="h-4 w-4" /> Privacy Summary
            </Button>
            <Button variant="outline" className="gap-2 bg-card border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => { setIsWebsiteAnalyzerOpen(true); setWebsiteAnalysis(null); setWebsiteUrl(''); }}>
               <ScanSearch className="h-4 w-4" /> Check Website Risk
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" onClick={() => setIsNewConsentModalOpen(true)}>
               <Plus className="h-4 w-4" /> New Consent
            </Button>
          </div>
        </header>

        {/* Feature 4 — Anomaly Warning Banner */}
        {anomalyWarning && (
          <div className={cn(
            "rounded-xl border px-4 py-3 flex items-start gap-3",
            anomalyWarning.severity === 'high' ? "border-rose-500/40 bg-rose-500/10" : "border-amber-500/40 bg-amber-500/10"
          )}>
            <AlertTriangle className={cn("h-5 w-5 mt-0.5 shrink-0", anomalyWarning.severity === 'high' ? "text-rose-400" : "text-amber-400")} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Anomaly Detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">{anomalyWarning.message}</p>
            </div>
            <button onClick={() => setAnomalyWarning(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3 flex flex-col border p-0 bg-card overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4 bg-muted/30">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search requestors or scopes..." 
                  className="pl-9 h-9 bg-background focus:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Bulk action bar — admin only */}
            {isAdmin && selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-primary/20">
                <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={() => handleBulkAction('APPROVE')}
                  disabled={bulkLoading}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve All
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                  onClick={() => handleBulkAction('REJECT')}
                  disabled={bulkLoading}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject All
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            )}

            {/* Select all pending — admin only */}
            {isAdmin && pendingIds.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-muted/20">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-input cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">Select all {pendingIds.length} pending</span>
              </div>
            )}

            <DataTable
              columns={isAdmin ? [
                {
                  header: '',
                  accessor: '_check',
                  render: (row) => row.status === 'PENDING' ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      onClick={e => e.stopPropagation()}
                      className="h-4 w-4 rounded border-input cursor-pointer accent-primary"
                    />
                  ) : null
                },
                ...columns
              ] : columns}
              data={filteredData}
              loading={loading}
              pagination={{ page, limit, total, totalPages }}
              onPageChange={setPage}
              sortConfig={{ key: sortBy, direction: sortDir }}
              onSort={handleSort}
            />
          </Card>

          <div className="flex flex-col gap-6">
             <Card className="border bg-card shadow-lg p-5">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                   </h3>
                   <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                </div>
                <div className="flex flex-col gap-5">
                   {recentActions.map((action, idx) => (
                      <div key={action.id} className="flex gap-3 relative">
                         {idx !== recentActions.length - 1 && (
                            <div className="absolute left-[7px] top-4 w-[1px] h-8 bg-muted" />
                         )}
                         <div className={cn(
                            "h-3.5 w-3.5 rounded-full mt-1 border-2 border-background shadow-lg shrink-0",
                            action.type === 'approved' ? "bg-emerald-500" : 
                            action.type === 'rejected' ? "bg-rose-500" :
                            action.type === 'revoked' ? "bg-amber-500" : "bg-primary"
                         )} />
                         <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold leading-none">{action.app}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter italic">
                                  {action.type}
                               </span>
                               <span className="text-[9px] text-muted-foreground font-mono">
                                  {action.time}
                               </span>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
                <Button variant="ghost" className="w-full mt-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary h-8 py-0">
                   View Full Logs <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
             </Card>

             <Card className="border bg-primary/5 border-primary/20 p-5 overflow-hidden relative group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                   <Lock className="h-24 w-24 text-primary" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                   <ShieldCheck className="h-4 w-4" />
                   Security Score
                </h3>
                <div className="text-3xl font-black italic tracking-tighter mb-1">94%</div>
                <p className="text-[10px] text-muted-foreground leading-tight max-w-[150px]">
                   Privacy compliance is optimal. High-risk requests under secondary review.
                </p>
             </Card>
          </div>
        </div>
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Governance Ledger Entry
            </DialogTitle>
            <DialogDescription>
              Detailed view of the cryptographic authorization record.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="flex flex-col gap-8 py-4">
               <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-1.5">
                     <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                       {selectedRequest.requester_type === 'website' ? 'Website' : 'Application'}
                     </span>
                     <div className="flex items-center gap-2">
                       {selectedRequest.requester_type === 'website'
                         ? <Globe className="h-4 w-4 text-blue-400" />
                         : <AppWindow className="h-4 w-4 text-primary" />}
                       <span className="text-lg font-bold">{selectedRequest.app_name}</span>
                     </div>
                     {selectedRequest.requester_type === 'website' && selectedRequest.requester_url && (
                       <a
                         href={selectedRequest.requester_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-1 text-xs text-blue-400 hover:underline mt-0.5"
                       >
                         <ExternalLink className="h-3 w-3" />
                         {selectedRequest.requester_url.replace(/^https?:\/\//, '')}
                       </a>
                     )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Status</span>
                     <div>
                        <Badge
                          variant={selectedRequest.status === 'APPROVED' ? "default" : "destructive"}
                          className="px-3 py-0.5"
                        >
                          {selectedRequest.status}
                        </Badge>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Requested Scope</span>
                  <div className="text-base font-medium p-3 rounded-md bg-muted/50 border border-dashed">
                    {selectedRequest.data_type}
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Purpose Statement</span>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "{selectedRequest.purpose}"
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-4 pt-6 border-t font-mono">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-sans">Authorized On</span>
                     <div className="text-xs">{new Date(selectedRequest.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                     <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-sans">Expires On</span>
                     <div className="text-xs">{selectedRequest.duration}</div>
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* New Consent Creation Modal */}
      <Dialog open={isNewConsentModalOpen} onOpenChange={setIsNewConsentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue New Authorization</DialogTitle>
            <DialogDescription>
              Grant limited data access strictly adhering to zero-trust models.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* App / Website toggle */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-white/5">
              <button type="button"
                onClick={() => setNewConsentData(p => ({ ...p, requester_type: 'app', requester_url: '' }))}
                className={cn('flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-semibold rounded-md transition-colors',
                  newConsentData.requester_type === 'app' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
              >
                <AppWindow className="h-4 w-4" /> App
              </button>
              <button type="button"
                onClick={() => setNewConsentData(p => ({ ...p, requester_type: 'website', app_name: '' }))}
                className={cn('flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-semibold rounded-md transition-colors',
                  newConsentData.requester_type === 'website' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground')}
              >
                <Globe className="h-4 w-4" /> Website
              </button>
            </div>

            {newConsentData.requester_type === 'app' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Application Name</label>
                <Input
                  value={newConsentData.app_name}
                  onChange={e => setNewConsentData(p => ({ ...p, app_name: e.target.value }))}
                  placeholder="e.g., Nexus Identity Platform"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Website URL</label>
                  <Input
                    value={newConsentData.requester_url}
                    onChange={e => setNewConsentData(p => ({ ...p, requester_url: e.target.value }))}
                    placeholder="e.g., https://myshop.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Display Name</label>
                  <Input
                    value={newConsentData.app_name}
                    onChange={e => setNewConsentData(p => ({ ...p, app_name: e.target.value }))}
                    placeholder="e.g., MyShop"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Requested Data Type</label>
              <Input
                value={newConsentData.data_type}
                onChange={e => setNewConsentData(p => ({ ...p, data_type: e.target.value }))}
                placeholder="e.g., Financial Audit History"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Purpose / Justification</label>
              <Input
                value={newConsentData.purpose}
                onChange={e => setNewConsentData(p => ({ ...p, purpose: e.target.value }))}
                placeholder="e.g., Legal compliance verification (min 5 chars)"
              />
              {newConsentData.purpose.length > 0 && newConsentData.purpose.length < 5 && (
                <p className="text-xs text-rose-400">Purpose must be at least 5 characters.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Access Duration</label>
              <select
                value={newConsentData.duration}
                onChange={e => setNewConsentData(p => ({ ...p, duration: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="7 Days">7 Days</option>
                <option value="14 Days">14 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
                <option value="180 Days">180 Days</option>
                <option value="1 Year">1 Year</option>
              </select>
              {/* Feature 5 — Duration Suggestion */}
              {durationSuggestion && durationSuggestion.suggested_duration !== newConsentData.duration && (
                <button
                  type="button"
                  onClick={() => setNewConsentData(p => ({ ...p, duration: durationSuggestion.suggested_duration }))}
                  className="flex items-center gap-2 mt-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-1.5 w-full text-left"
                >
                  <Zap className="h-3 w-3 shrink-0" />
                  <span>💡 ML suggests: <strong>{durationSuggestion.suggested_duration}</strong> — {durationSuggestion.reason} <span className="underline ml-1">Apply</span></span>
                </button>
              )}
              {/* Feature 9 — Data Minimization Warning */}
              {minimizationWarning && (
                <div className={`flex items-start gap-2 mt-2 text-xs rounded-md px-3 py-2 border ${
                  minimizationWarning.severity === 'high'
                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                }`}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">⚖️ Data Minimization Alert</p>
                    {minimizationWarning.flags.map((f, i) => <p key={i}>{f}</p>)}
                  </div>
                </div>
              )}
            </div>

            {/* Live ML Risk Preview */}
            {(mlPreview || mlPreviewLoading) && (
              <div className={cn(
                "rounded-lg border p-3 text-xs space-y-1.5 transition-all",
                mlPreview?.risk_level === 'high'   && "border-rose-500/30 bg-rose-500/10",
                mlPreview?.risk_level === 'medium' && "border-amber-500/30 bg-amber-500/10",
                mlPreview?.risk_level === 'low'    && "border-emerald-500/30 bg-emerald-500/10",
                mlPreviewLoading && !mlPreview && "border-white/10 bg-muted/30 animate-pulse",
              )}>
                {mlPreviewLoading && !mlPreview && (
                  <span className="text-muted-foreground">Analysing risk…</span>
                )}
                {mlPreview && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-widest text-[10px] text-muted-foreground">AI Risk Assessment</span>
                      <span className={cn(
                        "font-bold text-xs px-2 py-0.5 rounded-full",
                        mlPreview.risk_level === 'high'   && "text-rose-400 bg-rose-500/20",
                        mlPreview.risk_level === 'medium' && "text-amber-400 bg-amber-500/20",
                        mlPreview.risk_level === 'low'    && "text-emerald-400 bg-emerald-500/20",
                      )}>
                        {mlPreview.risk_level?.toUpperCase()} · {mlPreview.score}/100
                      </span>
                    </div>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {mlPreview.factors?.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                    <div className="text-[10px] text-muted-foreground/60 pt-0.5">
                      Confidence: {mlPreview.confidence}
                    </div>
                  </>
                )}
              </div>
            )}

            {submitError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2 mt-1">
                {submitError}
              </p>
            )}
            <Button
              className="mt-2 bg-primary hover:bg-primary/90 text-white w-full"
              onClick={handleCreateConsent}
              disabled={
                submitLoading ||
                !newConsentData.data_type ||
                !newConsentData.purpose || newConsentData.purpose.length < 5 ||
                (newConsentData.requester_type === 'app' ? !newConsentData.app_name : !newConsentData.requester_url)
              }
            >
              {submitLoading ? 'Submitting…' : 'Issue Consent Grant'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Privacy Summary Modal (Feature 11) ──────────────────────────── */}
      <Dialog open={isPrivacySummaryOpen} onOpenChange={setIsPrivacySummaryOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-purple-400" /> Privacy Health Summary</DialogTitle>
            <DialogDescription>AI-generated overview of your data sharing activity</DialogDescription>
          </DialogHeader>
          {privacySummaryLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div>}
          {privacySummary && !privacySummaryLoading && !privacySummary.error && (
            <div className="space-y-4 mt-2">
              {/* Score ring */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
                <div className={`text-4xl font-bold ${privacySummary.score >= 80 ? 'text-emerald-400' : privacySummary.score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {privacySummary.score}<span className="text-lg text-muted-foreground">/100</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Privacy Score</p>
                  <p className="text-xs text-muted-foreground">{privacySummary.summary}</p>
                </div>
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Active', value: privacySummary.stats.granted, color: 'text-emerald-400' },
                  { label: 'Denied', value: privacySummary.stats.denied, color: 'text-rose-400' },
                  { label: 'Revoked', value: privacySummary.stats.revoked, color: 'text-amber-400' },
                  { label: 'High Risk', value: privacySummary.stats.high_risk_active, color: 'text-rose-400' },
                  { label: 'Expiring', value: privacySummary.stats.expiring_soon, color: 'text-amber-400' },
                  { label: 'Apps', value: privacySummary.stats.unique_apps, color: 'text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-card border border-border p-2 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Insights */}
              {privacySummary.insights?.length > 0 && (
                <div className="rounded-lg border border-border p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Insights</p>
                  {privacySummary.insights.map((ins, i) => (
                    <p key={i} className="text-xs text-foreground">{ins}</p>
                  ))}
                </div>
              )}
              {/* Data types */}
              {privacySummary.shared_data_types?.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Data Types You Share</p>
                  <div className="flex flex-wrap gap-1.5">
                    {privacySummary.shared_data_types.map((t, i) => (
                      <span key={i} className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {privacySummary?.error && <p className="text-rose-400 text-sm mt-2">{privacySummary.error}</p>}
        </DialogContent>
      </Dialog>

      {/* ── Data Breach Checker Modal ────────────────────────────────────── */}
      <Dialog open={isBreachCheckerOpen} onOpenChange={(o) => { setIsBreachCheckerOpen(o); if (!o) { setBreachResult(null); setBreachEmail(''); setBreachPassword(''); }}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-rose-400" />
              Data Breach Checker
            </DialogTitle>
            <DialogDescription>
              Check if your email or password has appeared in real data breaches. Password is never sent — only a partial hash (k-anonymity).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email address</label>
              <Input placeholder="you@example.com" value={breachEmail} onChange={e => setBreachEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Password (optional — checked anonymously)</label>
              <Input placeholder="Enter a password to check" value={breachPassword} onChange={e => setBreachPassword(e.target.value)} type="password" />
            </div>
            <Button onClick={checkBreach} disabled={breachLoading || (!breachEmail && !breachPassword)} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
              {breachLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
              {breachLoading ? 'Checking breaches...' : 'Check Now'}
            </Button>
          </div>

          {breachResult && (
            <div className="flex flex-col gap-3 mt-2">
              {/* Password result */}
              {breachResult.password && (
                <div className={cn("rounded-lg border p-3", breachResult.password.breached ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/40 bg-emerald-500/10")}>
                  <p className="text-sm font-medium mb-1">Password Check</p>
                  <p className="text-xs text-muted-foreground">{breachResult.password.message}</p>
                  {breachResult.password.recommendation && <p className="text-xs text-amber-400 mt-1">💡 {breachResult.password.recommendation}</p>}
                </div>
              )}
              {/* Email result */}
              {breachResult.email && (
                <div className={cn("rounded-lg border p-3", breachResult.email.breached ? "border-rose-500/40 bg-rose-500/10" : breachResult.email.breached === false ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10")}>
                  <p className="text-sm font-medium mb-1">Email Breach Check</p>
                  <p className="text-xs text-muted-foreground">{breachResult.email.message}</p>
                  {breachResult.email.check_url && (
                    <a href={breachResult.email.check_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-2">
                      <ExternalLink className="h-3 w-3" /> {breachResult.email.action}
                    </a>
                  )}
                  {breachResult.email.breaches?.map((b, i) => (
                    <div key={i} className="mt-2 border border-rose-500/20 rounded p-2">
                      <p className="text-xs font-medium text-rose-400">{b.name} — {b.date}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Data leaked: {b.data_leaked?.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
              {breachResult.error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{breachResult.error}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Website Risk Analyzer Modal ─────────────────────────────────── */}
      <Dialog open={isWebsiteAnalyzerOpen} onOpenChange={(o) => { setIsWebsiteAnalyzerOpen(o); if (!o) { setWebsiteAnalysis(null); setWebsiteUrl(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-blue-400" />
              Website Risk Analyzer
            </DialogTitle>
            <DialogDescription>
              Enter any website URL. Our ML service will fetch and analyze it in real-time for data-sharing safety.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mt-2">
            <Input
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeWebsite()}
              className="flex-1"
            />
            <Button onClick={analyzeWebsite} disabled={websiteAnalysisLoading || !websiteUrl.trim()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              {websiteAnalysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {websiteAnalysisLoading ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>

          {websiteAnalysisLoading && (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm">Fetching and analyzing website...</p>
              <p className="text-xs opacity-60">Checking privacy policy, security headers, scripts...</p>
            </div>
          )}

          {websiteAnalysis && !websiteAnalysis.error && (
            <div className="flex flex-col gap-4 mt-2">
              {/* Score card */}
              <div className={cn(
                "rounded-xl border p-4 flex items-center gap-4",
                websiteAnalysis.risk_level === 'high'   && "border-rose-500/40 bg-rose-500/10",
                websiteAnalysis.risk_level === 'medium' && "border-amber-500/40 bg-amber-500/10",
                websiteAnalysis.risk_level === 'low'    && "border-emerald-500/40 bg-emerald-500/10",
              )}>
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold shrink-0",
                  websiteAnalysis.risk_level === 'high'   && "bg-rose-500/20 text-rose-400",
                  websiteAnalysis.risk_level === 'medium' && "bg-amber-500/20 text-amber-400",
                  websiteAnalysis.risk_level === 'low'    && "bg-emerald-500/20 text-emerald-400",
                )}>
                  {websiteAnalysis.score}
                </div>
                <div>
                  <p className="font-semibold text-base capitalize">{websiteAnalysis.risk_level} Risk</p>
                  <p className="text-xs text-muted-foreground break-all">{websiteAnalysis.domain}</p>
                  {!websiteAnalysis.fetch_success && (
                    <p className="text-xs text-amber-400 mt-1">⚠️ Could not fully reach site — partial analysis</p>
                  )}
                </div>
                <div className="ml-auto">
                  {websiteAnalysis.risk_level === 'high'   && <AlertTriangle className="h-8 w-8 text-rose-400" />}
                  {websiteAnalysis.risk_level === 'medium' && <AlertCircle className="h-8 w-8 text-amber-400" />}
                  {websiteAnalysis.risk_level === 'low'    && <ShieldCheck className="h-8 w-8 text-emerald-400" />}
                </div>
              </div>

              {/* Verdict */}
              <div className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-center",
                websiteAnalysis.risk_level === 'high'   && "bg-rose-500/10 text-rose-300",
                websiteAnalysis.risk_level === 'medium' && "bg-amber-500/10 text-amber-300",
                websiteAnalysis.risk_level === 'low'    && "bg-emerald-500/10 text-emerald-300",
              )}>
                {websiteAnalysis.risk_level === 'high'   && "🔴 Not recommended — avoid sharing personal data with this site"}
                {websiteAnalysis.risk_level === 'medium' && "🟡 Proceed with caution — review the findings before sharing data"}
                {websiteAnalysis.risk_level === 'low'    && "🟢 Looks safe — site meets basic data-sharing safety standards"}
              </div>

              {/* Factors */}
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {websiteAnalysis.factors?.map((f, i) => (
                  <div key={i} className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">{f}</div>
                ))}
              </div>

              <a href={websiteAnalysis.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Visit {websiteAnalysis.domain}
              </a>

              {/* Feature 7 — Trust Score History */}
              {websiteAnalysis.history?.length > 1 && (
                <div className="mt-3 border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Trust Score History</p>
                  <div className="flex items-end gap-1.5 h-10">
                    {websiteAnalysis.history.slice().reverse().map((h, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className={cn("w-full rounded-sm",
                            h.risk_level === 'high' ? "bg-rose-500" : h.risk_level === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ height: `${Math.max(4, h.score)}%`, maxHeight: '36px', minHeight: '4px' }}
                          title={`Score: ${h.score} — ${new Date(h.analyzed_at).toLocaleDateString()}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {websiteAnalysis.history.length} past scan{websiteAnalysis.history.length > 1 ? 's' : ''} —
                    latest: <span className={cn(
                      websiteAnalysis.history[0]?.risk_level === 'high' ? "text-rose-400" :
                      websiteAnalysis.history[0]?.risk_level === 'medium' ? "text-amber-400" : "text-emerald-400"
                    )}>{websiteAnalysis.history[0]?.score}/100 {websiteAnalysis.history[0]?.risk_level}</span>
                    {websiteAnalysis.history.length > 1 && websiteAnalysis.history[0]?.score !== websiteAnalysis.history[1]?.score && (
                      <span className="ml-2 text-amber-400">
                        {websiteAnalysis.history[0]?.score > websiteAnalysis.history[1]?.score ? '⬆️ Risk increased' : '⬇️ Risk decreased'}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {websiteAnalysis?.error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400 mt-2">
              {websiteAnalysis.error}
            </div>
          )}

          {/* Feature 10 — Geo-Risk Card */}
          {geoRisk && (
            <div className={`mt-3 rounded-lg border p-3 text-sm ${
              geoRisk.risk_level === 'high' ? 'border-rose-500/30 bg-rose-500/10' :
              geoRisk.risk_level === 'medium' ? 'border-amber-500/30 bg-amber-500/10' :
              'border-emerald-500/30 bg-emerald-500/10'
            }`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">🌍 Geo-Risk Analysis</p>
              <p className={`text-sm font-medium mb-1 ${
                geoRisk.risk_level === 'high' ? 'text-rose-400' :
                geoRisk.risk_level === 'medium' ? 'text-amber-400' : 'text-emerald-400'
              }`}>{geoRisk.verdict}</p>
              {geoRisk.ip && <p className="text-xs text-muted-foreground mb-1">IP: {geoRisk.ip} · {geoRisk.country_name}{geoRisk.city ? ` · ${geoRisk.city}` : ''}{geoRisk.isp ? ` · ${geoRisk.isp}` : ''}</p>}
              {geoRisk.flags?.map((f, i) => <p key={i} className="text-xs text-rose-300 mt-0.5">{f}</p>)}
              {geoRisk.safe_signals?.map((s, i) => <p key={i} className="text-xs text-emerald-400 mt-0.5">{s}</p>)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsentRequests;
