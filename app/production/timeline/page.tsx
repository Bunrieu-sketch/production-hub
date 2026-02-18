'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GanttTask {
  id: string; text: string; start_date: string; end_date: string;
  type: string; parent?: string; color?: string;
}

interface MilestoneItem {
  id: number; series_id: number; title: string; due_date: string; completed: number;
}

interface TimelineData {
  tasks: GanttTask[];
  milestones: MilestoneItem[];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(date: Date, zoom: 'day' | 'week' | 'month') {
  if (zoom === 'day') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (zoom === 'week') return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('en-US', { month: 'short' })}`;
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineData>({ tasks: [], milestones: [] });
  const [zoom, setZoom] = useState<'day' | 'week' | 'month'>('week');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetch('/api/timeline').then(r => r.json()).then(setData);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysPerUnit = zoom === 'day' ? 1 : zoom === 'week' ? 7 : 30;
  const visibleUnits = zoom === 'day' ? 30 : zoom === 'week' ? 16 : 12;
  const totalDays = visibleUnits * daysPerUnit;

  const viewStart = addDays(today, offset - Math.floor(totalDays * 0.2));
  const viewEnd = addDays(viewStart, totalDays);

  const ROW_HEIGHT = 32;
  const HEADER_HEIGHT = 44;
  const LABEL_WIDTH = 220;
  const CHART_WIDTH = 900;
  const dayWidth = CHART_WIDTH / totalDays;

  function dateToX(date: Date): number {
    return (date.getTime() - viewStart.getTime()) / 86400000 * dayWidth;
  }

  const parentTasks = data.tasks.filter(t => t.type === 'project');
  const childTasks = data.tasks.filter(t => t.type === 'task');

  const rows: Array<{ task: GanttTask; indent: number }> = [];
  for (const parent of parentTasks) {
    rows.push({ task: parent, indent: 0 });
    const children = childTasks.filter(c => c.parent === parent.id);
    for (const child of children) rows.push({ task: child, indent: 1 });
  }

  const axisLabels: Array<{ label: string; x: number }> = [];
  let cursor = new Date(viewStart);
  while (cursor <= viewEnd) {
    axisLabels.push({ label: formatDateLabel(cursor, zoom), x: dateToX(cursor) });
    if (zoom === 'day') cursor = addDays(cursor, 1);
    else if (zoom === 'week') cursor = addDays(cursor, 7);
    else cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const todayX = dateToX(today);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Timeline</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['day', 'week', 'month'] as const).map(z => (
              <button key={z} className={`btn ${zoom === z ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '5px 10px', fontSize: 12 }}
                onClick={() => setZoom(z)}>
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={() => setOffset(o => o - 30)}>
            <ChevronLeft size={14} />
          </button>
          <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setOffset(0)}>Today</button>
          <button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={() => setOffset(o => o + 30)}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {!rows.length ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-dim)' }}>
          <p>No series with shoot dates found.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Add shoot dates to series to see them in the timeline.</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div style={{ display: 'flex', minWidth: LABEL_WIDTH + CHART_WIDTH }}>
            {/* Left label panel */}
            <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
              <div style={{ height: HEADER_HEIGHT, borderBottom: '1px solid var(--border)', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                <span className="section-label">Series / Episode</span>
              </div>
              {rows.map((row) => (
                <div key={row.task.id} style={{
                  height: ROW_HEIGHT, display: 'flex', alignItems: 'center',
                  paddingLeft: row.indent ? 24 : 12,
                  borderBottom: '1px solid var(--border)',
                  fontSize: row.indent ? 11 : 12,
                  fontWeight: row.indent ? 400 : 600,
                  color: row.indent ? 'var(--text-dim)' : 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.indent ? '└ ' : ''}{row.task.text}
                </div>
              ))}
            </div>

            {/* Right chart panel */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* Time axis */}
              <div style={{ height: HEADER_HEIGHT, borderBottom: '1px solid var(--border)', position: 'relative', background: 'var(--card)' }}>
                {axisLabels.map((label, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: label.x, top: 0, height: '100%',
                    display: 'flex', alignItems: 'center', paddingLeft: 6,
                    fontSize: 11, color: 'var(--text-dim)',
                    borderLeft: '1px solid var(--border)',
                  }}>
                    {label.label}
                  </div>
                ))}
              </div>

              {/* Grid + bars */}
              <div style={{ position: 'relative' }}>
                {axisLabels.map((label, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: label.x, top: 0, bottom: 0, width: 1,
                    background: 'var(--border)', opacity: 0.5,
                  }} />
                ))}

                {/* Today line */}
                {todayX >= 0 && todayX <= CHART_WIDTH && (
                  <div style={{
                    position: 'absolute', left: todayX, top: 0, bottom: 0, width: 1,
                    background: 'var(--red)', zIndex: 10,
                  }} />
                )}

                {rows.map((row) => {
                  const start = new Date(row.task.start_date);
                  const end = new Date(row.task.end_date);
                  const x = Math.max(0, dateToX(start));
                  const x2 = Math.min(CHART_WIDTH, dateToX(end));
                  const width = Math.max(4, x2 - x);
                  const color = row.task.color || '#8b949e';

                  return (
                    <div key={row.task.id} style={{ height: ROW_HEIGHT, position: 'relative', borderBottom: '1px solid var(--border)' }}>
                      <div style={{
                        position: 'absolute', left: x, top: 6,
                        height: ROW_HEIGHT - 12, width,
                        background: color, borderRadius: 4,
                        opacity: row.indent ? 0.7 : 0.85,
                        display: 'flex', alignItems: 'center',
                        paddingLeft: 6, overflow: 'hidden',
                        fontSize: 10, color: 'white', fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {width > 60 ? row.task.text : ''}
                      </div>
                    </div>
                  );
                })}

                {data.milestones.map(m => {
                  const x = dateToX(new Date(m.due_date));
                  if (x < 0 || x > CHART_WIDTH) return null;
                  return (
                    <div key={m.id} title={m.title} style={{
                      position: 'absolute', left: x - 5, top: 2,
                      width: 10, height: 10,
                      background: m.completed ? 'var(--green)' : 'var(--orange)',
                      borderRadius: 2, transform: 'rotate(45deg)', zIndex: 5,
                    }} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
