import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import ProfileCard from '../components/ui/ProfileCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Bell,
  Lock,
  Smartphone,
  ShieldAlert,
  ChevronRight,
  LogOut,
  Eye,
  EyeOff,
  FileText,
  Download,
  Monitor,
  Trash2,
  AlertTriangle,
  Package,
  Loader2,
} from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Change password modal
  const [reportLoading, setReportLoading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwData, setPwData] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState({
    consent_requests: true,
    data_access: true,
    system_alerts: false
  });

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);

  // Export & Delete
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Sessions
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/user/profile');
      if (res.data.success) {
        setProfile(res.data.data);
        setTwoFAEnabled(!!res.data.data.two_fa_enabled);
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async (val) => {
    setTwoFALoading(true);
    try {
      await api.post('/auth/2fa/toggle', { enable: val });
      setTwoFAEnabled(val);
    } catch (err) {
      console.error('2FA toggle error', err);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleOpenSessions = async () => {
    setSessionsOpen(true);
    setSessionsLoading(true);
    try {
      const res = await api.get('/auth/sessions');
      if (res.data.success) {
        setSessions(res.data.data);
        setCurrentSessionId(res.data.currentSessionId);
      }
    } catch (err) {
      console.error('Sessions fetch error', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Revoke session error', err);
    }
  };

  const handleRevokeAll = async () => {
    try {
      await api.delete('/auth/sessions/all');
      // Reload sessions — only current should remain
      const res = await api.get('/auth/sessions');
      if (res.data.success) setSessions(res.data.data);
    } catch (err) {
      console.error('Revoke all error', err);
    }
  };

  function parseDevice(ua) {
    if (!ua || ua === 'unknown') return 'Unknown Device';
    if (/mobile/i.test(ua)) {
      if (/iphone/i.test(ua)) return 'iPhone';
      if (/android/i.test(ua)) return 'Android';
      return 'Mobile';
    }
    if (/edg/i.test(ua)) return 'Edge';
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua)) return 'Safari';
    return 'Browser';
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const handleUpdateProfile = async (data) => {
    setSaveLoading(true);
    try {
      const res = await api.put('/user/profile', data);
      if (res.data.success) {
        setProfile(res.data.data);
      }
    } catch (error) {
      console.error('Update profile error', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleNotification = (key, val) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: val }));
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess(false);
    if (!pwData.newPw || pwData.newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwData.newPw !== pwData.confirm) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/user/password', { password: pwData.newPw });
      setPwSuccess(true);
      setPwData({ current: '', newPw: '', confirm: '' });
      setTimeout(() => { setPwOpen(false); setPwSuccess(false); }, 1500);
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    setReportLoading(true);
    try {
      const res = await api.get('/user/privacy-report', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'zeroshare-privacy-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const res = await api.get('/user/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'zeroshare-my-data.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== profile?.email) {
      setDeleteError('Email does not match. Please type your exact email.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete('/user/me');
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account.');
      setDeleteLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your account settings, privacy preferences, and security.</p>
        </div>
      </motion.header>

      <div className="grid gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <ProfileCard
            profile={profile}
            onUpdate={handleUpdateProfile}
            loading={saveLoading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="grid gap-8 md:grid-cols-2"
        >
          <Card className="border bg-card">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Notifications</CardTitle>
              </div>
              <CardDescription>Configure how you receive alerts and platform updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="consent_requests" className="text-sm font-semibold">Consent Requests</Label>
                  <p className="text-xs text-muted-foreground">New data permission requests from apps</p>
                </div>
                <Switch
                  id="consent_requests"
                  checked={notificationPrefs.consent_requests}
                  onCheckedChange={(val) => handleToggleNotification('consent_requests', val)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="data_access" className="text-sm font-semibold">Data Access Events</Label>
                  <p className="text-xs text-muted-foreground">Alerts when authorized apps access your data</p>
                </div>
                <Switch
                  id="data_access"
                  checked={notificationPrefs.data_access}
                  onCheckedChange={(val) => handleToggleNotification('data_access', val)}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="system_alerts" className="text-sm font-semibold">System Alerts</Label>
                  <p className="text-xs text-muted-foreground">Maintenance and critical security patches</p>
                </div>
                <Switch
                  id="system_alerts"
                  checked={notificationPrefs.system_alerts}
                  onCheckedChange={(val) => handleToggleNotification('system_alerts', val)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Security & Access</CardTitle>
              </div>
              <CardDescription>Manage password, MFA, and active sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between h-12 px-2 hover:bg-muted/50 group"
                onClick={() => { setPwOpen(true); setPwError(''); setPwSuccess(false); }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Change Password</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Update credential</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <div className="flex items-center justify-between h-12 px-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Two-Factor Auth</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {twoFAEnabled ? 'OTP email on login' : 'Extra security layer'}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={twoFAEnabled}
                  onCheckedChange={handleToggle2FA}
                  disabled={twoFALoading}
                />
              </div>

              <Button
                variant="ghost"
                className="w-full justify-between h-12 px-2 hover:bg-muted/50 group"
                onClick={handleOpenSessions}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Active Sessions</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Manage devices</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              {!isAdmin && (
                <Button
                  variant="ghost"
                  className="w-full justify-between h-12 px-2 hover:bg-muted/50 group"
                  onClick={handleDownloadReport}
                  disabled={reportLoading}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                      {reportLoading
                        ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        : <FileText className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold">Privacy Report</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Download PDF</span>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}

              {!isAdmin && (
                <Button
                  variant="ghost"
                  className="w-full justify-between h-12 px-2 hover:bg-muted/50 group"
                  onClick={handleExportData}
                  disabled={exportLoading}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                      {exportLoading
                        ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        : <Package className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold">Export My Data</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Download ZIP</span>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border border-destructive/30 bg-card">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                </div>
                <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="text-sm font-semibold">Delete Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently delete your account and all associated data. This cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0 ml-4"
                    onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); setDeleteError(''); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center pt-8 border-t"
        >
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out of ZeroShare
          </Button>
        </motion.div>
      </div>

      {/* Active Sessions Dialog */}
      <Dialog open={sessionsOpen} onOpenChange={setSessionsOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" /> Active Sessions
            </DialogTitle>
            <DialogDescription>Devices currently signed in to your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">No active sessions found.</p>
            ) : sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5">
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {parseDevice(s.user_agent)}
                      {s.id === currentSessionId && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-500">Current</Badge>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{s.ip_address} · Last active {timeAgo(s.last_used_at)}</p>
                  </div>
                </div>
                {s.id !== currentSessionId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    onClick={() => handleRevokeSession(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {sessions.filter(s => s.id !== currentSessionId).length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleRevokeAll} className="w-full sm:w-auto">
                Sign out all other devices
              </Button>
            )}
            <Button variant="outline" onClick={() => setSessionsOpen(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter a new password for your account. Min 8 characters.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={pwData.newPw}
                  onChange={e => setPwData(p => ({ ...p, newPw: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw(v => !v)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Confirm New Password</Label>
              <Input
                type={showPw ? 'text' : 'password'}
                value={pwData.confirm}
                onChange={e => setPwData(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Re-enter new password"
                className="bg-background"
              />
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-emerald-500">Password updated successfully!</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={pwLoading}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Updating...
                </div>
              ) : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              This will immediately delete your account, all consents, data records, audit logs, and notifications.
              <strong className="text-foreground"> This cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-medium">
                To confirm, type your email address: <span className="font-bold">{profile?.email}</span>
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Your email address</Label>
              <Input
                type="email"
                value={deleteConfirm}
                onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                placeholder={profile?.email}
                className="bg-background border-destructive/30 focus:border-destructive"
              />
            </div>
            {deleteError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {deleteError}
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); setDeleteError(''); }}
              disabled={deleteLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading || deleteConfirm !== profile?.email}
              className="w-full sm:w-auto"
            >
              {deleteLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </div>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
