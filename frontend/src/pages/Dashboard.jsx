import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars -- used in JSX member expressions (motion.div etc)
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import {
  Database,
  ShieldAlert,
  TrendingUp,
  ShieldCheck,
  Activity,
  ArrowRight,
  Users,
  AlertCircle
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from "@/lib/utils";
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartFilter, setChartFilter] = useState('7D');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/analytics');
        if (res.data.success) {
          setStats(res.data.data);
        } else {
          setError('Failed to load dashboard data.');
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Could not connect to server. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Filter the time-series data client-side based on selected range
  const chartData = useMemo(() => {
    if (!stats?.consent_activity_over_time) return [];
    const all = stats.consent_activity_over_time;
    if (chartFilter === '7D') return all.slice(-7);
    if (chartFilter === '30D') return all.slice(-30);
    return all; // 90D — all available
  }, [stats, chartFilter]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold text-white">Dashboard Error</h2>
          <p className="text-zinc-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: isAdmin ? "Total Data Records" : "Your Data Records",
      value: stats.total_data,
      trend: isAdmin ? "System" : "Yours",
      icon: Database,
      description: isAdmin ? "All records across platform" : "Records in your vault",
      color: "text-blue-400",
      bgLight: "bg-blue-500/10",
      borderLight: "border-blue-500/20"
    },
    {
      title: isAdmin ? "Active Consents (All)" : "Your Active Safe-Shares",
      value: stats.active_consents,
      trend: "Live",
      icon: ShieldCheck,
      description: isAdmin ? "Active grants platform-wide" : "Current active grants",
      color: "text-emerald-400",
      bgLight: "bg-emerald-500/10",
      borderLight: "border-emerald-500/20"
    },
    {
      title: isAdmin ? "Revoked Consents (All)" : "Your Revoked Access",
      value: stats.revoked_consents,
      trend: "Protected",
      icon: ShieldAlert,
      description: isAdmin ? "Revoked across platform" : "Zero-Knowledge secured",
      color: "text-rose-400",
      bgLight: "bg-rose-500/10",
      borderLight: "border-rose-500/20"
    },
    {
      title: isAdmin ? "Total Access Events" : "Your Access Events",
      value: stats.total_access_events,
      trend: "Logged",
      icon: Activity,
      description: isAdmin ? "All audit events logged" : "Events in your audit log",
      color: "text-amber-400",
      bgLight: "bg-amber-500/10",
      borderLight: "border-amber-500/20"
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 120, damping: 14 }
    }
  };

  const distributionColors = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f472b6'];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8 p-10 max-w-[1600px] mx-auto w-full"
    >
      {/* Hero Header */}
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {isAdmin ? 'Admin Console' : 'System Online'}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
            {isAdmin ? 'Admin Dashboard' : 'Privacy Hub'}
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl">
            {isAdmin
              ? `System-wide overview. Welcome back, ${user?.name}.`
              : `Monitor your digital footprint and data sovereignty. Welcome back, ${user?.name}.`}
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md">
            Export Audit
          </Button>
          {!isAdmin && (
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] group">
              New Consent <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </div>
      </motion.header>

      {/* Bento Grid: Metrics */}
      <motion.div variants={itemVariants} className="bento-grid">
        {metrics.map((metric) => (
          <motion.div
            key={metric.title}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group col-span-12 md:col-span-6 lg:col-span-3"
          >
            {/* Background Glow */}
            <div className={cn("absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40", metric.bgLight)} />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className={cn("p-3 rounded-xl border backdrop-blur-xl", metric.bgLight, metric.borderLight)}>
                <metric.icon className={cn("h-5 w-5", metric.color)} />
              </div>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md",
                metric.trend === "Live" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 animate-pulse" : "border-white/10 text-zinc-300 bg-white/5"
              )}>
                {metric.trend}
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="text-zinc-400 text-sm font-medium mb-1">{metric.title}</h3>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                {metric.value.toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500">{metric.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-12 gap-6">

        {/* Main Chart */}
        <div className="col-span-12 lg:col-span-8 glass-card p-0 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Consent Activity
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {isAdmin ? 'Platform-wide' : 'Your'} consent requests over the last {chartFilter.replace('D', '')} days.
              </p>
            </div>
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              {['7D', '30D', '90D'].map(f => (
                <button
                  key={f}
                  onClick={() => setChartFilter(f)}
                  className={cn("px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors", chartFilter === f ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white")}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="p-6 h-[400px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 flex-col gap-3">
                <TrendingUp className="h-8 w-8 opacity-30" />
                <p className="text-sm">No consent activity in this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCountElite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis
                    dataKey="date"
                    stroke="#52525b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: 'rgba(9, 9, 11, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      color: '#fff',
                      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(168,85,247,0.15)',
                      padding: '12px 16px'
                    }}
                    itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '8px', fontSize: '13px' }}
                    formatter={(value) => [value, "Requests"]}
                  />
                  <Area
                    type="natural"
                    dataKey="count"
                    stroke="#c084fc"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorCountElite)"
                    animationDuration={2000}
                    animationEasing="ease-out"
                    activeDot={{ r: 6, fill: "#f8fafc", stroke: "#c084fc", strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Data Type Distribution Donut */}
        <div className="col-span-12 lg:col-span-4 glass-card p-0 flex flex-col overflow-hidden group">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h2 className="text-lg font-semibold text-white">Data Type Distribution</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {isAdmin ? 'Platform-wide' : 'Your'} vault categorization.
              </p>
            </div>
          </div>
          <div className="p-6 h-[400px] w-full flex items-center justify-center relative flex-col gap-6">
            <div className="absolute inset-0 m-auto w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none transition-colors duration-700" />

            {stats.data_type_distribution && stats.data_type_distribution.length > 0 ? (
              <>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(9, 9, 11, 0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '16px',
                          color: '#fff',
                          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)',
                          padding: '10px 14px'
                        }}
                        itemStyle={{ fontWeight: 600 }}
                        formatter={(value, name, props) => [`${props.payload.percentage || value}%`, props.payload.type]}
                      />
                      <Pie
                        data={stats.data_type_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="type"
                        animationDuration={2000}
                        animationEasing="ease-out"
                        stroke="none"
                      >
                        {stats.data_type_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={distributionColors[index % distributionColors.length]} className="hover:opacity-80 transition-opacity duration-300 outline-none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 w-full px-4">
                  {stats.data_type_distribution.map((item, idx) => (
                    <div key={item.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: distributionColors[idx % distributionColors.length] }} />
                        <span className="text-zinc-300">{item.type}</span>
                      </div>
                      <span className="font-semibold text-white">{item.percentage || item.count}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Database className="h-8 w-8 opacity-30" />
                <p className="text-sm text-center">No data in vault yet.<br/>Add data to see distribution.</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="col-span-12 glass-card p-0 flex flex-col mt-4">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Audit Feed</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {isAdmin ? 'Platform-wide governance events.' : 'Your recent governance events.'}
              </p>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <ActivityTimeline limit={6} />
          </div>
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <Button variant="ghost" className="w-full text-zinc-400 hover:text-white hover:bg-white/5">
              View Complete Audit Log <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Admin-only: User Breakdown Table */}
        {isAdmin && stats.user_breakdown && stats.user_breakdown.length > 0 && (
          <div className="col-span-12 glass-card p-0 flex flex-col mt-4">
            <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-white">User Breakdown</h2>
                <p className="text-sm text-zinc-400 mt-0.5">All registered users and their data summary.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Consents</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data Records</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.user_breakdown.map((u, idx) => (
                    <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-200">{u.name}</td>
                      <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            u.role === 'admin'
                              ? "border-primary/30 text-primary bg-primary/10"
                              : "border-zinc-700 text-zinc-400 bg-white/5"
                          )}
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-300">{u.consent_count}</td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-300">{u.data_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
