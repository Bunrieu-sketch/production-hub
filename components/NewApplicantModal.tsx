'use client';

import { useState } from 'react';

interface Position {
  id: number;
  title: string;
}

interface Props {
  positions: Position[];
  defaultPositionId?: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewApplicantModal({ positions, defaultPositionId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    position_id: defaultPositionId || (positions[0]?.id ?? 0),
    name: '',
    email: '',
    phone: '',
    source: '',
    portfolio_url: '',
    resume_url: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string | number) => setForm(f => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.name.trim() || !form.position_id) return;
    setLoading(true);
    try {
      await fetch('/api/hiring/applicants', {
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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New Applicant</h2>

        <div className="form-group">
          <label className="form-label">Position</label>
          <select value={form.position_id} onChange={e => set('position_id', Number(e.target.value))}>
            {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Source</label>
            <select value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">-- Select --</option>
              <option value="onlinejobs_ph">OnlineJobs.ph</option>
              <option value="vietnamworks">VietnamWorks</option>
              <option value="referral">Referral</option>
              <option value="direct">Direct</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+63..." />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Portfolio URL</label>
            <input value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Resume URL</label>
            <input value={form.resume_url} onChange={e => set('resume_url', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Initial observations..." />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !form.name.trim()}>
            {loading ? 'Adding...' : 'Add Applicant'}
          </button>
        </div>
      </div>
    </div>
  );
}
