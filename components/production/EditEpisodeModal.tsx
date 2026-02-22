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
  script_url: string | null;
  thumbnail_url: string | null;
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
  thumbnail_url: string;
  youtube_url: string;
  script_url: string;
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
  thumbnail_url: '',
  youtube_url: '',
  script_url: '',
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
  thumbnail_url: episode.thumbnail_url || '',
  youtube_url: episode.youtube_url || '',
  script_url: episode.script_url || '',
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
  const [thumbnailPreviews, setThumbnailPreviews] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [generating, setGenerating] = useState(false);

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
        setThumbnailPreviews([]);
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

  const previewSlots = [0, 1, 2];

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

  const suggestConcept = async () => {
    if (suggesting || loading) return;
    setSuggesting(true);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/suggest-concept`, { method: 'POST' });
      const data = await res.json();
      if (data?.concept) {
        set('thumbnail_concept', data.concept);
      }
    } finally {
      setSuggesting(false);
    }
  };

  const generateThumbnails = async () => {
    if (generating || loading) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/generate-thumbnails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: form.thumbnail_concept }),
      });
      const data = await res.json();
      if (Array.isArray(data?.urls)) {
        setThumbnailPreviews(data.urls);
      }
    } finally {
      setGenerating(false);
    }
  };

  const useAsThumbnail = (url: string) => {
    set('thumbnail_url', url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
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
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span>Thumbnail Concept</span>
                <button
                  className="btn btn-secondary"
                  onClick={suggestConcept}
                  disabled={suggesting || loading}
                  style={{ fontSize: 11, padding: '4px 8px', background: 'var(--accent)', color: '#fff' }}
                >
                  {suggesting ? 'Suggesting…' : 'Suggest Concept'}
                </button>
              </label>
              <textarea value={form.thumbnail_concept} onChange={e => set('thumbnail_concept', e.target.value)} rows={3} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={generateThumbnails}
                  disabled={generating || loading}
                  style={{ minWidth: 180 }}
                >
                  {generating ? 'Generating…' : 'Generate Thumbnails'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={generateThumbnails}
                  disabled={generating || loading}
                >
                  Regenerate
                </button>
                {generating && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 50 50" aria-hidden="true">
                      <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray="31.4 31.4">
                        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                    <span>Generating images…</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                {previewSlots.map((slot) => {
                  const url = thumbnailPreviews[slot];
                  const selected = url && form.thumbnail_url === url;
                  return (
                    <div key={slot} style={{ flex: 1 }}>
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '16 / 9',
                          borderRadius: 10,
                          border: `1px ${url ? 'solid' : 'dashed'} ${selected ? 'var(--accent)' : 'var(--border)'}`,
                          background: url ? 'var(--card)' : 'transparent',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-dim)',
                          fontSize: 12,
                        }}
                      >
                        {url ? (
                          <img src={url} alt={`Generated thumbnail ${slot + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          'No preview'
                        )}
                      </div>
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', marginTop: 6, fontSize: 11 }}
                        onClick={() => url && useAsThumbnail(url)}
                        disabled={!url}
                      >
                        {selected ? 'Selected Thumbnail' : 'Use as Thumbnail'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="section-label" style={{ marginTop: 6 }}>Links</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>YouTube URL</span>
                  {form.youtube_url && (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => window.open(form.youtube_url, '_blank', 'noopener,noreferrer')}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      Open
                    </button>
                  )}
                </label>
                <input value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} placeholder="https://youtube.com/..." />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Script URL</span>
                  {form.script_url && (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => window.open(form.script_url, '_blank', 'noopener,noreferrer')}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      Open
                    </button>
                  )}
                </label>
                <input value={form.script_url} onChange={e => set('script_url', e.target.value)} placeholder="https://..." />
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
