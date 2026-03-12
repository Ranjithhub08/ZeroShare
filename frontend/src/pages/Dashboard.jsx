import React from 'react';
import DashboardCard from '../components/ui/DashboardCard';
import Button from '../components/ui/Button';
import { Database, FileCheck, ShieldAlert, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-header-title">Overview</h2>
          <p className="dashboard-header-desc">
            Welcome back, Ranjith. Here is your privacy summary.
          </p>
        </div>
        <Button variant="primary">
          <ArrowUpRight size={16} className="nav-link-icon mr-2" /> Generate Report
        </Button>
      </div>

      {/* Analytics Grid */}
      <div className="dashboard-grid">
        <DashboardCard>
          <div className="dashboard-card-header">
            <h3 className="card-stat-title">Total Stored Items</h3>
            <div className="card-stat-icon-wrapper accent">
              <Database size={20} color="var(--color-accent)" />
            </div>
          </div>
          <div className="card-stat-value-group">
            <span className="card-stat-value">124</span>
            <span className="card-stat-trend success">
              <ArrowUpRight size={14} className="mr-px-2"/> +12%
            </span>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="dashboard-card-header">
            <h3 className="card-stat-title">Active Requests</h3>
            <div className="card-stat-icon-wrapper warning">
              <FileCheck size={20} color="var(--color-warning)" />
            </div>
          </div>
          <div className="card-stat-value-group">
            <span className="card-stat-value">4</span>
            <span className="card-stat-trend danger">
              <ArrowDownRight size={14} className="mr-px-2"/> Action needed
            </span>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="dashboard-card-header">
            <h3 className="card-stat-title">Revoked Consents</h3>
            <div className="card-stat-icon-wrapper danger">
              <ShieldAlert size={20} color="var(--color-danger)" />
            </div>
          </div>
          <div className="card-stat-value-group">
            <span className="card-stat-value">18</span>
            <span className="text-tertiary text-xs">This month</span>
          </div>
        </DashboardCard>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content-grid">
        <DashboardCard title="Data Activity Trend">
          <div className="chart-placeholder">
            [Chart Area: Install Recharts/Chart.js]
          </div>
        </DashboardCard>

        <DashboardCard title="Recent Activity" action={<Button variant="ghost" size="sm">View All</Button>}>
          <div className="flex-col-gap-5 mt-2">
            {[
              { label: 'Consent granted to HealthApp', time: '2 mins ago', icon: FileCheck, colorClass: 'success' },
              { label: 'FinTracker accessed Address Data', time: '1 hour ago', icon: Activity, colorClass: 'accent' },
              { label: 'Removed consent for MarketingTool', time: 'Yesterday', icon: ShieldAlert, colorClass: 'danger' },
            ].map((item, idx) => (
              <div key={idx} className="flex-start-gap-3">
                <div className={`activity-icon-wrapper border-${item.colorClass}`}>
                  <item.icon size={14} className={`text-${item.colorClass}`} />
                </div>
                <div>
                  <p className="text-sm text-primary">{item.label}</p>
                  <p className="text-xs text-tertiary mt-2">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default Dashboard;
