import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import { 
  Database, 
  ShieldAlert, 
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_data: 842.1, // thousands
    active_consents: 1245,
    revoked_consents: 38,
    total_access_events: 10482,
    consent_activity_over_time: [],
    data_type_distribution: [
      { type: 'Resume', count: 40, percentage: 40 },
      { type: 'Email', count: 25, percentage: 25 },
      { type: 'ID Proof', count: 20, percentage: 20 },
      { type: 'Other', count: 15, percentage: 15 }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState('7D');

  // Realistic Demo Data Generation
  const generateTrendData = (days) => {
    const data = [];
    const now = new Date();
    // Use the specific user-provided demo data for the 7D view
    const specific7DData = [3, 5, 4, 6, 2, 7, 5];
    
    for (let i = days; i > 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      let count = 0;
      if (days === 7) {
        count = specific7DData[7 - i];
      } else {
        // Generate relatively realistic slightly trending smooth random data for 30/90 days
        const base = Math.floor(Math.random() * 5) + 2;
        const trend = Math.floor(i / 10);
        count = base + trend;
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        count: count,
        auditCount: days === 7 ? [2, 4, 3, 5, 3, 6, 4][7 - i] : Math.floor(count * 0.8) // Mock audit events correlated to consent
      });
    }
    return data;
  };

  useEffect(() => {
    // Simulate network delay for premium feel
    const loadDemoData = () => {
      setTimeout(() => {
        setStats(prev => ({
          ...prev,
          consent_activity_over_time: generateTrendData(7)
        }));
        setLoading(false);
      }, 600);
    };

    loadDemoData();
  }, []);

  // Update chart when filter changes
  useEffect(() => {
    if (!loading) {
      let days = 7;
      if (chartFilter === '30D') days = 30;
      if (chartFilter === '90D') days = 90;
      
      setStats(prev => ({
        ...prev,
        consent_activity_over_time: generateTrendData(days)
      }));
    }
  }, [chartFilter]);

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

  const metrics = [
    {
      title: "Data Points Escrowed",
      value: stats.total_data + "k",
      trend: "+4.2%",
      icon: Database,
      description: "Total records secured",
      color: "text-blue-400",
      bgLight: "bg-blue-500/10",
      borderLight: "border-blue-500/20"
    },
    {
      title: "Active Safe-Shares",
      value: stats.active_consents,
      trend: "Live",
      icon: ShieldCheck,
      description: "Current active grants",
      color: "text-emerald-400",
      bgLight: "bg-emerald-500/10",
      borderLight: "border-emerald-500/20"
    },
    {
      title: "Revoked Access",
      value: stats.revoked_consents,
      trend: "Protected",
      icon: ShieldAlert,
      description: "Zero-Knowledge secured",
      color: "text-rose-400",
      bgLight: "bg-rose-500/10",
      borderLight: "border-rose-500/20"
    },
    {
      title: "Security Score",
      value: "98.4",
      trend: "A+",
      icon: Zap,
      description: "Compliance health",
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
            System Online
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Privacy Hub</h1>
          <p className="text-zinc-400 text-lg max-w-xl">Monitor your digital footprint and data sovereignty in real-time across the elite network.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md">
            Export Audit
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] group">
            New Consent <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </motion.header>

      {/* Bento Grid: Metrics */}
      <motion.div variants={itemVariants} className="bento-grid">
        {metrics.map((metric, idx) => (
          <motion.div 
            key={metric.title}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "glass-card p-6 flex flex-col justify-between relative overflow-hidden group",
              idx === 0 || idx === 3 ? "col-span-12 md:col-span-6 lg:col-span-3" : "col-span-12 md:col-span-6 lg:col-span-3"
            )}
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
              <div className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{metric.value}</div>
              <p className="text-xs text-zinc-500">{metric.description}</p>
            </div>

            {metric.title === "Security Score" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '98.4%' }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" 
                />
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Bento Grid: Analytics & Activity */}
      <motion.div variants={itemVariants} className="grid grid-cols-12 gap-6">
        
        {/* Main Chart */}
        <div className="col-span-12 lg:col-span-8 glass-card p-0 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Consent Requests Per Day
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </h2>
              <p className="text-sm text-zinc-400 mt-1">Activity over the last {chartFilter.replace('D', '')} days.</p>
            </div>
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button 
                onClick={() => setChartFilter('7D')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors", chartFilter === '7D' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white")}
              >7D</button>
              <button 
                onClick={() => setChartFilter('30D')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors", chartFilter === '30D' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white")}
              >30D</button>
              <button 
                onClick={() => setChartFilter('90D')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors", chartFilter === '90D' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white")}
              >90D</button>
            </div>
          </div>
          
          <div className="p-6 h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.consent_activity_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  activeDot={{ 
                    r: 6, 
                    fill: "#f8fafc", 
                    stroke: "#c084fc", 
                    strokeWidth: 3
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Distribution Donut */}
        <div className="col-span-12 lg:col-span-4 glass-card p-0 flex flex-col overflow-hidden group">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Data Type Distribution
              </h2>
              <p className="text-sm text-zinc-400 mt-1">Breakdown of vault categorization.</p>
            </div>
          </div>
          <div className="p-6 h-[400px] w-full flex items-center justify-center relative flex-col gap-6">
            {/* Ambient center glow - optimized without massive blur */}
            <div className="absolute inset-0 m-auto w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none transition-colors duration-700" />
            
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
                    formatter={(value) => [`${value}%`]}
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
                    className="drop-shadow-xl"
                  >
                    {stats.data_type_distribution.map((entry, index) => {
                      const colors = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f472b6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} className="hover:opacity-80 transition-opacity duration-300 outline-none" />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 w-full px-4">
              {stats.data_type_distribution.map((item, idx) => {
                const colors = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f472b6'];
                return (
                  <div key={item.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                      <span className="text-zinc-300">{item.type}</span>
                    </div>
                    <span className="font-semibold text-white">{item.percentage}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Activity Feed - Expanded below */}
        <div className="col-span-12 glass-card p-0 flex flex-col mt-4">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Audit Feed</h2>
              <p className="text-sm text-zinc-400 mt-1">Real-time governance events.</p>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Wrap the ActivityTimeline in a themed context if needed, or update its internal styles. Assuming ActivityTimeline relies on global CSS we cleaned up, we might need to adjust it later, but standard shadcn/tailwind should hold if it was refactored correctly */}
            <ActivityTimeline limit={6} />
          </div>
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <Button variant="ghost" className="w-full text-zinc-400 hover:text-white hover:bg-white/5">
              View Complete Audit Log <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
