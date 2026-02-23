'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewPositionModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '',
    role_type: 'producer',
    description: '',
    requirements: '',
    rate_range: '',
    location_preference: '',
    job_board_urls: '',
    trial_task_doc_url: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/hiring/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New Position</h2>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Video Editor" />
          </div>
          <div className="form-group">
            <label className="form-label">Role Type</label>
            <select value={form.role_type} onChange={e => set('role_type', e.target.value)}>
              <option value="producer">Producer</option>
              <option value="editor">Editor</option>
              <option value="fixer">Fixer</option>
              <option value="camera">Camera</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="What does this role involve?" />
        </div>

        <div className="form-group">
          <label className="form-label">Requirements</label>
          <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)} rows={2} placeholder="Must-have skills, experience..." />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Rate Range</label>
            <input value={form.rate_range} onChange={e => set('rate_range', e.target.value)} placeholder="e.g. $500-800/mo" />
          </div>
          <div className="form-group">
            <label className="form-label">Location Preference</label>
            <input value={form.location_preference} onChange={e => set('location_preference', e.target.value)} placeholder="e.g. Philippines, Remote" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Job Board URLs</label>
          <input value={form.job_board_urls} onChange={e => set('job_board_urls', e.target.value)} placeholder="Links to postings (comma-separated)" />
        </div>

        <div className="form-group">
          <label className="form-label">Trial Task Doc URL</label>
          <input value={form.trial_task_doc_url} onChange={e => set('trial_task_doc_url', e.target.value)} placeholder="Link to trial task document" />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !form.title.trim()}>
            {loading ? 'Creating...' : 'Create Position'}
          </button>
        </div>
      </div>
    </div>
  );
}
