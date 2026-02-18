'use client';

import { useEffect, useState } from 'react';
import { User, Calendar } from 'lucide-react';

interface Episode {
  id: number; title: string; stage: string; series_title: string;
  editor_name: string; shoot_date: string; publish_date: string;
  episode_type: string; hook: string;
}

const STAGES = [
  { key: 'idea', label: 'Idea', color: '#8b949e' },
  { key: 'outlined', label: 'Outlined', color: 'var(--blue)' },
  { key: 'confirmed', label: 'Confirmed', color: 'var(--blue)' },
  { key: 'filming', label: 'Filming', color: 'var(--accent)' },
  { key: 'editing', label: 'Editing', color: 'var(--green)' },
  { key: 'review', label: 'Review', color: 'var(--orange)' },
  { key: 'published', label: 'Published', color: 'var(--green)' },
];

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState('');
  const [seriesList, setSeriesList] = useState<Array<{ id: number; title: string }>>([]);

  const load = () => {
    const url = seriesFilter ? `/api/episodes?series_id=${seriesFilter}` : '/api/episodes';
    fetch(url).then(r => r.json()).then(setEpisodes);
  };

  useEffect(() => {
    fetch('/api/series').then(r => r.json()).then(setSeriesList);
  }, []);

  useEffect(() => { load(); }, [seriesFilter]);

  const handleDrop = async (stage: string) => {
    if (dragging === null) return;
    await fetch(`/api/episodes/${dragging}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    setEpisodes(prev => prev.map(e => e.id === dragging ? { ...e, stage } : e));
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Episodes</h1>
        <select value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All Series</option>
          {seriesList.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', flex: 1, paddingBottom: 16 }}>
        {STAGES.map(stage => {
          const stageEps = episodes.filter(e => e.stage === stage.key);
          const isOver = dragOver === stage.key;
          return (
            <div
              key={stage.key}
              className="kanban-col"
              style={{
                minWidth: 220, maxWidth: 260, flex: '0 0 240px',
                background: isOver ? 'rgba(163,113,247,0.05)' : 'var(--card)',
                borderColor: isOver ? 'var(--accent)' : 'var(--border)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage.key)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="status-dot" style={{ background: stage.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{stage.label.toUpperCase()}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: 'var(--border)', color: 'var(--text-dim)' }}>
                  {stageEps.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40 }}>
                {stageEps.map(ep => (
                  <div
                    key={ep.id}
                    draggable
                    onDragStart={() => setDragging(ep.id)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: 10, cursor: 'grab',
                      opacity: dragging === ep.id ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>{ep.title}</div>
                    {ep.hook && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {ep.hook}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {ep.series_title && (
                        <span style={{ fontSize: 10, color: 'var(--accent)' }}>{ep.series_title}</span>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {ep.editor_name && (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <User size={9} /> {ep.editor_name}
                          </span>
                        )}
                        {ep.publish_date && (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Calendar size={9} /> {formatDate(ep.publish_date)}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 8, alignSelf: 'flex-start',
                        fontWeight: 600,
                        color: ep.episode_type === 'cornerstone' ? 'var(--accent)' : 'var(--text-dim)',
                        background: ep.episode_type === 'cornerstone' ? 'rgba(163,113,247,0.1)' : 'rgba(139,148,158,0.05)',
                      }}>
                        {ep.episode_type === 'cornerstone' ? 'CORNERSTONE' : 'SECONDARY'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
