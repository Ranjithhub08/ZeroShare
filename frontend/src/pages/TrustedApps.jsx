import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, AppWindow } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

const TrustedApps = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newApp, setNewApp] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/trusted-apps');
      setApps(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newApp.trim()) return;
    setAdding(true); setAddError('');
    try {
      await api.post('/user/trusted-apps', { app_name: newApp.trim() });
      setNewApp('');
      await load();
    } catch (e) {
      setAddError(e.response?.data?.error || 'App already trusted or failed to add.');
    } finally { setAdding(false); }
  };

  const remove = async (name) => {
    try {
      await api.delete(`/user/trusted-apps/${encodeURIComponent(name)}`);
      setApps(a => a.filter(x => x.app_name !== name));
    } catch (e) { console.error(e); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-primary" size={28} /> Trusted Apps
        </h1>
        <p className="text-muted-foreground mt-1">
          Apps you've marked as trusted — you'll see a trust badge when they request consent.
        </p>
      </div>

      <Card className="p-5 border border-border bg-card">
        <p className="text-sm font-medium mb-3">Add a trusted app</p>
        <div className="flex gap-2">
          <Input
            placeholder="App name (e.g. Google Drive)"
            value={newApp}
            onChange={e => setNewApp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <Button onClick={add} disabled={adding || !newApp.trim()} className="gap-1.5 shrink-0">
            <Plus size={14} /> Add
          </Button>
        </div>
        {addError && <p className="text-xs text-rose-400 mt-2">{addError}</p>}
      </Card>

      <Card className="border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">{apps.length} trusted app{apps.length !== 1 ? 's' : ''}</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : apps.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck size={36} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No trusted apps yet. Add apps you regularly use and trust.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apps.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <AppWindow size={14} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.app_name}</p>
                  <p className="text-xs text-muted-foreground">Added {new Date(a.added_at).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="ghost"
                  className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={() => remove(a.app_name)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default TrustedApps;
