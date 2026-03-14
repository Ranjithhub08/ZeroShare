import React from 'react';
import { FileQuestion, FileCheck, Shield, ShieldAlert, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";

const NotificationItem = ({ notification }) => {
  const isUnread = notification.status === 'unread';

  const getIcon = () => {
    switch (notification.event_type) {
      case 'CONSENT_REQUEST':
        return <FileQuestion className="h-4 w-4 text-amber-500" />;
      case 'CONSENT_GRANTED':
        return <FileCheck className="h-4 w-4 text-emerald-500" />;
      case 'DATA_ACCESS':
        return <Shield className="h-4 w-4 text-primary" />;
      case 'CONSENT_REVOKED':
        return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "flex gap-3 p-3 transition-colors hover:bg-muted/50 group cursor-pointer relative",
      isUnread && "bg-primary/5 hover:bg-primary/10"
    )}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background group-hover:scale-110 transition-transform">
        {getIcon()}
      </div>
      <div className="flex flex-col gap-1 pr-4">
        <p className={cn(
          "text-xs leading-relaxed",
          isUnread ? "text-foreground font-semibold" : "text-muted-foreground"
        )}>
          {notification.message}
        </p>
        <p className="text-[10px] font-mono text-muted-foreground/70 uppercase">
          {formatTime(notification.timestamp)}
        </p>
      </div>
      {isUnread && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  );
};

export default NotificationItem;
