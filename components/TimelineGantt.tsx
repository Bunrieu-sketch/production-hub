'use client';

import { useEffect, useRef } from 'react';
// frappe-gantt CSS loaded via style export — no direct CSS import needed

export interface FrappeTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
  custom_class?: string;
}

type ViewMode = 'Day' | 'Week' | 'Month';

export default function TimelineGantt({ tasks, viewMode }: { tasks: FrappeTask[]; viewMode: ViewMode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;
    container.innerHTML = '';

    if (!tasks.length) return;

    (async () => {
      const mod = await import('frappe-gantt');
      const Gantt = (mod as { default: unknown }).default || mod;
      if (!mounted) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (Gantt as any)(container, tasks, {
        view_mode: viewMode,
        bar_height: 20,
        padding: 18,
        date_format: 'YYYY-MM-DD',
        view_modes: ['Day', 'Week', 'Month'],
        popup_trigger: 'click',
      });
    })();

    return () => {
      mounted = false;
      if (container) container.innerHTML = '';
    };
  }, [tasks, viewMode]);

  return <div ref={containerRef} className="gantt-target" />;
}
