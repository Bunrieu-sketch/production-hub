'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: number;
  action: string;
  details: string | null;
  created_at: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadActivity() {
    try {
      const res = await fetch('/api/stats?type=activity');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setActivities(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Activity feed error:', err);
    }
  }

  function formatTime(isoDate: string) {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Today - show time
    if (diffDays === 0) {
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    // Yesterday
    if (diffDays === 1) return 'yesterday';
    // This week
    if (diffDays < 7) return `${diffDays}d ago`;
    // Older
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="activity-panel">
      <div className="activity-header">
        <h3>Live Activity</h3>
        <span className="live-indicator" title={`Updated: ${lastUpdate.toLocaleTimeString()}`}>●</span>
      </div>
      <div className="activity-list">
        {activities.length === 0 ? (
          <div className="activity-empty">No activity yet. Tasks will appear here as you work.</div>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-text">{activity.details || activity.action}</div>
              <div className="activity-time">{formatTime(activity.created_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
