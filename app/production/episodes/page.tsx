'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Camera, Link as LinkIcon } from 'lucide-react';
import EditEpisodeModal from '@/components/production/EditEpisodeModal';

interface Episode {
  id: number;
  title: string;
  stage: string;
  series_title: string;
  editor_name: string;
  shoot_date: string;
  publish_date: string;
  actual_publish_date: string;
  episode_type: string;
  hook: string;
  youtube_url: string;
  view_count: number;
  thumbnail_url: string;
  sponsor_name: string;
  series_id: number;
  country: string;
  region: string;
}

const STAGES = [
  { key: 'idea', label: 'Idea', color: '#8b949e', pill: 'rgba(139,148,158,0.16)' },
  { key: 'outlined', label: 'Outlined', color: 'var(--blue)', pill: 'rgba(56,139,253,0.18)' },
  { key: 'confirmed', label: 'Confirmed', color: 'var(--blue)', pill: 'rgba(56,139,253,0.18)' },
  { key: 'filming', label: 'Filming', color: 'var(--accent)', pill: 'rgba(163,113,247,0.18)' },
  { key: 'editing', label: 'Editing', color: 'var(--green)', pill: 'rgba(46,160,67,0.18)' },
  { key: 'review', label: 'Review', color: 'var(--orange)', pill: 'rgba(240,160,24,0.18)' },
  { key: 'published', label: 'Published', color: 'var(--green)', pill: 'rgba(46,160,67,0.18)' },
];

const COLUMNS = [
  { key: 'ideation', label: 'Ideation', color: '#868e96', stages: ['idea'], defaultStage: 'idea' },
  { key: 'pre-production', label: 'Pre-Production', color: 'var(--blue)', stages: ['outlined', 'confirmed'], defaultStage: 'outlined' },
  { key: 'production', label: 'Production', color: 'var(--accent)', stages: ['filming'], defaultStage: 'filming' },
  { key: 'editing', label: 'Editing', color: 'var(--orange)', stages: ['editing', 'review'], defaultStage: 'editing' },
  { key: 'published', label: 'Published', color: 'var(--green)', stages: ['published'], defaultStage: 'published' },
];

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatViews(views?: number) {
  if (!views || Number.isNaN(views)) return '';
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  if (views >= 1_000) return `${Math.round(views / 1_000)}K views`;
  return `${views} views`;
}

function formatViewsCompact(views?: number) {
  if (!views || Number.isNaN(views)) return '';
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (views >= 1_000) return `${Math.round(views / 1_000)}K`;
  return `${views}`;
}

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [seriesList, setSeriesList] = useState<Array<{ id: number; title: string }>>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [failedThumbs, setFailedThumbs] = useState<Set<number>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);

  const load = () => {
    const url = seriesFilter ? `/api/episodes?series_id=${seriesFilter}` : '/api/episodes';
    fetch(url).then(r => r.json()).then((data) => {
      setEpisodes(data);
      setFailedThumbs(new Set()); // reset failed thumbs on reload
    });
  };

  useEffect(() => {
    fetch('/api/series').then(r => r.json()).then(setSeriesList);
  }, []);

  useEffect(() => { load(); }, [seriesFilter]);

  const stageMap = useMemo(() => new Map(STAGES.map(stage => [stage.key, stage])), []);
  const listEpisodes = useMemo(() => {
    return [...episodes]
      .filter(e => !countryFilter || e.country === countryFilter)
      .sort((a, b) => {
        const aDate = a.actual_publish_date ? Date.parse(a.actual_publish_date) : 0;
        const bDate = b.actual_publish_date ? Date.parse(b.actual_publish_date) : 0;
        return bDate - aDate;
      });
  }, [episodes, countryFilter]);

  const markThumbFailed = (id: number) => {
    setFailedThumbs(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const renderThumbnail = (ep: Episode, height: number, roundedTopOnly = false) => {
    const showPlaceholder = !ep.thumbnail_url || failedThumbs.has(ep.id);
    const borderRadius = roundedTopOnly ? '10px 10px 0 0' : 8;
    if (showPlaceholder) {
      return (
        <div
          style={{
            height,
            width: '100%',
            borderRadius,
            background: 'rgba(12,14,18,0.7)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dim)',
          }}
        >
          <Camera size={18} />
        </div>
      );
    }
    return (
      <img
        src={ep.thumbnail_url}
        alt={ep.title}
        onError={() => markThumbFailed(ep.id)}
        style={{
          height,
          width: '100%',
          borderRadius,
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  };

  const handleDrop = async (columnKey: string) => {
    if (dragging === null) return;
    const column = COLUMNS.find(col => col.key === columnKey);
    if (!column) return;
    const stage = column.defaultStage;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setSeriesFilter(''); }} style={{ width: 160 }}>
            <option value="">All Countries</option>
            {[...new Set(episodes.map(e => e.country).filter(Boolean))].sort().map(c => (
              <option key={c} value={c}>{c} ({episodes.filter(ep => ep.country === c).length})</option>
            ))}
          </select>
          <select value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)} style={{ width: 200 }}>
            <option value="">All Series</option>
            {seriesList
              .filter(s => !countryFilter || episodes.some(ep => ep.series_id === s.id && ep.country === countryFilter))
              .map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['kanban', 'list'] as Array<'kanban' | 'list'>).map(mode => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: active ? 'var(--accent)' : 'var(--card)',
                    color: active ? 'white' : 'var(--text-dim)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'kanban' ? 'Kanban' : 'List'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 2fr 1fr 120px 90px 120px 140px 40px',
              gap: 12,
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-dim)',
              borderBottom: '1px solid var(--border)',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            <div>Thumbnail</div>
            <div>Title</div>
            <div>Series</div>
            <div>Stage</div>
            <div>Views</div>
            <div>Publish Date</div>
            <div>Sponsor</div>
            <div />
          </div>
          {listEpisodes.map(ep => {
            const stage = stageMap.get(ep.stage);
            const isHovered = hoveredRow === ep.id;
            return (
              <div
                key={ep.id}
                onMouseEnter={() => setHoveredRow(ep.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => setSelectedEpisodeId(ep.id)}
                style={{
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '100px 2fr 1fr 120px 90px 120px 140px 40px',
                  gap: 12,
                  padding: '10px 12px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ width: 80, height: 45 }}>
                  {renderThumbnail(ep, 45)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{ep.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{ep.series_title || '—'}</div>
                <div>
                  {stage && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        padding: '3px 8px',
                        borderRadius: 999,
                        color: stage.color,
                        background: stage.pill,
                        textTransform: 'uppercase',
                      }}
                    >
                      {stage.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
                  {formatViewsCompact(ep.view_count) || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {ep.actual_publish_date ? formatDate(ep.actual_publish_date) : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
                  {ep.sponsor_name || '—'}
                </div>
                <div>
                  {ep.youtube_url && (
                    <a
                      href={ep.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-dim)',
                        background: 'var(--card)',
                      }}
                      title="Open on YouTube"
                    >
                      <LinkIcon size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', flex: 1, paddingBottom: 16, minHeight: 0, overflow: 'hidden' }}>
          {COLUMNS.map(column => {
            const columnEps = episodes.filter(e => column.stages.includes(e.stage) && (!countryFilter || e.country === countryFilter));
            const isOver = dragOver === column.key;
            const sortedEps = columnEps.sort((a, b) => {
              const aIndex = column.stages.indexOf(a.stage);
              const bIndex = column.stages.indexOf(b.stage);
              return aIndex - bIndex;
            });
            return (
              <div
                key={column.key}
                className="kanban-col"
                style={{
                  minWidth: 260, maxWidth: 300, flex: '0 0 280px',
                  background: isOver ? 'rgba(163,113,247,0.05)' : 'var(--card)',
                  borderColor: isOver ? 'var(--accent)' : 'var(--border)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onDragOver={e => { e.preventDefault(); setDragOver(column.key); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(column.key)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="status-dot" style={{ background: column.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{column.label.toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: 'var(--border)', color: 'var(--text-dim)' }}>
                    {columnEps.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40 }}>
                  {sortedEps.map(ep => {
                    const stage = stageMap.get(ep.stage);
                    const isPublished = ep.stage === 'published';
                    return (
                      <div
                        key={ep.id}
                        draggable
                        onDragStart={() => setDragging(ep.id)}
                        onDragEnd={() => { setDragging(null); setDragOver(null); }}
                        onClick={() => { if (dragging === null) setSelectedEpisodeId(ep.id); }}
                        style={{
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: 10, cursor: 'pointer',
                          opacity: dragging === ep.id ? 0.5 : 1,
                          transition: 'opacity 0.15s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ margin: '-10px -10px 4px -10px' }}>
                          {renderThumbnail(ep, 140, true)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{ep.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {ep.sponsor_name && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 999,
                                  background: 'rgba(46,160,67,0.18)',
                                  color: 'var(--green)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Sponsored
                              </span>
                            )}
                            {ep.youtube_url && isPublished && (
                              <a
                                href={ep.youtube_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: 24, height: 24,
                                  borderRadius: 8,
                                  border: '1px solid var(--border)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-dim)',
                                  background: 'var(--card)',
                                }}
                                title="Open on YouTube"
                              >
                                <LinkIcon size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                        {stage && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: 0.4,
                              padding: '2px 6px',
                              borderRadius: 999,
                              alignSelf: 'flex-start',
                              color: stage.color,
                              background: stage.pill,
                              textTransform: 'uppercase',
                            }}
                          >
                            {stage.label}
                          </span>
                        )}
                        {ep.series_title && (
                          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{ep.series_title}</span>
                        )}
                        {isPublished && (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-dim)', fontSize: 10 }}>
                            {formatViews(ep.view_count) && <span>{formatViews(ep.view_count)}</span>}
                            {ep.actual_publish_date && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={10} /> {formatDate(ep.actual_publish_date)}
                              </span>
                            )}
                          </div>
                        )}
                        {ep.country && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 8,
                              alignSelf: 'flex-start',
                              fontWeight: 700,
                              color: 'var(--blue)',
                              background: 'rgba(56,139,253,0.1)',
                            }}
                          >
                            {ep.country}{ep.region && ep.region !== ep.country ? ` (${ep.region})` : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedEpisodeId !== null && (
        <EditEpisodeModal
          episodeId={selectedEpisodeId}
          onClose={() => setSelectedEpisodeId(null)}
          onSaved={() => { setSelectedEpisodeId(null); load(); }}
        />
      )}
    </div>
  );
}
