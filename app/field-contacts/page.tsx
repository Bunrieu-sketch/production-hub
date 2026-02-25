'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MessageCircle, Mail, Instagram } from 'lucide-react';

interface FieldContact {
  id: string;
  name: string;
  destination: string;
  type: 'fixer' | 'hotel' | 'creator' | 'talent' | 'other';
  stage: 'cold' | 'contacted' | 'responded' | 'confirmed' | 'passed';
  wa: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
  notes: string | null;
  source: string | null;
  priority: 1 | 2 | 3;
  created_at: string;
  updated_at: string;
}

const STAGES = [
  { key: 'cold', label: 'Cold', color: '#8b949e' },
  { key: 'contacted', label: 'Contacted', color: 'var(--orange)' },
  { key: 'responded', label: 'Responded', color: 'var(--blue)' },
  { key: 'confirmed', label: 'Confirmed', color: 'var(--green)' },
  { key: 'passed', label: 'Passed', color: '#6e7681' },
] as const;

const TYPES: Array<FieldContact['type']> = ['fixer', 'hotel', 'creator', 'talent', 'other'];

const PRIORITY_COLORS: Record<FieldContact['priority'], string> = {
  1: '#f85149',
  2: '#d29922',
  3: '#8b949e',
};

interface NewContactForm {
  name: string;
  destination: string;
  type: FieldContact['type'];
  wa: string;
  email: string;
  instagram: string;
  website: string;
  notes: string;
  source: string;
  priority: '1' | '2' | '3';
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDestinationColor(dest: string) {
  let hash = 0;
  for (let i = 0; i < dest.length; i += 1) {
    hash = dest.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsla(${hue}, 45%, 35%, 0.4)`,
    color: `hsl(${hue}, 65%, 78%)`,
    border: `1px solid hsla(${hue}, 55%, 55%, 0.4)`,
  };
}

function formatWaLink(wa: string) {
  const digits = wa.replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '#';
}

export default function FieldContactsPage() {
  const [contacts, setContacts] = useState<FieldContact[]>([]);
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | FieldContact['type']>('all');
  const [showNew, setShowNew] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const [form, setForm] = useState<NewContactForm>({
    name: '',
    destination: '',
    type: 'fixer',
    wa: '',
    email: '',
    instagram: '',
    website: '',
    notes: '',
    source: '',
    priority: '2',
  });

  const load = useCallback(() => {
    fetch('/api/field-contacts').then(r => r.json()).then(setContacts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const destinations = useMemo(() => {
    const set = new Set(contacts.map(c => c.destination));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const destinationMatch = destinationFilter === 'all' || c.destination === destinationFilter;
      const typeMatch = typeFilter === 'all' || c.type === typeFilter;
      return destinationMatch && typeMatch;
    });
  }, [contacts, destinationFilter, typeFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of STAGES) counts[stage.key] = 0;
    for (const contact of filtered) counts[contact.stage] += 1;
    return counts;
  }, [filtered]);

  const updateContact = async (id: string, updates: Partial<FieldContact>) => {
    const res = await fetch(`/api/field-contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setContacts(prev => prev.map(c => (c.id === id ? updated : c)));
  };

  const handleDrop = async (stage: FieldContact['stage']) => {
    if (!dragging) return;
    const contact = contacts.find(c => c.id === dragging);
    if (!contact || contact.stage === stage) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    await updateContact(dragging, { stage });
    setDragging(null);
    setDragOver(null);
  };

  const createContact = async () => {
    if (!form.name.trim() || !form.destination.trim()) return;
    await fetch('/api/field-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        destination: form.destination.trim(),
        type: form.type,
        wa: form.wa.trim() || null,
        email: form.email.trim() || null,
        instagram: form.instagram.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        source: form.source.trim() || null,
        priority: Number(form.priority),
      }),
    });
    setShowNew(false);
    setForm({
      name: '',
      destination: '',
      type: 'fixer',
      wa: '',
      email: '',
      instagram: '',
      website: '',
      notes: '',
      source: '',
      priority: '2',
    });
    load();
  };

  const TYPE_BADGE_CLASSES: Record<FieldContact['type'], string> = {
    fixer: 'bg-emerald-900 text-emerald-300 border border-emerald-700',
    hotel: 'bg-blue-900 text-blue-300 border border-blue-700',
    creator: 'bg-purple-900 text-purple-300 border border-purple-700',
    talent: 'bg-orange-900 text-orange-300 border border-orange-700',
    other: 'bg-gray-800 text-gray-300 border border-gray-600',
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 48px)' }}>
      <aside style={{ width: 240, flexShrink: 0 }}>
        <div className="panel" style={{ height: '100%', overflow: 'auto' }}>
          <div className="text-gray-400 uppercase tracking-wider text-xs" style={{ marginBottom: 10 }}>
            Destinations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            <button
              className={`btn group ${destinationFilter === 'all' ? 'text-white' : 'text-gray-300'}`}
              style={{ justifyContent: 'space-between', background: destinationFilter === 'all' ? 'var(--hover-bg)' : 'transparent' }}
              onClick={() => setDestinationFilter('all')}
            >
              <span className="text-gray-200 group-hover:text-white">All destinations</span>
              <span className="bg-gray-700 text-gray-100 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {contacts.length}
              </span>
            </button>
            {destinations.map(dest => (
              <button
                key={dest}
                className={`btn group ${destinationFilter === dest ? 'text-white' : 'text-gray-300'}`}
                style={{ justifyContent: 'space-between', background: destinationFilter === dest ? 'var(--hover-bg)' : 'transparent' }}
                onClick={() => setDestinationFilter(dest)}
              >
                <span className="text-gray-200 group-hover:text-white">{dest}</span>
                <span className="bg-gray-700 text-gray-100 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {contacts.filter(c => c.destination === dest).length}
                </span>
              </button>
            ))}
          </div>

          <div className="text-gray-400 uppercase tracking-wider text-xs" style={{ marginBottom: 10 }}>
            Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['all', ...TYPES] as const).map(type => (
              <button
                key={type}
                className={`btn group ${typeFilter === type ? 'text-white' : 'text-gray-300'}`}
                style={{
                  justifyContent: 'space-between',
                  background: typeFilter === type ? 'var(--hover-bg)' : 'transparent',
                }}
                onClick={() => setTypeFilter(type)}
              >
                <span className="text-gray-200 group-hover:text-white">{type === 'all' ? 'All types' : titleCase(type)}</span>
                <span className="bg-gray-700 text-gray-100 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {type === 'all' ? contacts.length : contacts.filter(c => c.type === type).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="page-title">Field Contacts</div>
            <div className="muted" style={{ fontSize: 12, color: '#d1d5db' }}>Fixers, hotels, and creators pipeline</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={destinationFilter}
              onChange={e => setDestinationFilter(e.target.value)}
              className="bg-gray-700 border border-gray-500 text-gray-100"
              style={{ borderRadius: 8, padding: '6px 10px', fontSize: 12 }}
            >
              <option value="all">All destinations</option>
              {destinations.map(dest => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={14} /> Add Contact
            </button>
          </div>
        </div>

        <div className="tab-bar" style={{ marginBottom: 12 }}>
          {(['all', 'fixer', 'hotel', 'creator', 'talent'] as const).map(type => (
            <button
              key={type}
              className={`tab ${typeFilter === type ? 'active' : ''}`}
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? 'All' : titleCase(type)}
            </button>
          ))}
        </div>

        <div className="kanban" style={{ gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))' }}>
          {STAGES.map(stage => (
            <div
              key={stage.key}
              className={`kanban-col ${dragOver === stage.key ? 'drag-over' : ''}`}
              onDragOver={e => {
                e.preventDefault();
                setDragOver(stage.key);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage.key)}
            >
              <div className="col-header">
                <span className="col-dot" style={{ background: stage.color, width: 12, height: 12 }} />
                <span className="text-gray-100 font-semibold">{stage.label}</span>
                <span className="col-count bg-gray-700 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {stageCounts[stage.key] || 0}
                </span>
              </div>
              <div className="col-cards" style={{ gap: 12 }}>
                {filtered
                  .filter(c => c.stage === stage.key)
                  .map(contact => (
                    <div
                      key={contact.id}
                      className="task-card"
                      style={{ padding: 16 }}
                      draggable
                      onDragStart={() => setDragging(contact.id)}
                      onDragEnd={() => setDragging(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: PRIORITY_COLORS[contact.priority || 2],
                            }}
                          />
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{contact.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {contact.wa && (
                            <a
                              href={formatWaLink(contact.wa)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-300 hover:text-white"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="text-gray-300 hover:text-white">
                              <Mail size={14} />
                            </a>
                          )}
                          {contact.instagram && (
                            <a
                              href={`https://instagram.com/${contact.instagram.replace('@', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-300 hover:text-white"
                            >
                              <Instagram size={14} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <span
                          className="bg-gray-600 text-gray-100 border border-gray-500"
                          style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}
                        >
                          {contact.destination}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${TYPE_BADGE_CLASSES[contact.type]}`}
                        >
                          {contact.type}
                        </span>
                      </div>

                      {contact.notes && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-dim)',
                            marginTop: 8,
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {contact.notes}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '95vw' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Add Contact</h2>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contact name" />
            </div>
            <div className="form-group">
              <label className="form-label">Destination *</label>
              <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Sumba, Sri Lanka" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as FieldContact['type'] }))}>
                  {TYPES.map(t => (
                    <option key={t} value={t}>{titleCase(t)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as NewContactForm['priority'] }))}>
                  <option value="1">1 (High)</option>
                  <option value="2">2 (Normal)</option>
                  <option value="3">3 (Low)</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input value={form.wa} onChange={e => setForm(f => ({ ...f, wa: e.target.value }))} placeholder="+62..." />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Instagram</label>
                <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Referral / IG / Google" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Key context, pricing, availability..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createContact}>Add Contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
