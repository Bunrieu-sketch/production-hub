'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DatesSetArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

// FullCalendar v6 bundles CSS into JS — no separate CSS imports needed

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

const LEGEND = [
  { key: 'preprod', label: 'Preprod', color: '#58a6ff' },
  { key: 'shoot', label: 'Shoot', color: '#a371f7' },
  { key: 'post', label: 'Post', color: '#d29922' },
  { key: 'publish', label: 'Publish', color: '#3fb950' },
  { key: 'sponsor', label: 'Sponsor', color: '#58a6ff' },
  { key: 'milestone', label: 'Milestone', color: '#f85149' },
  { key: 'idea', label: 'Idea', color: '#8b949e' },
  { key: 'series', label: 'Series', color: '#30363d' },
];

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMsg, setSyncMsg] = useState('');

  const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, listPlugin], []);

  const fetchEvents = useCallback(async (start: string, end: string) => {
    try {
      const [localRes, teamupRes] = await Promise.all([
        fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`).then(r => r.json()),
        fetch(`/api/teamup/sync?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
          .then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setEvents([...localRes, ...teamupRes]);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

  useEffect(() => {
    if (!range) return;
    fetchEvents(range.start, range.end);
  }, [range, fetchEvents]);

  const handleDatesSet = (info: DatesSetArg) => {
    setRange({ start: info.startStr, end: info.endStr });
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    setSyncMsg('');
    try {
      const res = await fetch('/api/teamup/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncStatus('success');
      setSyncMsg(`${data.synced} events`);
      if (range) await fetchEvents(range.start, range.end);
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      setSyncStatus('error');
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Calendar</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {syncMsg && (
            <span style={{ fontSize: 11, color: syncStatus === 'error' ? '#f85149' : 'var(--text-dim)' }}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="btn btn-secondary"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontSize: 12,
              opacity: syncStatus === 'syncing' ? 0.6 : 1,
            }}
          >
            {syncStatus === 'syncing' ? <RefreshCw size={14} className="spin" /> :
             syncStatus === 'success' ? <Check size={14} /> :
             syncStatus === 'error' ? <AlertCircle size={14} /> :
             <RefreshCw size={14} />}
            {syncStatus === 'syncing' ? 'Syncing…' :
             syncStatus === 'success' ? 'Synced' :
             'Sync TeamUp'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {LEGEND.map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      <div style={{ background: 'transparent' }}>
        <FullCalendar
          plugins={plugins}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          height="auto"
          events={events}
          datesSet={handleDatesSet}
          dayMaxEventRows={4}
          expandRows
          nowIndicator
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }

        .fc {
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(255, 255, 255, 0.03);
          --fc-neutral-text-color: var(--text-dim);
          --fc-border-color: var(--border);
          --fc-today-bg-color: rgba(88, 166, 255, 0.12);
          --fc-list-event-hover-bg-color: rgba(88, 166, 255, 0.12);
          --fc-event-text-color: var(--text);
          color: var(--text);
        }

        .fc .fc-toolbar-title {
          color: var(--text);
          font-size: 18px;
          font-weight: 600;
        }

        .fc .fc-button {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          box-shadow: none;
          text-transform: capitalize;
        }

        .fc .fc-button:hover,
        .fc .fc-button:focus {
          background: rgba(88, 166, 255, 0.12);
          border-color: rgba(88, 166, 255, 0.6);
          color: var(--text);
        }

        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: rgba(88, 166, 255, 0.2);
          border-color: rgba(88, 166, 255, 0.8);
          color: var(--text);
        }

        .fc-theme-standard .fc-scrollgrid,
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: var(--border);
        }

        .fc .fc-daygrid-day,
        .fc .fc-timegrid-slot {
          background: transparent;
        }

        .fc .fc-col-header-cell-cushion,
        .fc .fc-daygrid-day-number {
          color: var(--text-dim);
        }

        .fc .fc-event,
        .fc .fc-event .fc-event-main {
          color: var(--text);
        }

        .fc .fc-list-event:hover td {
          background: rgba(88, 166, 255, 0.08);
        }
      `}</style>
    </div>
  );
}
