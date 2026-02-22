'use client';

import { useEffect, useMemo, useState } from 'react';

interface Props {
  episodeId: number;
  onClose: () => void;
  onSaved: () => void;
}

interface Person {
  id: number; name: string; role: string;
}

interface EpisodeResponse {
  id: number;
  title: string;
  stage: string;
  episode_type: string;
  shoot_date: string | null;
  rough_cut_due: string | null;
  publish_date: string | null;
  actual_publish_date: string | null;
  editor_id: number | null;
  youtube_url: string | null;
  thumbnail_concept: string | null;
  hook: string | null;
  outline: string | null;
  notes: string | null;
  series_title?: string | null;
  editor_name?: string | null;
}

const STAGES = ['idea', 'outlined', 'confirmed', 'filming', 'editing', 'review', 'published'];

type FormState = {
  title: string;
  stage: string;
  editor_id: string;
  thumbnail_concept: string;
  youtube_url: string;
  hook: string;
  outline: string;
  shoot_date: string;
  rough_cut_due: string;
  publish_date: string;
  actual_publish_date: string;
  notes: string;
};

const emptyForm: FormState = {
  title: '',
  stage: 'idea',
  editor_id: '',
  thumbnail_concept: '',
  youtube_url: '',
  hook: '',
  outline: '',
  shoot_date: '',
  rough_cut_due: '',
  publish_date: '',
  actual_publish_date: '',
  notes: '',
};

const mapEpisodeToForm = (episode: EpisodeResponse): FormState => ({
  title: episode.title || '',
  stage: episode.stage || 'idea',
  editor_id: episode.editor_id ? String(episode.editor_id) : '',
  thumbnail_concept: episode.thumbnail_concept || '',
  youtube_url: episode.youtube_url || '',
  hook: episode.hook || '',
  outline: episode.outline || '',
  shoot_date: episode.shoot_date || '',
  rough_cut_due: episode.rough_cut_due || '',
  publish_date: episode.publish_date || '',
  actual_publish_date: episode.actual_publish_date || '',
  notes: episode.notes || '',
});

export default function EditEpisodeModal({ episodeId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [editors, setEditors] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [episodeType, setEpisodeType] = useState('');

  useEffect(() => {
    fetch('/api/people?role=editor').then(r => r.json()).then(setEditors);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadEpisode = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/episodes/${episodeId}`);
        const data: EpisodeResponse = await res.json();
        if (cancelled) return;
        const nextForm = mapEpisodeToForm(data);
        setForm(nextForm);
        setInitial(nextForm);
        setSeriesTitle(data.series_title || '');
        setEpisodeType(data.episode_type || '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadEpisode();
    return () => { cancelled = true; };
  }, [episodeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key: keyof FormState, value: string) => setForm(f => ({ ...f, [key]: value }));

  const badgeLabel = useMemo(() => {
    if (episodeType === 'cornerstone') return 'CORNERSTONE';
    if (episodeType === 'secondary') return 'SECONDARY';
    return episodeType ? episodeType.toUpperCase() : '';
  }, [episodeType]);

  const save = async () => {
    if (!initial) return;
    const updates: Record<string, unknown> = {};
    (Object.keys(form) as Array<keyof FormState>).forEach((key) => {
      if (form[key] !== initial[key]) updates[key] = form[key];
    });

    if (!Object.keys(updates).length) {
      setSaved(true);
      setTimeout(() => setSaved(false), 500);
      onSaved();
      onClose();
      return;
    }

    if ('editor_id' in updates) {
      updates.editor_id = form.editor_id ? parseInt(form.editor_id, 10) : null;
    }

    ['shoot_date', 'rough_cut_due', 'publish_date', 'actual_publish_date'].forEach((field) => {
      if (field in updates) {
        const value = updates[field] as string;
        updates[field] = value ? value : null;
      }
    });

    setSaving(true);
    try {
      await fetch(`/api/episodes/${episodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSaved(true);
      onSaved();
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 450);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Episode title"
              style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}
              autoFocus
              disabled={loading}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{seriesTitle || '—'}</span>
              {badgeLabel && (
                <span className="badge" style={{
                  background: episodeType === 'cornerstone' ? 'rgba(163,113,247,0.15)' : 'rgba(139,148,158,0.1)',
                  color: episodeType === 'cornerstone' ? 'var(--accent)' : 'var(--text-dim)',
                  fontWeight: 600,
                }}>
                  {badgeLabel}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} aria-label="Close" style={{ padding: '2px 8px' }}>X</button>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading episode…</div>
        ) : (
          <>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Stage</label>
                <select value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Editor</label>
                <select value={form.editor_id} onChange={e => set('editor_id', e.target.value)}>
                  <option value="">Unassigned</option>
                  {editors.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            <div className="section-label" style={{ marginTop: 6 }}>Media</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Thumbnail Concept</label>
                <textarea value={form.thumbnail_concept} onChange={e => set('thumbnail_concept', e.target.value)} rows={2} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>YouTube URL</span>
                  {form.youtube_url && (
                    <a href={form.youtube_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>
                      Open
                    </a>
                  )}
                </label>
                <input value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} placeholder="https://youtube.com/..." />
              </div>
            </div>

            <div className="section-label" style={{ marginTop: 6 }}>Content</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Hook</label>
                <textarea value={form.hook} onChange={e => set('hook', e.target.value)} rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Outline</label>
                <textarea value={form.outline} onChange={e => set('outline', e.target.value)} rows={3} />
              </div>
            </div>

            <div className="section-label" style={{ marginTop: 6 }}>Schedule</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Shoot Date</label>
                <input type="date" value={form.shoot_date} onChange={e => set('shoot_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Rough Cut Due</label>
                <input type="date" value={form.rough_cut_due} onChange={e => set('rough_cut_due', e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Publish Date</label>
                <input type="date" value={form.publish_date} onChange={e => set('publish_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Actual Publish Date</label>
                <input type="date" value={form.actual_publish_date} onChange={e => set('actual_publish_date', e.target.value)} />
              </div>
            </div>

            <div className="section-label" style={{ marginTop: 6 }}>Notes</div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, alignItems: 'center' }}>
              {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved</span>}
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || loading || !form.title}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
