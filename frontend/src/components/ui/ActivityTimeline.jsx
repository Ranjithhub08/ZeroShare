import React, { useState, useEffect } from 'react';
import ActivityItem from './ActivityItem';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityTimeline = ({ limit = 5 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/activity/recent');
        const result = await response.json();
        if (result.success) {
          setActivities(limit ? result.data.slice(0, limit) : result.data);
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [limit]);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4">
              <div className="h-7 w-7 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="flex flex-col relative">
          <AnimatePresence mode="popLayout">
            {activities.map((activity, idx) => (
              <motion.div
                key={activity.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <ActivityItem activity={activity} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-muted/20">
          <p className="text-muted-foreground text-sm font-medium">No recent activity detected</p>
          <p className="text-xs text-muted-foreground mt-1">Events will appear here as they occur.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;
