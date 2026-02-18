'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, MapPin, Calendar, Plane } from 'lucide-react';

interface SeriesData {
  id: number; title: string; location: string; status: string;
  target_shoot_start: string; target_shoot_end: string;
  budget_target: number; budget_actual: number;
  notes: string; fixer_name: string; producer_name: string; camera_name: string;
}

interface Episode {
  id: number; title: string; stage: string; episode_type: string;
  shoot_date: string; publish_date: string; editor_name: string; hook: string;
}

interface Milestone {
  id: number; week_number: number; title: string; due_date: string;
  completed: number; notes: string;
}

interface TravelItem {
  id: number; type: string; title: string; date_start: string;
  cost: number; currency: string; booked: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ideation: { label: 'Ideation', color: '#8b949e' },
  pre_prod: { label: 'Pre-Production', color: 'var(--blue)' },
  shooting: { label: 'Shooting', color: 'var(--accent)' },
  post_prod: { label: 'Post-Production', color: 'var(--orange)' },
  published: { label: 'Published', color: 'var(--green)' },
  archived: { label: 'Archived', color: '#8b949e' },
};

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  idea: { label: 'Idea', color: '#8b949e' },
  outlined: { label: 'Outlined', color: 'var(--blue)' },
  confirmed: { label: 'Confirmed', color: 'var(--blue)' },
  filming: { label: 'Filming', color: 'var(--accent)' },
  editing: { label: 'Editing', color: 'var(--green)' },
  review: { label: 'Review', color: 'var(--orange)' },
  published: { label: 'Published', color: 'var(--green)' },
};

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface NewEpisodeForm {
  title: string; stage: string; episode_type: string;
  shoot_date: string; publish_date: string; hook: string; notes: string;
}

interface NewTravelForm {
  type: string; title: string; details: string;
  date_start: string; cost: string; currency: string; booked: boolean;
}

export default function SeriesDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [travel, setTravel] = useState<TravelItem[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [editStatus, setEditStatus] = useState('');
  const [showNewEpisode, setShowNewEpisode] = useState(false);
  const [showNewTravel, setShowNewTravel] = useState(false);
  const [epForm, setEpForm] = useState<NewEpisodeForm>({ title: '', stage: 'idea', episode_type: 'cornerstone', shoot_date: '', publish_date: '', hook: '', notes: '' });
  const [travForm, setTravForm] = useState<NewTravelForm>({ type: 'flight', title: '', details: '', date_start: '', cost: '', currency: 'USD', booked: false });

  const load = () => {
    fetch(`/api/series/${id}`).then(r => r.json()).then(setSeries);
    fetch(`/api/series/${id}/episodes`).then(r => r.json()).then(setEpisodes);
    fetch(`/api/series/${id}/milestones`).then(r => r.json()).then(setMilestones);
    fetch(`/api/series/${id}/travel`).then(r => r.json()).then(setTravel);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (series) setEditStatus(series.status); }, [series]);

  const updateStatus = async (status: string) => {
    await fetch(`/api/series/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setEditStatus(status);
    setSeries(prev => prev ? { ...prev, status } : prev);
  };

  const toggleMilestone = async (msId: number, completed: boolean) => {
    await fetch(`/api/series/${id}/milestones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId: msId, completed }),
    });
    setMilestones(prev => prev.map(m => m.id === msId ? { ...m, completed: completed ? 1 : 0 } : m));
  };

  const createEpisode = async () => {
    if (!epForm.title) return;
    await fetch(`/api/series/${id}/episodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(epForm),
    });
    setShowNewEpisode(false);
    setEpForm({ title: '', stage: 'idea', episode_type: 'cornerstone', shoot_date: '', publish_date: '', hook: '', notes: '' });
    load();
  };

  const createTravel = async () => {
    if (!travForm.title) return;
    await fetch(`/api/series/${id}/travel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...travForm, cost: parseFloat(travForm.cost) || 0 }),
    });
    setShowNewTravel(false);
    setTravForm({ type: 'flight', title: '', details: '', date_start: '', cost: '', currency: 'USD', booked: false });
    load();
  };

  if (!series) return <div style={{ color: 'var(--text-dim)', padding: 32 }}>Loading...</div>;

  const statusCfg = STATUS_CONFIG[series.status] || STATUS_CONFIG.ideation;
  const completedMs = milestones.filter(m => m.completed).length;
  const totalMs = milestones.length;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => router.push('/production/series')} style={{ padding: '6px 8px' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>{series.title}</h1>
            <select
              value={editStatus}
              onChange={e => updateStatus(e.target.value)}
              style={{
                width: 'auto', padding: '2px 8px', fontSize: 11, fontWeight: 600,
                color: statusCfg.color, background: 'transparent',
                border: `1px solid ${statusCfg.color}`, borderRadius: 10, cursor: 'pointer',
              }}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            {series.location && (
              <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> {series.location}
              </span>
            )}
            {series.target_shoot_start && (
              <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} /> {formatDate(series.target_shoot_start)} — {formatDate(series.target_shoot_end)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {['overview', 'episodes', 'milestones', 'travel', 'team'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'episodes' && <span style={{ marginLeft: 5, fontSize: 11, color: 'var(--text-dim)' }}>{episodes.length}</span>}
            {t === 'milestones' && <span style={{ marginLeft: 5, fontSize: 11, color: 'var(--text-dim)' }}>{completedMs}/{totalMs}</span>}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="section-label" style={{ marginBottom: 4 }}>Budget Target</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>${(series.budget_target || 0).toLocaleString()}</div>
              {(series.budget_actual || 0) > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Actual: ${series.budget_actual.toLocaleString()}</div>
              )}
            </div>
            <div className="stat-card">
              <div className="section-label" style={{ marginBottom: 4 }}>Pre-Prod Progress</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0}%</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{completedMs}/{totalMs} milestones</div>
            </div>
          </div>
          {series.notes && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Notes</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-dim)' }}>{series.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Episodes */}
      {activeTab === 'episodes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowNewEpisode(true)}>
              <Plus size={14} /> Add Episode
            </button>
          </div>
          {!episodes.length ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
              <p>No episodes yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {episodes.map(ep => {
                const stageCfg = STAGE_CONFIG[ep.stage] || STAGE_CONFIG.idea;
                return (
                  <div key={ep.id} style={{
                    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                    padding: 12, display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div className="status-dot" style={{ background: stageCfg.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{ep.title}</div>
                      {ep.hook && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{ep.hook}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: stageCfg.color }}>{stageCfg.label}</span>
                      {ep.editor_name && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{ep.editor_name}</span>}
                      {ep.publish_date && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(ep.publish_date)}</span>}
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 10,
                        color: ep.episode_type === 'cornerstone' ? 'var(--accent)' : 'var(--text-dim)',
                        background: ep.episode_type === 'cornerstone' ? 'rgba(163,113,247,0.1)' : 'rgba(139,148,158,0.1)',
                        fontWeight: 600,
                      }}>
                        {ep.episode_type === 'cornerstone' ? 'CORE' : 'SEC'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Milestones */}
      {activeTab === 'milestones' && (
        <div>
          {Array.from(new Set(milestones.map(m => m.week_number))).sort((a, b) => a - b).map(week => (
            <div key={week} style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 8 }}>
                Week {week < 0 ? week : `+${week}`} ({week < 0 ? `${Math.abs(week)} weeks before shoot` : `${week} weeks after`})
              </div>
              {milestones.filter(m => m.week_number === week).map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 4,
                  opacity: m.completed ? 0.6 : 1,
                }}>
                  <input type="checkbox" checked={!!m.completed} onChange={e => toggleMilestone(m.id, e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--text-dim)' : 'var(--text)' }}>
                    {m.title}
                  </span>
                  {m.due_date && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(m.due_date)}</span>}
                </div>
              ))}
            </div>
          ))}
          {!milestones.length && (
            <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Milestones are auto-generated when a shoot date is set.</p>
          )}
        </div>
      )}

      {/* Travel */}
      {activeTab === 'travel' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowNewTravel(true)}>
              <Plus size={14} /> Add Travel
            </button>
          </div>
          {!travel.length ? (
            <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>No travel items yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {travel.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                }}>
                  <Plane size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{t.type}</div>
                  </div>
                  {t.date_start && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDate(t.date_start)}</span>}
                  {t.cost > 0 && <span style={{ fontSize: 12 }}>${t.cost} {t.currency}</span>}
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 600,
                    color: t.booked ? 'var(--green)' : 'var(--orange)',
                    background: t.booked ? 'rgba(63,185,80,0.1)' : 'rgba(210,153,34,0.1)',
                  }}>
                    {t.booked ? 'BOOKED' : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { role: 'Fixer', name: series.fixer_name },
            { role: 'Producer', name: series.producer_name },
            { role: 'Camera', name: series.camera_name },
          ].map(m => (
            <div key={m.role} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12,
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', width: 70 }}>{m.role.toUpperCase()}</span>
              <span style={{ fontSize: 13 }}>{m.name || <span style={{ color: 'var(--text-dim)' }}>Unassigned</span>}</span>
            </div>
          ))}
        </div>
      )}

      {/* New Episode Modal */}
      {showNewEpisode && (
        <div className="modal-overlay" onClick={() => setShowNewEpisode(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Add Episode</h2>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input value={epForm.title} onChange={e => setEpForm(f => ({ ...f, title: e.target.value }))} placeholder="Episode title" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Stage</label>
                <select value={epForm.stage} onChange={e => setEpForm(f => ({ ...f, stage: e.target.value }))}>
                  {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select value={epForm.episode_type} onChange={e => setEpForm(f => ({ ...f, episode_type: e.target.value }))}>
                  <option value="cornerstone">Cornerstone</option>
                  <option value="secondary">Secondary</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Shoot Date</label>
                <input type="date" value={epForm.shoot_date} onChange={e => setEpForm(f => ({ ...f, shoot_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Publish Date</label>
                <input type="date" value={epForm.publish_date} onChange={e => setEpForm(f => ({ ...f, publish_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Hook</label>
              <input value={epForm.hook} onChange={e => setEpForm(f => ({ ...f, hook: e.target.value }))} placeholder="Video hook / hook concept" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNewEpisode(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createEpisode}>Add Episode</button>
            </div>
          </div>
        </div>
      )}

      {/* New Travel Modal */}
      {showNewTravel && (
        <div className="modal-overlay" onClick={() => setShowNewTravel(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Add Travel Item</h2>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select value={travForm.type} onChange={e => setTravForm(f => ({ ...f, type: e.target.value }))}>
                  {['flight', 'hotel', 'transport', 'permit', 'other'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" value={travForm.date_start} onChange={e => setTravForm(f => ({ ...f, date_start: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input value={travForm.title} onChange={e => setTravForm(f => ({ ...f, title: e.target.value }))} placeholder="Flight HAN→BKK, etc." />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Cost</label>
                <input type="number" value={travForm.cost} onChange={e => setTravForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select value={travForm.currency} onChange={e => setTravForm(f => ({ ...f, currency: e.target.value }))}>
                  {['USD', 'VND', 'EUR', 'GBP', 'AUD', 'THB'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="booked" checked={travForm.booked} onChange={e => setTravForm(f => ({ ...f, booked: e.target.checked }))}
                style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <label htmlFor="booked" style={{ fontSize: 13, cursor: 'pointer' }}>Already booked</label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNewTravel(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createTravel}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
