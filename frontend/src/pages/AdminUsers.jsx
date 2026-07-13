import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Users, Shield, User, Loader2, Trash2, AlertTriangle, Mail, Calendar, Clock, Database, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // User detail modal
  const [viewUser, setViewUser] = useState(null);
  const [userRecords, setUserRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const openUserDetail = async (u) => {
    setViewUser(u);
    setUserRecords([]);
    setRecordsLoading(true);
    try {
      const res = await api.get(`/user/${u.id}/records`);
      if (res.data.success) setUserRecords(res.data.data);
    } catch (err) {
      console.error('Failed to fetch user records', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState(null); // holds user object to delete

  const fetchUsers = async () => {
    try {
      const res = await api.get('/user/all');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setTogglingId(id);
    try {
      await api.put(`/user/${id}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.delete(`/user/${confirmDelete.id}`);
      setUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Manage roles and accounts across the platform.</p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-sm px-3 py-1">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Consents</th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data Records</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer group w-fit"
                        onClick={() => openUserDetail(u)}
                        title="Click to view user details"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary/30 transition-colors">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-zinc-200 group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">
                          {u.name}
                          {isSelf && <span className="ml-2 text-[10px] text-primary font-bold uppercase tracking-wider">(you)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider gap-1",
                          u.role === 'admin'
                            ? "border-primary/30 text-primary bg-primary/10"
                            : "border-zinc-700 text-zinc-400 bg-white/5"
                        )}
                      >
                        {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-zinc-300">{u.consent_count}</td>
                    <td className="px-6 py-4 text-center font-mono text-zinc-300">{u.data_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10"
                          onClick={() => toggleRole(u.id, u.role)}
                          disabled={togglingId === u.id || isSelf}
                          title={isSelf ? "You can't change your own role" : ''}
                        >
                          {togglingId === u.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : `Make ${u.role === 'admin' ? 'User' : 'Admin'}`
                          }
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDelete(u)}
                          disabled={isSelf}
                          title={isSelf ? "You can't delete your own account" : `Delete ${u.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* User Detail Modal */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent className="max-w-md bg-card border-primary/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <User className="h-5 w-5 text-primary" />
              User Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Account information for this user.
            </DialogDescription>
          </DialogHeader>

          {viewUser && (
            <div className="flex flex-col gap-4 py-2">

              {/* Avatar + name */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="h-14 w-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-black text-2xl">
                  {viewUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{viewUser.name}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1 text-[10px] font-bold uppercase tracking-wider gap-1",
                      viewUser.role === 'admin'
                        ? "border-primary/30 text-primary bg-primary/10"
                        : "border-zinc-700 text-zinc-400 bg-white/5"
                    )}
                  >
                    {viewUser.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {viewUser.role}
                  </Badge>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-white/5">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email</span>
                    <span className="text-sm font-medium text-zinc-200">{viewUser.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-white/5">
                    <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Joined</span>
                      <span className="text-xs font-medium text-zinc-200">
                        {new Date(viewUser.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(viewUser.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-white/5">
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Last Updated</span>
                      <span className="text-xs font-medium text-zinc-200">
                        {new Date(viewUser.updated_at || viewUser.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(viewUser.updated_at || viewUser.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-white/5">
                    <FileCheck className="h-4 w-4 text-blue-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Consents</span>
                      <span className="text-lg font-bold text-white font-mono">{viewUser.consent_count}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-white/5">
                    <Database className="h-4 w-4 text-purple-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Data Records</span>
                      <span className="text-lg font-bold text-white font-mono">{viewUser.data_count}</span>
                    </div>
                  </div>
                </div>

                {/* Stored Records list */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <Database className="h-3 w-3" /> Stored Data Types
                  </span>

                  {recordsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : userRecords.length === 0 ? (
                    <div className="p-4 rounded-xl bg-muted/20 border border-white/5 text-center">
                      <p className="text-xs text-zinc-500">No data stored yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {userRecords.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary/60" />
                            <span className="text-sm font-medium text-zinc-200">{rec.data_type}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(rec.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-mono">
                              {new Date(rec.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-md bg-card border-destructive/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="text-sm text-zinc-300">
                You are about to permanently delete the account for:
              </p>
              <p className="mt-2 font-bold text-white">{confirmDelete?.name}</p>
              <p className="text-sm text-zinc-400">{confirmDelete?.email}</p>
            </div>
            <p className="text-xs text-zinc-500">
              All their data records, consents, and audit logs will also be deleted due to cascading rules.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!!deletingId}
            >
              {deletingId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminUsers;
