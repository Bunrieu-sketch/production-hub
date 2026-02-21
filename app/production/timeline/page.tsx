'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { FrappeTask } from '@/components/TimelineGantt';

const GanttChart = dynamic(() => import('@/components/TimelineGantt'), { ssr: false });

type ViewMode = 'Day' | 'Week' | 'Month';

export default function TimelinePage() {
  const [tasks, setTasks] = useState<FrappeTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('Month');

  useEffect(() => {
    fetch('/api/gantt')
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Timeline</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['Day', 'Week', 'Month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              className={`btn ${viewMode === mode ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {!tasks.length ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-dim)' }}>
          <p>No episode phases found.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Add episode phases to see them in the timeline.</p>
        </div>
      ) : (
        <div className="gantt-container" style={{ flex: 1, overflow: 'auto' }}>
          <GanttChart tasks={tasks} viewMode={viewMode} />
        </div>
      )}
    </div>
  );
}
