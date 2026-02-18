'use client';

import { useEffect, useState } from 'react';
import { Plus, User, Mail, Phone, MapPin, DollarSign } from 'lucide-react';

interface Person {
  id: number; name: string; role: string; email: string; phone: string;
  rate_per_day: number; currency: string; location: string; instagram: string;
  notes: string; episode_count: number; series_count: number; active: number;
}

const ROLES = ['all', 'editor', 'fixer', 'producer', 'camera', 'other'];

const ROLE_COLORS: Record<string, string> = {
  editor: 'var(--blue)',
  fixer: 'var(--green)',
  producer: 'var(--accent)',
  camera: 'var(--orange)',
  other: '#8b949e',
};

interface NewPersonForm {
  name: string; role: string; email: string; phone: string;
  rate_per_day: string; currency: string; location: string; instagram: string;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewPersonForm>({
    name: '', role: 'other', email: '', phone: '',
    rate_per_day: '', currency: 'USD', location: '', instagram: '',
  });

  const load = (role?: string) => {
    const url = role && role !== 'all' ? `/api/people?role=${role}` : '/api/people';
    fetch(url).then(r => r.json()).then(setPeople);
  };

  useEffect(() => { load(filter); }, [filter]);

  const createPerson = async () => {
    if (!form.name) return;
    await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rate_per_day: parseFloat(form.rate_per_day) || 0 }),
    });
    setShowNew(false);
    setForm({ name: '', role: 'other', email: '', phone: '', rate_per_day: '', currency: 'USD', location: '', instagram: '' });
    load(filter);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>People</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={14} /> Add Person
        </button>
      </div>

      <div className="tab-bar">
        {ROLES.map(r => (
          <button key={r} className={`tab ${filter === r ? 'active' : ''}`} onClick={() => setFilter(r)}>
            {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {!people.length ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-dim)' }}>
          <User size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No people yet</p>
          <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ marginTop: 16 }}>
            <Plus size={14} /> Add first person
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {people.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: ROLE_COLORS[p.role] || '#8b949e', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' }}>
                    {p.role}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                  {p.series_count > 0 && <span>{p.series_count} series</span>}
                  {p.episode_count > 0 && <span>{p.episode_count} eps</span>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
                    <MapPin size={11} /> {p.location}
                  </div>
                )}
                {p.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
                    <Mail size={11} />
                    <a href={`mailto:${p.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.email}</a>
                  </div>
                )}
                {p.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
                    <Phone size={11} /> {p.phone}
                  </div>
                )}
                {p.rate_per_day > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
                    <DollarSign size={11} /> ${p.rate_per_day}/day {p.currency}
                  </div>
                )}
                {p.instagram && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                    @{p.instagram.replace('@', '')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Add Person</h2>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.filter(r => r !== 'all').map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+84..." />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Day Rate</label>
                <input type="number" value={form.rate_per_day} onChange={e => setForm(f => ({ ...f, rate_per_day: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {['USD', 'VND', 'EUR', 'GBP', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@username" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createPerson}>Add Person</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
