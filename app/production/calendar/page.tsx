'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import type { DatesSetArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

// FullCalendar v6 bundles CSS into JS — no separate CSS imports needed

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

const LEGEND = [
  { key: 'preprod', label: 'Preprod', color: '#58a6ff' },
  { key: 'shoot', label: 'Shoot', color: '#a371f7' },
  { key: 'post', label: 'Post', color: '#d29922' },
  { key: 'publish', label: 'Publish', color: '#3fb950' },
  { key: 'sponsor', label: 'Sponsor', color: '#58a6ff' },
  { key: 'milestone', label: 'Milestone', color: '#f85149' },
];

export default function CalendarPage() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);

  const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, listPlugin], []);

  useEffect(() => {
    if (!range) return;
    const controller = new AbortController();
    const url = `/api/calendar?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`;
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(setEvents)
      .catch(err => {
        if (err?.name !== 'AbortError') console.error(err);
      });
    return () => controller.abort();
  }, [range]);

  const handleDatesSet = (info: DatesSetArg) => {
    setRange({ start: info.startStr, end: info.endStr });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Calendar</h1>
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
