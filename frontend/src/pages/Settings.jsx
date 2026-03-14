import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProfileCard from '../components/ui/ProfileCard';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Bell, 
  Lock, 
  Smartphone, 
  ShieldAlert,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from "@/lib/utils";

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    consent_requests: true,
    data_access: true,
    system_alerts: false
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/user/profile');
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setNotificationPrefs(json.data.notification_preferences);
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (data) => {
    setSaveLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
      }
    } catch (error) {
      console.error('Update profile error', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleNotification = async (key, val) => {
    const updatedPrefs = { ...notificationPrefs, [key]: val };
    setNotificationPrefs(updatedPrefs);
    try {
      await fetch('http://localhost:5001/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPrefs)
      });
    } catch (error) {
      console.error('Update notifications error', error);
      // Revert on error
      setNotificationPrefs(notificationPrefs);
    }
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
                  checked={notificationPrefs?.consent_requests ?? true}
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
                  checked={notificationPrefs?.data_access ?? true}
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
                  checked={notificationPrefs?.system_alerts ?? false}
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
              <Button variant="ghost" className="w-full justify-between h-12 px-2 hover:bg-muted/50 group">
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

              <Button variant="ghost" className="w-full justify-between h-12 px-2 hover:bg-muted/50 group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Two-Factor Auth</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Enable MFA layer</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">Disabled</Badge>
              </Button>

              <Button variant="ghost" className="w-full justify-between h-12 px-2 hover:bg-muted/50 group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Active Sessions</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">3 active devices</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center pt-8 border-t"
        >
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10 gap-2">
            <LogOut className="h-4 w-4" />
            Sign out of ZeroShare
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
