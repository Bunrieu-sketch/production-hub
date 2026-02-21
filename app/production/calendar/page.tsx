'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { DatesSetArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { RefreshCw, Check, AlertCircle, CalendarCheck } from 'lucide-react';

// FullCalendar v6 bundles CSS into JS — no separate CSS imports needed

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

const LEGEND = [
  { key: 'preprod', label: 'Preprod', color: '#58a6ff' },
  { key: 'shoot', label: 'Shoot', color: '#a371f7' },
  { key: 'post', label: 'Post', color: '#d29922' },
  { key: 'publish', label: 'Publish', color: '#3fb950' },
  { key: 'sponsor', label: 'Sponsor', color: '#58a6ff' },
  { key: 'milestone', label: 'Milestone', color: '#f85149' },
  { key: 'travel', label: 'Travel', color: '#f0883e' },
  { key: 'idea', label: 'Idea', color: '#8b949e' },
  { key: 'series', label: 'Series', color: '#30363d' },
  { key: 'teamup', label: 'TeamUp', color: '#3fb950' },
];

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export default function CalendarPage() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, listPlugin], []);

  // Fetch both local and TeamUp events
  const fetchEvents = useCallback(async (start: string, end: string) => {
    try {
      // Fetch local events
      const localPromise = fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`).then(r => r.json());
      
      // Fetch TeamUp events
      const teamupPromise = fetch(`/api/teamup/sync?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`).then(r => {
        if (!r.ok) return [];
        return r.json();
      }).catch(() => []);

      const [localEvents, teamupEvents] = await Promise.all([localPromise, teamupPromise]);
      
      setEvents([...localEvents, ...teamupEvents]);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

  useEffect(() => {
    if (!range) return;
    fetchEvents(range.start, range.end);
  }, [range, fetchEvents]);

  // Load last sync time from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('teamup_last_sync');
    if (saved) setLastSync(saved);
  }, []);

  const handleDatesSet = (info: DatesSetArg) => {
    setRange({ start: info.startStr, end: info.endStr });
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const response = await fetch('/api/teamup/sync', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncStatus('success');
      const now = new Date().toLocaleString();
      setLastSync(now);
      localStorage.setItem('teamup_last_sync', now);

      // Refresh events
      if (range) {
        await fetchEvents(range.start, range.end);
      }

      // Reset success status after 3 seconds
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Sync failed');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const getSyncButtonContent = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <>
            <RefreshCw size={16} className="spin" />
            <span>Syncing...</span>
          </>
        );
      case 'success':
        return (
          <>
            <Check size={16} />
            <span>Synced!</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle size={16} />
            <span>Failed</span>
          </>
        );
      default:
        return (
          <>
            <RefreshCw size={16} />
            <span>Sync from TeamUp</span>
          </>
        );
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarCheck size={24} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Calendar</h1>
          {lastSync && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Last sync: {lastSync}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {syncError && (
            <span style={{ fontSize: 12, color: '#f85149' }}>
              {syncError}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 13,
              opacity: syncStatus === 'syncing' ? 0.7 : 1,
            }}
          >
            {getSyncButtonContent()}
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

      <div style={{ 
        background: 'var(--card)', 
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
      }}>
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
          eventClick={(info) => {
            // Show event details if from TeamUp
            if (info.event.extendedProps?.source === 'teamup') {
              const props = info.event.extendedProps;
              const details = [
                props.location && `📍 ${props.location}`,
                props.description && `📝 ${props.description}`,
                props.calendarName && `📅 ${props.calendarName}`,
                props.syncedAt && `🔄 Synced: ${props.syncedAt}`,
              ].filter(Boolean).join('\n\n');
              
              if (details) {
                alert(`${info.event.title}\n\n${details}`);
              }
            }
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        
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
