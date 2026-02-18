'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalEvent {
  id: string; date: string; title: string; type: string; color: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS: Record<string, string> = {
  shoot: 'var(--accent)',
  publish: 'var(--green)',
  deadline: 'var(--orange)',
  sponsor: 'var(--blue)',
  milestone: 'var(--red)',
};

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<CalEvent[]>([]);

  useEffect(() => {
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(setEvents);
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number | null; events: CalEvent[] }> = [];

  for (let i = 0; i < firstDay; i++) cells.push({ day: null, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date?.startsWith(dateStr));
    cells.push({ day: d, events: dayEvents });
  }

  const today = now.toISOString().split('T')[0];
  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Calendar</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={prevMonth}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 160, textAlign: 'center' }}>{monthName}</span>
          <button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={nextMonth}><ChevronRight size={14} /></button>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}>
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
        {DAYS_OF_WEEK.map(d => (
          <div key={d} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {cells.map((cell, i) => {
          const dateStr = cell.day ? `${year}-${month.toString().padStart(2, '0')}-${cell.day.toString().padStart(2, '0')}` : '';
          const isToday = dateStr === today;
          return (
            <div key={i} style={{
              background: cell.day ? 'var(--card)' : 'var(--bg)',
              minHeight: 90, padding: '6px 8px',
              opacity: cell.day ? 1 : 0.3,
            }}>
              {cell.day && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--accent)' : 'var(--text-dim)',
                    marginBottom: 4, width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: isToday ? 'rgba(163,113,247,0.2)' : 'transparent',
                  }}>
                    {cell.day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {cell.events.slice(0, 4).map(ev => (
                      <div key={ev.id} title={ev.title} style={{
                        fontSize: 10, padding: '1px 5px', borderRadius: 3,
                        background: ev.color + '22',
                        borderLeft: `2px solid ${ev.color}`,
                        color: ev.color,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}>
                        {ev.title}
                      </div>
                    ))}
                    {cell.events.length > 4 && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>+{cell.events.length - 4} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
