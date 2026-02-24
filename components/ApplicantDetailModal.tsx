'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, Star } from 'lucide-react';

interface Applicant {
  id: number;
  position_id: number;
  position_title: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  portfolio_url: string;
  resume_url: string;
  stage: string;
  screening_score: number;
  screening_notes: string;
  interview_date: string;
  interview_notes: string;
  trial_task_sent_at: string;
  trial_task_received_at: string;
  trial_task_score: number;
  trial_task_notes: string;
  probation_start: string;
  probation_30_day: string;
  probation_60_day: string;
  probation_90_day: string;
  probation_notes: string;
  overall_rating: number;
  communication_rating: number;
  attitude_rating: number;
  motivation_rating: number;
  rejection_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  applicantId: number;
  onClose: () => void;
  onSaved: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  onlinejobs_ph: 'OnlineJobs.ph',
  vietnamworks: 'VietnamWorks',
  referral: 'Referral',
  direct: 'Direct',
  other: 'Other',
};

const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  contacted: 'Contacted',
  trial_sent: 'Trial Sent',
  evaluation: 'Evaluation',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
};

function RatingStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onChange(i === value ? 0 : i)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 1,
            color: i <= value ? 'var(--orange)' : 'var(--border)',
            transition: 'color 0.15s',
          }}
        >
          <Star size={14} fill={i <= value ? 'var(--orange)' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ApplicantDetailModal({ applicantId, onClose, onSaved }: Props) {
  const [app, setApp] = useState<Applicant | null>(null);
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/hiring/applicants/${applicantId}`).then(r => r.json()).then(data => {
      setApp(data);
      // Auto-open Trial tab when in evaluation stage
      if (data?.stage === 'evaluation') {
        setTab('trial');
      }
    });
  }, [applicantId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (key: string, value: string | number) => {
    if (!app) return;
    setApp({ ...app, [key]: value });
  };

  const save = async () => {
    if (!app) return;
    setSaving(true);
    try {
      await fetch(`/api/hiring/applicants/${applicantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this applicant? This cannot be undone.')) return;
    await fetch(`/api/hiring/applicants/${applicantId}`, { method: 'DELETE' });
    onSaved();
    onClose();
  };

  if (!app) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>
      </div>
    </div>
  );

  const tabs = ['info', 'screening', 'interview', 'trial', 'probation', 'notes'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{app.name}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{app.position_title}</span>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                background: stageColor(app.stage) + '18', color: stageColor(app.stage),
              }}>
                {STAGE_LABELS[app.stage] || app.stage}
              </span>
              {app.source && (
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 8,
                  background: 'var(--hover-bg)', color: 'var(--text-dim)',
                }}>
                  {SOURCE_LABELS[app.source] || app.source}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ padding: '0 20px', marginBottom: 0 }}>
          {tabs.map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {tab === 'info' && (
            <>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input value={app.name} onChange={e => update('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input value={app.email} onChange={e => update('email', e.target.value)} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input value={app.phone} onChange={e => update('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select value={app.source} onChange={e => update('source', e.target.value)}>
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
                  <label className="form-label">Portfolio</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={app.portfolio_url} onChange={e => update('portfolio_url', e.target.value)} style={{ flex: 1 }} />
                    {app.portfolio_url && (
                      <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', flexShrink: 0 }}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Resume</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={app.resume_url} onChange={e => update('resume_url', e.target.value)} style={{ flex: 1 }} />
                    {app.resume_url && (
                      <a href={app.resume_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', flexShrink: 0 }}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Ratings */}
              <div style={{ marginTop: 8, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 10 }}>RATINGS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Overall</span>
                    <RatingStars value={app.overall_rating} onChange={v => update('overall_rating', v)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Communication</span>
                    <RatingStars value={app.communication_rating} onChange={v => update('communication_rating', v)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Attitude</span>
                    <RatingStars value={app.attitude_rating} onChange={v => update('attitude_rating', v)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Motivation</span>
                    <RatingStars value={app.motivation_rating} onChange={v => update('motivation_rating', v)} />
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 10 }}>TIMELINE</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <TimelineRow label="Applied" date={app.created_at} />
                  {app.interview_date && <TimelineRow label="Interview" date={app.interview_date} />}
                  {app.trial_task_sent_at && <TimelineRow label="Trial Sent" date={app.trial_task_sent_at} />}
                  {app.trial_task_received_at && <TimelineRow label="Trial Received" date={app.trial_task_received_at} />}
                  {app.probation_start && <TimelineRow label="Probation Start" date={app.probation_start} />}
                  {app.probation_30_day && <TimelineRow label="30-Day Review" date={app.probation_30_day} />}
                  {app.probation_60_day && <TimelineRow label="60-Day Review" date={app.probation_60_day} />}
                  {app.probation_90_day && <TimelineRow label="90-Day Review" date={app.probation_90_day} />}
                </div>
              </div>
            </>
          )}

          {tab === 'screening' && (
            <>
              <div className="form-group">
                <label className="form-label">Screening Score (0-100)</label>
                <input type="number" min={0} max={100} value={app.screening_score} onChange={e => update('screening_score', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Screening Notes</label>
                <textarea value={app.screening_notes} onChange={e => update('screening_notes', e.target.value)} rows={6} placeholder="Notes from initial screening..." />
              </div>
            </>
          )}

          {tab === 'interview' && (
            <>
              <div className="form-group">
                <label className="form-label">Interview Date</label>
                <input type="date" value={app.interview_date || ''} onChange={e => update('interview_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Interview Notes</label>
                <textarea value={app.interview_notes} onChange={e => update('interview_notes', e.target.value)} rows={6} placeholder="Notes from interview..." />
              </div>
            </>
          )}

          {tab === 'trial' && (
            <>
              {/* Submission content first — this is what you want to review */}
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>SUBMISSION</div>
                {app.trial_task_notes || app.notes ? (
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {(() => {
                      // Extract links from notes
                      const allNotes = [app.trial_task_notes, app.notes].filter(Boolean).join('\n');
                      const urlRegex = /(https?:\/\/[^\s,)]+)/g;
                      const links = allNotes.match(urlRegex);
                      return (
                        <>
                          {links && links.length > 0 && (
                            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {links.map((link, i) => (
                                <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                                  style={{ color: 'var(--blue)', fontSize: 13, wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <ExternalLink size={13} style={{ flexShrink: 0 }} />
                                  {link.includes('docs.google.com') ? 'Google Doc' :
                                   link.includes('drive.google.com') ? 'Google Drive' :
                                   link.includes('youtube.com') || link.includes('youtu.be') ? 'YouTube' :
                                   link.includes('vimeo.com') ? 'Vimeo' :
                                   link}
                                </a>
                              ))}
                            </div>
                          )}
                          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{allNotes}</div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    No submission received yet
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="form-group">
                <label className="form-label">Your Score (0-100)</label>
                <input type="number" min={0} max={100} value={app.trial_task_score} onChange={e => update('trial_task_score', Number(e.target.value))} />
              </div>

              {/* Evaluation notes */}
              <div className="form-group">
                <label className="form-label">Your Evaluation Notes</label>
                <textarea value={app.trial_task_notes} onChange={e => update('trial_task_notes', e.target.value)} rows={5} placeholder="What did you think of their work?" />
              </div>

              {/* Dates collapsed at bottom */}
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer' }}>Timeline details</summary>
                <div className="grid-2" style={{ marginTop: 8 }}>
                  <div className="form-group">
                    <label className="form-label">Task Sent</label>
                    <input type="date" value={app.trial_task_sent_at || ''} onChange={e => update('trial_task_sent_at', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Task Received</label>
                    <input type="date" value={app.trial_task_received_at || ''} onChange={e => update('trial_task_received_at', e.target.value)} />
                  </div>
                </div>
              </details>
            </>
          )}

          {tab === 'probation' && (
            <>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Probation Start</label>
                  <input type="date" value={app.probation_start || ''} onChange={e => update('probation_start', e.target.value)} />
                </div>
                <div className="form-group" />
              </div>
              <div className="grid-3" style={{ marginBottom: 14 }}>
                <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>30-DAY</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{formatDate(app.probation_30_day)}</div>
                </div>
                <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>60-DAY</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{formatDate(app.probation_60_day)}</div>
                </div>
                <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>90-DAY</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{formatDate(app.probation_90_day)}</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Probation Notes</label>
                <textarea value={app.probation_notes} onChange={e => update('probation_notes', e.target.value)} rows={5} placeholder="Performance observations during probation..." />
              </div>
            </>
          )}

          {tab === 'notes' && (
            <>
              <div className="form-group">
                <label className="form-label">General Notes</label>
                <textarea value={app.notes} onChange={e => update('notes', e.target.value)} rows={8} placeholder="Any additional notes..." />
              </div>
              {app.rejection_reason && (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--red)' }}>Rejection Reason</label>
                  <textarea value={app.rejection_reason} onChange={e => update('rejection_reason', e.target.value)} rows={3} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--red)', fontSize: 12 }}>
            Delete
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ label, date }: { label: string; date: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 100 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text)' }}>{formatDate(date)}</span>
    </div>
  );
}

function stageColor(stage: string): string {
  const colors: Record<string, string> = {
    applied: '#58a6ff',
    contacted: '#d29922',
    trial_sent: '#a371f7',
    evaluation: '#58a6ff',
    interview: '#d29922',
    hired: '#3fb950',
    rejected: '#f85149',
  };
  return colors[stage] || '#7d8590';
}
