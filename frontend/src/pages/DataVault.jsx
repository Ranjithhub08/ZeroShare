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
  X,
  FileText,
  FileImage,
  FileSpreadsheet,
  Upload,
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
import { useAuth } from '@/context/AuthContext';

const DataVault = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // View Data Modal State
  const [viewRecord, setViewRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Add Data Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTab, setAddTab] = useState('text'); // 'text' | 'file'
  const [newDataType, setNewDataType] = useState('');
  const [newDataValue, setNewDataValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
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

  const resetAddModal = () => {
    setNewDataType(''); setNewDataValue(''); setSelectedFile(null);
    setAddError(''); setAddTab('text');
  };

  const handleAddData = async (e) => {
    e.preventDefault();
    if (!newDataType) { setAddError('Please select a data type.'); return; }
    if (addTab === 'text' && !newDataValue.trim()) { setAddError('Value is required.'); return; }
    if (addTab === 'file' && !selectedFile) { setAddError('Please select a file.'); return; }
    setAddLoading(true); setAddError('');
    try {
      if (addTab === 'file') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('data_type', newDataType);
        await api.post('/data/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/data', { data_type: newDataType, value: newDataValue.trim() });
      }
      setIsAddModalOpen(false);
      resetAddModal();
      setPage(1);
      fetchData();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add data. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDownloadFile = async (row) => {
    try {
      const res = await api.get(`/data/${row.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = row.file_name || row.value;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch { alert('Download failed.'); }
  };

  const getMimeType = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    const map = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      txt: 'text/plain',
      csv: 'text/csv',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return map[ext] || 'application/octet-stream';
  };

  const handleViewFile = async (row) => {
    try {
      const res = await api.get(`/data/${row.id}/view`, { responseType: 'blob' });
      const mimeType = getMimeType(row.file_name);
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      window.open(blobUrl, '_blank');
    } catch { alert('Could not open file.'); }
  };

  const getFileIcon = (name) => {
    if (!name) return <FileText className="h-3.5 w-3.5" />;
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png','jpg','jpeg','webp'].includes(ext)) return <FileImage className="h-3.5 w-3.5 text-blue-400" />;
    if (['xls','xlsx','csv'].includes(ext)) return <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />;
    return <FileText className="h-3.5 w-3.5 text-amber-400" />;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async (format = 'json') => {
    setExportLoading(true);
    try {
      const res = await api.get(`/data/export?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `zeroshare-export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
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
    ...(isAdmin ? [{
      header: 'Owner',
      accessor: 'user_name',
      sortable: false,
      render: (row) => (
        <span className="text-sm text-zinc-300 font-medium">{row.user_name || '—'}</span>
      )
    }] : []),
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
        isAdmin
          ? <span className="text-xs font-mono text-amber-500/70 tracking-widest select-none">••••••••••••</span>
          : row.record_type === 'file'
            ? <div className="flex items-center gap-1.5">
                {getFileIcon(row.file_name)}
                <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={row.file_name}>
                  {row.file_name}
                </span>
                <span className="text-[10px] text-muted-foreground/50">{formatBytes(row.file_size)}</span>
              </div>
            : <span className="text-xs text-muted-foreground font-mono">
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
          {!isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
              onClick={() => { setViewRecord(row); setIsViewModalOpen(true); }}
              title="View record"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
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
              {isAdmin
                ? `Platform-wide data registry. ${total > 0 ? `${total} total records.` : ''} Values are encrypted and hidden from admin view.`
                : `Your cryptographically secured personal data escrow. ${total > 0 ? `${total} record${total !== 1 ? 's' : ''} stored.` : ''}`}
            </p>
          </div>
          <div className="flex gap-3">
            {!isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 bg-card" onClick={() => handleExport('json')} disabled={exportLoading || total === 0}>
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  JSON
                </Button>
                <Button variant="outline" className="gap-2 bg-card" onClick={() => handleExport('csv')} disabled={exportLoading || total === 0}>
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  CSV
                </Button>
              </div>
            )}
            {!isAdmin && (
              <Button
                className="gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                onClick={() => { setIsAddModalOpen(true); setAddError(''); setNewDataType(''); setNewDataValue(''); }}
              >
                <Plus className="h-4 w-4" /> Add Data
              </Button>
            )}
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

      {/* View Data Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-md bg-card border-primary/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Eye className="h-5 w-5 text-blue-400" />
              View Secured Data
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Your data is stored securely. Only you can view this.
            </DialogDescription>
          </DialogHeader>

          {viewRecord && (
            <div className="flex flex-col gap-4 py-2">
              {/* Meta row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Record ID</span>
                  <span className="font-mono text-sm font-bold text-primary">#{String(viewRecord.id).padStart(6, '0')}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Data Type</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold">{viewRecord.data_type}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Sensitivity</span>
                  <Badge variant="outline" className={cn("w-fit mt-0.5 font-bold text-[10px] uppercase tracking-wider px-2 py-0", getSensitivity(viewRecord.data_type).color)}>
                    {getSensitivity(viewRecord.data_type).level}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Added On</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">
                      {new Date(viewRecord.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Value or File */}
              {viewRecord.record_type === 'file' ? (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Stored File</span>
                  {/* Clickable file card */}
                  <button
                    type="button"
                    onClick={() => handleViewFile(viewRecord)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-colors text-left w-full group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {getFileIcon(viewRecord.file_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary group-hover:underline truncate">
                        {viewRecord.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatBytes(viewRecord.file_size)} · Click to open</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                  {/* Download button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full"
                    onClick={() => handleDownloadFile(viewRecord)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Stored Value</span>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 min-h-[80px]">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                      {viewRecord.value}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400 font-medium">This data is privately stored. No third party can access it without your explicit consent.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Data Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(v) => { setIsAddModalOpen(v); if (!v) resetAddModal(); }}>
        <DialogContent className="max-w-md bg-card border-primary/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Add Data to Vault
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Securely store a text record or upload a document/file.
            </DialogDescription>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-white/5">
            <button
              type="button"
              onClick={() => { setAddTab('text'); setAddError(''); }}
              className={cn('flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors', addTab === 'text' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
            >
              Text / Value
            </button>
            <button
              type="button"
              onClick={() => { setAddTab('file'); setAddError(''); }}
              className={cn('flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors', addTab === 'file' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
            >
              Upload File
            </button>
          </div>

          <form onSubmit={handleAddData} className="flex flex-col gap-5">
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

            {addTab === 'text' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="data-value">Value</Label>
                <textarea
                  id="data-value"
                  value={newDataValue}
                  onChange={(e) => setNewDataValue(e.target.value)}
                  placeholder="Enter the data value to securely store..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>File</Label>
                <label
                  htmlFor="vault-file-input"
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                    selectedFile ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30'
                  )}
                >
                  {selectedFile ? (
                    <>
                      {getFileIcon(selectedFile.name)}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline"
                        onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/50" />
                      <div className="text-center">
                        <p className="text-sm font-semibold">Click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, PNG, JPG</p>
                        <p className="text-xs text-muted-foreground">Max 10MB</p>
                      </div>
                    </>
                  )}
                  <input
                    id="vault-file-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }}
                  />
                </label>
              </div>
            )}

            {addError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {addError}
              </p>
            )}

            <DialogFooter className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsAddModalOpen(false); resetAddModal(); }} disabled={addLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading || !newDataType || (addTab === 'text' ? !newDataValue.trim() : !selectedFile)}>
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
