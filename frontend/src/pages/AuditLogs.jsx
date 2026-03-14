import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Activity, 
  Clock, 
  Server, 
  Monitor, 
  ShieldCheck,
  Search,
  Download,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const AuditLogs = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortDir, setSortDir] = useState('DESC');
  
  const columns = [
    { 
      header: 'Event', 
      accessor: 'event_type', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-4 w-1 rounded-full",
            row.status === 'SUCCESS' ? "bg-emerald-500" : "bg-rose-500"
          )} />
          <span className="font-semibold text-sm">{row.event_type}</span>
        </div>
      )
    },
    { 
      header: 'Resource', 
      accessor: 'app_name', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Server className="h-3.5 w-3.5" />
          <span>{row.app_name || 'Global Shared System'}</span>
        </div>
      )
    },
    { 
      header: 'Identity Context', 
      accessor: 'data_accessed', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Monitor className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{row.data_accessed || 'Anonymous Access'}</span>
        </div>
      )
    },
    { 
      header: 'Timestamp', 
      accessor: 'timestamp', 
      sortable: true, 
      render: (row) => (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {new Date(row.timestamp).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      )
    },
    { 
      header: 'Verification', 
      accessor: 'status', 
      sortable: true, 
      render: (row) => (
        <Badge 
          variant={row.status === 'SUCCESS' ? "outline" : "destructive"} 
          className={cn(
            "gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
            row.status === 'SUCCESS' && "border-emerald-500/50 text-emerald-500 bg-emerald-500/5"
          )}
        >
          {row.status === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {row.status}
        </Badge>
      )
    },
  ];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = `http://localhost:5001/api/audit/logs?page=${page}&limit=${limit}&sortBy=${sortBy}&sortDir=${sortDir}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTotal(json.count);
        setTotalPages(json.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortDir]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSort = (key, direction) => {
    setSortBy(key);
    setSortDir(direction);
    setPage(1);
  };

  const downloadCSV = () => {
    const headers = ['Event', 'Resource', 'Identity Context', 'Verification', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
        [
          row.event_type, 
          row.app_name || 'Global Shared System', 
          row.data_accessed || 'Anonymous Access', 
          row.status, 
          new Date(row.timestamp).toLocaleString()
        ].map(str => `"${str}"`).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'ZeroShare_Audit_Ledger.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredData = data.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      (log.event_type?.toLowerCase().includes(query)) ||
      (log.app_name?.toLowerCase().includes(query)) ||
      (log.data_accessed?.toLowerCase().includes(query))
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
            <h1 className="text-3xl font-bold tracking-tight text-primary">Audit Log</h1>
            <p className="text-muted-foreground mt-1 text-sm">Cryptographically verifiable immutable event ledger.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 bg-card" onClick={downloadCSV}>
              <Download className="h-4 w-4" /> Download Ledger
            </Button>
            <Button className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Verify Integrity
            </Button>
          </div>
        </header>

        <Card className="flex flex-col border p-0 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-4 bg-muted/30">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter audit events..." 
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
      </motion.div>
    </div>
  );
};

export default AuditLogs;
