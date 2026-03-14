import React from 'react';
import { FileQuestion, FileCheck, Shield, ShieldAlert, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";

const ActivityItem = ({ activity }) => {
  const getIcon = () => {
    switch (activity.event_type) {
      case 'CONSENT_GRANTED':
        return <FileCheck className="h-3 w-3 text-emerald-500" />;
      case 'DATA_ACCESS':
      case 'Data Accessed':
        return <Shield className="h-3 w-3 text-primary" />;
      case 'CONSENT_DENIED':
      case 'CONSENT_REVOKED':
        return <ShieldAlert className="h-3 w-3 text-rose-500" />;
      default:
        return <FileQuestion className="h-3 w-3 text-amber-500" />;
    }
  };

  const getStatusColor = () => {
    switch (activity.event_type) {
      case 'CONSENT_GRANTED':
        return "bg-emerald-500/10 border-emerald-500/20";
      case 'DATA_ACCESS':
      case 'Data Accessed':
        return "bg-primary/10 border-primary/20";
      case 'CONSENT_DENIED':
      case 'CONSENT_REVOKED':
        return "bg-rose-500/10 border-rose-500/20";
      default:
        return "bg-amber-500/10 border-amber-500/20";
    }
  };

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex gap-4 relative pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border shadow-sm z-10",
          getStatusColor()
        )}>
          {getIcon()}
        </div>
        <div className="absolute top-7 bottom-0 w-[1px] bg-border last:hidden" />
      </div>
      
      <div className="flex flex-col gap-1 pt-0.5">
        <p className="text-sm leading-tight">
          <span className="font-medium text-foreground">{activity.description}</span>
          {activity.app_name && (
            <span className="text-muted-foreground ml-1">
              by <span className="font-semibold text-primary/80">{activity.app_name}</span>
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
          <Clock className="h-2.5 w-2.5" />
          {formatTimestamp(activity.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default ActivityItem;
