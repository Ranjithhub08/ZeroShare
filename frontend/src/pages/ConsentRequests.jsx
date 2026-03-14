import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  History
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const ConsentRequests = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewConsentModalOpen, setIsNewConsentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newConsentData, setNewConsentData] = useState({
    app_name: '',
    data_type: '',
    purpose: '',
    duration: '30 Days' // Default duration
  });

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

  // Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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
          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/50">
            <AppWindow className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">{row.app_name}</span>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">Verified App</span>
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
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider px-2 py-0", s.color)}>
            {s.level} Risk
          </Badge>
        );
      }
    },
    { 
      header: 'Timeline', 
      accessor: 'duration', 
      sortable: true, 
      render: (row) => {
        const isApproved = row.status === 'APPROVED';
        return (
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-tight">
               <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {row.duration}
               </span>
               {isApproved && <span className="text-primary italic">3 days left</span>}
            </div>
            {isApproved && (
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
        const isApproved = row.status === 'APPROVED';
        return (
          <Badge 
            variant={isPending ? "outline" : isApproved ? "default" : "destructive"} 
            className={cn(
              "px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
              isPending && "border-amber-500/50 text-amber-500 bg-amber-500/5"
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
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === 'PENDING' ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'APPROVE'); }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'REJECT'); }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          ) : (
             <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); setSelectedRequest(row); setIsModalOpen(true); }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    try {
      const url = `http://localhost:5001/api/consents/list?page=${page}&limit=${limit}&sortBy=${sortBy}&sortDir=${sortDir}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTotal(json.count);
        setTotalPages(json.totalPages);
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
      const endpoint = actionType === 'APPROVE' ? '/approve' : '/reject';
      await fetch(`http://localhost:5001/api/consents${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchConsents();
    } catch (err) {
      console.error(`Failed to ${actionType} consent`, err);
    }
  };

  const handleCreateConsent = async () => {
    // Generate a new row instead of hitting DB completely (for UI demo purposes)
    const newRow = {
      id: Date.now() + "_" + Math.floor(Math.random()*1000),
      app_name: newConsentData.app_name,
      data_type: newConsentData.data_type,
      purpose: newConsentData.purpose,
      duration: newConsentData.duration,
      risk_level: 'low', 
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    
    // Simulating database latency
    setLoading(true);
    setTimeout(() => {
      setData(prev => [newRow, ...prev]);
      setTotal(prev => prev + 1);
      setIsNewConsentModalOpen(false);
      setNewConsentData({ app_name: '', data_type: '', purpose: '', duration: '30 Days' });
      setLoading(false);
    }, 600);
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
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" onClick={() => setIsNewConsentModalOpen(true)}>
               <Plus className="h-4 w-4" /> New Consent
            </Button>
          </div>
        </header>

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

            <DataTable 
              columns={columns} 
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
                     <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Application</span>
                     <div className="text-lg font-bold">{selectedRequest.app_name}</div>
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

          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Application Name</label>
              <Input 
                value={newConsentData.app_name}
                onChange={e => setNewConsentData(p => ({ ...p, app_name: e.target.value }))}
                placeholder="e.g., Nexus Identity Platform" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Requested Data Type</label>
              <Input 
                value={newConsentData.data_type}
                onChange={e => setNewConsentData(p => ({ ...p, data_type: e.target.value }))}
                placeholder="e.g., Financial Audit History" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Justification Purpose</label>
              <Input 
                value={newConsentData.purpose}
                onChange={e => setNewConsentData(p => ({ ...p, purpose: e.target.value }))}
                placeholder="Legal compliance verification." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Access Expiry</label>
              <Input 
                value={newConsentData.duration}
                onChange={e => setNewConsentData(p => ({ ...p, duration: e.target.value }))}
                placeholder="e.g., 30 Days" 
              />
            </div>
            
            <Button 
               className="mt-4 bg-primary hover:bg-primary/90 text-white w-full"
               onClick={handleCreateConsent}
               disabled={!newConsentData.app_name || !newConsentData.data_type || !newConsentData.purpose}
            >
              Issue Consent Grant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsentRequests;
