import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Tag, 
  HardDrive, 
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  History,
  ShieldAlert,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const DataVault = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Helper to get sensitivity classification
  const getSensitivity = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('id') || t.includes('proof') || t.includes('passport')) return { level: 'High', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    if (t.includes('email') || t.includes('resume') || t.includes('cv') || t.includes('financial')) return { level: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { level: 'Low', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  // Mock History Data
  const mockHistory = [
    { type: 'requested', app: 'Nexus Identity', time: '2h ago', status: 'Success' },
    { type: 'accessed', app: 'Vertex Analytics', time: '5h ago', status: 'Success' },
    { type: 'approved', app: 'User Action', time: '1d ago', status: 'Success' },
    { type: 'escrowed', app: 'System', time: '3d ago', status: 'Complete' }
  ];

  // Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('ASC');

  const columns = [
    { 
      header: 'Identifier', 
      accessor: 'id', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary/60" />
          <span className="font-mono text-xs text-muted-foreground">{row.id.slice(0, 12)}...</span>
        </div>
      )
    },
    { 
      header: 'Type', 
      accessor: 'data_type', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-sm">{row.data_type}</span>
        </div>
      )
    },
    { 
      header: 'Volume', 
      accessor: 'size', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <HardDrive className="h-3.5 w-3.5" />
          <span>{row.size || '32 KB'}</span>
        </div>
      )
    },
    { 
      header: 'Registered', 
      accessor: 'created_at', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {new Date(row.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )
    },
    { 
      header: 'Sensitivity', 
      accessor: 'sensitivity', 
      sortable: false, 
      render: (row) => {
        const s = getSensitivity(row.data_type);
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider px-2 py-0", s.color)}>
            {s.level}
          </Badge>
        );
      }
    },
    { 
      header: 'Security', 
      accessor: 'status', 
      sortable: true, 
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? "default" : "destructive"} className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          {row.status === 'ACTIVE' ? 'Escrowed' : 'Revoked'}
        </Badge>
      )
    },
    { 
      header: '', 
      accessor: 'actions', 
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary hover:bg-primary/10"
            onClick={() => { setSelectedRecord(row); setIsHistoryModalOpen(true); }}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      )
    }
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `http://localhost:5001/api/data/list?page=${page}&limit=${limit}&sortBy=${sortBy}&sortDir=${sortDir}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch vault data', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (key, direction) => {
    setSortBy(key);
    setSortDir(direction);
    setPage(1);
  };

  const downloadCSV = () => {
    const headers = ['Identifier', 'Type', 'Volume', 'Status', 'Registered Date'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
        [
          row.id, 
          row.data_type, 
          row.size || '32 KB', 
          row.status === 'ACTIVE' ? 'Escrowed' : 'Revoked', 
          new Date(row.created_at || Date.now()).toLocaleDateString()
        ].map(str => `"${str}"`).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'ZeroShare_DataVault_Export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredData = data.filter(row => {
    const query = searchQuery.toLowerCase();
    return (
      (row.id?.toLowerCase().includes(query)) ||
      (row.data_type?.toLowerCase().includes(query))
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
            <h1 className="text-3xl font-bold tracking-tight text-primary">Data Vault</h1>
            <p className="text-muted-foreground mt-1 text-sm">Cryptographically secured personal data escrow.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 bg-card" onClick={downloadCSV}>
               <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button className="gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              <Plus className="h-4 w-4" /> Register Data
            </Button>
          </div>
        </header>

        <Card className="flex flex-col border p-0 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-4 bg-muted/30">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search escrow records..." 
                className="pl-9 h-9 bg-background focus:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
               <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
                 <Filter className="h-3.5 w-3.5" />
                 Filter
               </Button>
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
      </motion.div>

      {/* Access History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-md bg-card border-primary/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl italic font-black uppercase tracking-tighter">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Access Audit Log
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Immutable history of cryptographic access events for this data point.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-6 font-sans">
             <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Target ID</span>
                   <span className="font-mono text-sm font-bold text-primary">{selectedRecord?.id.slice(0, 16)}...</span>
                </div>
                <div className="flex flex-col text-right">
                   <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Type</span>
                   <span className="text-sm font-bold">{selectedRecord?.data_type}</span>
                </div>
             </div>

             <div className="relative flex flex-col gap-8 pl-6 border-l-2 border-primary/20">
                {mockHistory.map((item, idx) => (
                   <div key={idx} className="relative">
                      <div className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                               {item.type === 'accessed' ? <ExternalLink className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                               {item.type}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                               <Clock className="h-3 w-3" />
                               {item.time}
                            </span>
                         </div>
                         <div className="text-sm font-semibold flex items-center justify-between">
                            <span>{item.app}</span>
                            <Badge variant="secondary" className="text-[9px] h-4 font-bold bg-muted/50 border-none text-muted-foreground">
                               {item.status}
                            </Badge>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataVault;
