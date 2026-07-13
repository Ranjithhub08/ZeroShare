import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
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
  Download,
  History,
  ShieldAlert,
  Clock,
  ExternalLink,
  ShieldCheck,
  Loader2,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import api from '@/services/api';

const DataVault = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Add Data Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDataType, setNewDataType] = useState('');
  const [newDataValue, setNewDataValue] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  const DATA_TYPE_OPTIONS = [
    'Resume', 'Email', 'Phone Number', 'Address', 'ID Proof',
    'Passport', 'Financial Record', 'Medical Record', 'Social Media', 'Other'
  ];

  // Helper to get sensitivity classification
  const getSensitivity = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('id') || t.includes('proof') || t.includes('passport') || t.includes('medical')) {
      return { level: 'High', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    }
    if (t.includes('email') || t.includes('resume') || t.includes('cv') || t.includes('financial') || t.includes('phone')) {
      return { level: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    }
    return { level: 'Low', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  // Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('DESC');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/data', {
        params: { page, limit, sortBy, sortDir }
      });
      if (res.data.success) {
        setData(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this record?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/data/${id}`);
      // Remove from local state immediately for snappy UX, then refresh
      setData(prev => prev.filter(row => row.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete data:', err);
      alert('Failed to delete record. Please try again.');
      fetchData(); // Re-sync on error
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddData = async (e) => {
    e.preventDefault();
    if (!newDataType || !newDataValue.trim()) {
      setAddError('Both data type and value are required.');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      await api.post('/data', { data_type: newDataType, value: newDataValue.trim() });
      setIsAddModalOpen(false);
      setNewDataType('');
      setNewDataValue('');
      setPage(1);
      fetchData();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add data. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Type', 'Status', 'Registered Date'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row =>
        [
          row.id,
          row.data_type,
          'ACTIVE',
          new Date(row.created_at || Date.now()).toLocaleDateString()
        ].map(str => `"${str}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ZeroShare_DataVault_Export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = data.filter(row => {
    const query = searchQuery.toLowerCase();
    return (
      String(row.id).toLowerCase().includes(query) ||
      (row.data_type?.toLowerCase().includes(query))
    );
  });

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary/60" />
          <span className="font-mono text-xs text-muted-foreground">#{String(row.id).padStart(6, '0')}</span>
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
      header: 'Preview',
      accessor: 'value',
      sortable: false,
      render: (row) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.value ? `${row.value.substring(0, 20)}${row.value.length > 20 ? '…' : ''}` : '—'}
        </span>
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
      sortable: false,
      render: () => (
        <Badge variant="default" className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Escrowed
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(row.id)}
            disabled={deletingId === row.id}
          >
            {deletingId === row.id
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Trash2 className="h-4 w-4" />
            }
          </Button>
        </div>
      )
    }
  ];

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
            <p className="text-muted-foreground mt-1 text-sm">
              Your cryptographically secured personal data escrow. {total > 0 && `${total} record${total !== 1 ? 's' : ''} stored.`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 bg-card" onClick={downloadCSV} disabled={filteredData.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button
              className="gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              onClick={() => { setIsAddModalOpen(true); setAddError(''); setNewDataType(''); setNewDataValue(''); }}
            >
              <Plus className="h-4 w-4" /> Add Data
            </Button>
          </div>
        </header>

        <Card className="flex flex-col border p-0 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-4 bg-muted/30">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by type or ID..."
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

      {/* Add Data Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-card border-primary/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Add Data to Vault
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Securely store a new data record. Only you can access it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddData} className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-type">Data Type</Label>
              <select
                id="data-type"
                value={newDataType}
                onChange={(e) => setNewDataType(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-foreground"
              >
                <option value="">Select a data type...</option>
                {DATA_TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="data-value">Value</Label>
              <textarea
                id="data-value"
                value={newDataValue}
                onChange={(e) => setNewDataValue(e.target.value)}
                required
                placeholder="Enter the data value to securely store..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {addError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {addError}
              </p>
            )}

            <DialogFooter className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={addLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading || !newDataType || !newDataValue.trim()}>
                {addLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Storing...</> : 'Store Securely'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Access History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-md bg-card border-primary/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl italic font-black uppercase tracking-tighter">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Access Audit Log
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Access history for this data record.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-6 font-sans">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Record ID</span>
                <span className="font-mono text-sm font-bold text-primary">#{String(selectedRecord?.id || '').padStart(6, '0')}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Type</span>
                <span className="text-sm font-bold">{selectedRecord?.data_type}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 py-8 text-zinc-500">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-sm text-center">Access log is recorded when this data<br/>is shared via a consent grant.</p>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                No access events yet
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataVault;
