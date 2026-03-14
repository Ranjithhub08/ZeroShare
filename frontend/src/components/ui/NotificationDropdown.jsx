import React from 'react';
import NotificationItem from './NotificationItem';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";

const NotificationDropdown = ({ notifications, onClose }) => {
  return (
    <Card className="w-80 shadow-2xl border bg-popover/95 backdrop-blur-xl">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold">Notifications</CardTitle>
        <button 
          className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider" 
          onClick={() => console.log('Mark all read')}
        >
          Mark all as read
        </button>
      </CardHeader>
      
      <CardContent className="p-0 max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-border">
            {notifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground font-medium">No new notifications</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-2 border-t bg-muted/30">
        <Button variant="ghost" size="sm" className="w-full h-8 text-xs font-semibold" onClick={onClose}>
          View Activity History
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationDropdown;
