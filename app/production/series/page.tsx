'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Calendar, Video } from 'lucide-react';

interface Series {
  id: number; title: string; location: string; status: string;
  target_shoot_start: string; target_shoot_end: string;
  episode_count: number; budget_target: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ideation: { label: 'Ideation', color: '#8b949e', bg: 'rgba(139,148,158,0.1)' },
  pre_prod: { label: 'Pre-Prod', color: 'var(--blue)', bg: 'rgba(88,166,255,0.1)' },
  shooting: { label: 'Shooting', color: 'var(--accent)', bg: 'rgba(163,113,247,0.1)' },
  post_prod: { label: 'Post-Prod', color: 'var(--orange)', bg: 'rgba(210,153,34,0.1)' },
  published: { label: 'Published', color: 'var(--green)', bg: 'rgba(63,185,80,0.1)' },
  archived: { label: 'Archived', color: '#8b949e', bg: 'rgba(139,148,158,0.1)' },
};

const STATUSES = ['all', 'ideation', 'pre_prod', 'shooting', 'post_prod', 'published', 'archived'];

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface NewSeriesForm {
  title: string; location: string; status: string;
  target_shoot_start: string; target_shoot_end: string;
  budget_target: string; notes: string;
}

export default function SeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewSeriesForm>({
    title: '', location: '', status: 'ideation',
    target_shoot_start: '', target_shoot_end: '',
    budget_target: '', notes: '',
  });

  const load = (status?: string) => {
    const url = status && status !== 'all' ? `/api/series?status=${status}` : '/api/series';
    fetch(url).then(r => r.json()).then(setSeries);
  };

  useEffect(() => { load(filter); }, [filter]);

  const createSeries = async () => {
    if (!form.title) return;
    await fetch('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, budget_target: parseFloat(form.budget_target) || 0 }),
    });
    setShowNew(false);
    setForm({ title: '', location: '', status: 'ideation', target_shoot_start: '', target_shoot_end: '', budget_target: '', notes: '' });
    load(filter);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Series</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={14} /> New Series
        </button>
      </div>

      <div className="tab-bar">
        {STATUSES.map(s => (
          <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {!series.length ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-dim)' }}>
          <p>No series found</p>
          <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ marginTop: 16 }}>
            <Plus size={14} /> Create your first series
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {series.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.ideation;
            return (
              <Link key={s.id} href={`/production/series/${s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{s.title}</h3>
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap', marginLeft: 8,
                    }}>
                      {cfg.label.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {s.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: 12 }}>
                        <MapPin size={11} /> {s.location}
                      </div>
                    )}
                    {s.target_shoot_start && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: 12 }}>
                        <Calendar size={11} /> {formatDate(s.target_shoot_start)}
                        {s.target_shoot_end && <> — {formatDate(s.target_shoot_end)}</>}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: 12 }}>
                      <Video size={11} /> {s.episode_count || 0} episodes
                    </div>
                  </div>
                  {s.budget_target > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-dim)' }}>
                      Budget: <span style={{ color: 'var(--text)', fontWeight: 500 }}>${s.budget_target.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New Series</h2>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Series title" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.filter(s => s !== 'all').map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Shoot Start</label>
                <input type="date" value={form.target_shoot_start} onChange={e => setForm(f => ({ ...f, target_shoot_start: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Shoot End</label>
                <input type="date" value={form.target_shoot_end} onChange={e => setForm(f => ({ ...f, target_shoot_end: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Budget Target ($)</label>
              <input type="number" value={form.budget_target} onChange={e => setForm(f => ({ ...f, budget_target: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createSeries}>Create Series</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
