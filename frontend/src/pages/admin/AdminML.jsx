import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, ShieldAlert, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import api from '@/services/api';
import { cn } from '@/lib/utils';

const AdminML = () => {
  const [trends, setTrends] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [trendRes, healthRes] = await Promise.all([
          api.get('/ml/risk-trends'),
          api.get('/ml/health'),
        ]);
        setTrends(trendRes.data.data || []);
        setHealth(healthRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ML Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">System-wide risk signals, model status, and consent patterns.</p>
      </div>

      {/* ML Service Status */}
      <Card className="p-5 border border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit size={18} className="text-rose-400" />
          <h2 className="font-semibold">ML Service Status</h2>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Status', value: health.status === 'ok' ? '✅ Online' : '❌ Offline' },
              { label: 'Confidence Mode', value: health.confidence_mode },
              { label: 'ML Samples', value: health.ml_samples ?? 0 },
              { label: 'Model Loaded', value: health.ml_model_loaded ? 'Yes' : 'No (rule-based)' },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="font-semibold text-sm">{s.value}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-rose-400">ML service offline</p>}
      </Card>

      {/* Risk Trends */}
      <Card className="p-5 border border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={18} className="text-rose-400" />
          <h2 className="font-semibold">App Risk Trends (Most Denied)</h2>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : trends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trend data yet — needs 2+ consents per app.</p>
        ) : (
          <div className="space-y-4">
            {trends.map((t, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{t.app_name}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{t.total} requests</span>
                    <span className={t.denial_rate >= 50 ? 'text-rose-400 font-semibold' : 'text-amber-400'}>{t.denial_rate}% denied</span>
                    <span className={cn('capitalize font-medium', t.max_risk === 'high' ? 'text-rose-400' : t.max_risk === 'medium' ? 'text-amber-400' : 'text-emerald-400')}>
                      {t.max_risk} risk
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${t.denial_rate >= 50 ? 'bg-rose-500' : t.denial_rate >= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${t.denial_rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default AdminML;
