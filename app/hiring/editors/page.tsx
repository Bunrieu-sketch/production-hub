'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Clock, GripVertical } from 'lucide-react';
import NewApplicantModal from '@/components/NewApplicantModal';
import ApplicantDetailModal from '@/components/ApplicantDetailModal';

interface Applicant {
  id: number;
  position_id: number;
  position_title: string;
  name: string;
  email: string;
  source: string;
  stage: string;
  portfolio_score: number;
  overall_rating: number;
  screening_notes: string;
  portfolio_url: string;
  desired_salary: string;
  experience: string;
  second_round_sub_stage: string | null;
  second_round_trial_score: number;
  created_at: string;
  updated_at: string;
}

interface Position {
  id: number;
  title: string;
}

const STAGES = [
  { key: 'applied', label: 'Applied', color: '#58a6ff' },
  { key: 'contacted', label: 'Portfolio Requested', color: '#d29922' },
  { key: 'evaluation', label: 'Portfolio Review', color: '#a371f7', extraStages: ['trial_sent'] },
  { key: 'interview', label: 'Interview', color: '#d29922' },
  { key: 'second_round', label: 'Second Round', color: '#a371f7' },
  { key: 'hired', label: 'Hired', color: '#3fb950' },
];

const REJECTED_STAGE = { key: 'rejected', label: 'Rejected', color: '#f85149' };

const SOURCE_LABELS: Record<string, string> = {
  onlinejobs_ph: 'OLJ.ph',
  vietnamworks: 'VNWorks',
  referral: 'Referral',
  direct: 'Direct',
  other: 'Other',
};

export default function EditorHiringPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState<number | null>(null);
  const [showNewApplicant, setShowNewApplicant] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ moved_to_interview: string[]; moved_to_rejected: string[] } | null>(null);

  const loadApplicants = useCallback(() => {
    fetch('/api/hiring/applicants?role_type=editor').then(r => r.json()).then(setApplicants);
  }, []);

  const loadPositions = useCallback(() => {
    fetch('/api/hiring/positions').then(r => r.json()).then(data => {
      setPositions(data.filter((p: Position & { role_type: string }) => p.role_type === 'editor'));
    });
  }, []);

  useEffect(() => { loadApplicants(); loadPositions(); }, [loadApplicants, loadPositions]);

  const handleSyncPipeline = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/hiring/sync-pipeline', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      loadApplicants();
      setTimeout(() => setSyncResult(null), 8000);
    } catch {
      alert('Failed to sync pipeline. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDrop = async (stageKey: string) => {
    if (!dragging) return;
    await fetch(`/api/hiring/applicants/${dragging}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: stageKey }),
    });
    setDragging(null);
    setDragOver(null);
    loadApplicants();
  };

  const daysInStage = (updatedAt: string) => {
    const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const renderColumn = (stage: typeof STAGES[0]) => {
    const stageKeys = [stage.key, ...(('extraStages' in stage ? stage.extraStages : []) as string[])];
    const stageApps = applicants.filter(a => stageKeys.includes(a.stage));
    const isOver = dragOver === stage.key;
    return (
      <div
        key={stage.key}
        className="kanban-col"
        style={{
          minWidth: 220, maxWidth: 260, flex: '0 0 240px',
          background: isOver ? 'rgba(163,113,247,0.05)' : 'var(--card)',
          borderColor: isOver ? 'var(--accent)' : 'var(--border)',
          transition: 'border-color 0.15s, background 0.15s',
          display: 'flex', flexDirection: 'column',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => handleDrop(stage.key)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: 0.3 }}>{stage.label.toUpperCase()}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: 'var(--border)', color: 'var(--text-dim)' }}>
            {stageApps.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40, flex: 1 }}>
          {stageApps.map(app => {
            const days = daysInStage(app.updated_at);
            return (
              <div
                key={app.id}
                draggable
                onDragStart={() => setDragging(app.id)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                onClick={() => { if (dragging === null) setSelectedApplicantId(app.id); }}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  cursor: 'grab',
                  opacity: dragging === app.id ? 0.5 : 1,
                  transition: 'transform 0.1s, box-shadow 0.15s',
                  boxShadow: dragging === app.id ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <GripVertical size={12} style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.name}
                  </span>
                  {app.position_id === 3 && (
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: '#a371f725', color: '#a371f7', fontWeight: 600 }}>
                      Senior
                    </span>
                  )}
                  {app.position_id === 2 && (
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: '#58a6ff25', color: '#58a6ff', fontWeight: 600 }}>
                      Junior
                    </span>
                  )}
                  <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: 'var(--border)', color: 'var(--text-dim)' }}>
                    {SOURCE_LABELS[app.source] || app.source}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-dim)' }}>
                  {app.desired_salary && (
                    <span style={{ fontSize: 9 }}>{app.desired_salary.split('(')[0].trim()}</span>
                  )}
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                    <Clock size={8} /> {days}d
                  </span>
                </div>

                {(() => {
                  const portScore = typeof app.portfolio_score === 'string' ? parseInt(app.portfolio_score, 10) || 0 : app.portfolio_score || 0;
                  const interviewScore = typeof app.overall_rating === 'string' ? parseInt(app.overall_rating, 10) || 0 : app.overall_rating || 0;
                  return (portScore > 0 || interviewScore > 0) ? (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {portScore > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                          background: portScore >= 7 ? '#3fb95025' : portScore >= 4 ? '#d2992225' : '#f8514925',
                          color: portScore >= 7 ? '#3fb950' : portScore >= 4 ? '#d29922' : '#f85149',
                        }}>
                          Portfolio {portScore}/10
                        </span>
                      )}
                      {interviewScore > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                          background: interviewScore >= 7 ? '#3fb95025' : interviewScore >= 4 ? '#d2992225' : '#f8514925',
                          color: interviewScore >= 7 ? '#3fb950' : interviewScore >= 4 ? '#d29922' : '#f85149',
                        }}>
                          ★ {interviewScore}/10
                        </span>
                      )}
                    </div>
                  ) : null;
                })()}

                {app.stage === 'second_round' && app.second_round_sub_stage && (
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6,
                      background: app.second_round_sub_stage === 'trial_submitted' ? '#3fb95018' :
                                  app.second_round_sub_stage === 'trial_pending' ? '#d2992218' : '#58a6ff18',
                      color: app.second_round_sub_stage === 'trial_submitted' ? '#3fb950' :
                             app.second_round_sub_stage === 'trial_pending' ? '#d29922' : '#58a6ff',
                      display: 'inline-block', width: 'fit-content',
                    }}>
                      {app.second_round_sub_stage === 'interview' && '🗓 2nd Interview'}
                      {app.second_round_sub_stage === 'trial_pending' && '⏳ Trial Pending'}
                      {app.second_round_sub_stage === 'trial_submitted' && '📬 Trial Submitted'}
                    </span>
                    {app.second_round_trial_score > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                        background: app.second_round_trial_score >= 7 ? '#3fb95025' : app.second_round_trial_score >= 4 ? '#d2992225' : '#f8514925',
                        color: app.second_round_trial_score >= 7 ? '#3fb950' : app.second_round_trial_score >= 4 ? '#d29922' : '#f85149',
                        display: 'inline-block', width: 'fit-content',
                      }}>
                        Score: {app.second_round_trial_score}/10
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Video Editor Hiring</h1>
          <a href="/docs/junior-editor-flow" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', padding: '5px 12px', borderRadius: 6, background: '#7c3aed', fontWeight: 600, display: 'inline-block' }}>📋 Flow</a>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={handleSyncPipeline}
            disabled={syncing}
            style={{ opacity: syncing ? 0.6 : 1 }}
          >
            {syncing ? '⏳ Syncing...' : '🔄 Update Pipeline'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowRejected(v => !v)}
            style={{ color: showRejected ? '#f85149' : undefined, borderColor: showRejected ? '#f85149' : undefined }}
          >
            {showRejected ? '✕ Hide Rejected' : `🗑 Rejected (${applicants.filter(a => a.stage === 'rejected').length})`}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowNewApplicant(true)}>
            <Plus size={14} /> Applicant
          </button>
        </div>
      </div>

      {syncResult && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', marginBottom: 12, fontSize: 12, display: 'flex', gap: 16, alignItems: 'center',
        }}>
          {syncResult.moved_to_interview.length === 0 && syncResult.moved_to_rejected.length === 0 ? (
            <span style={{ color: 'var(--text-dim)' }}>No applicants needed pipeline updates.</span>
          ) : (
            <>
              {syncResult.moved_to_interview.length > 0 && (
                <span style={{ color: '#3fb950' }}>
                  ✅ Interview: {syncResult.moved_to_interview.join(', ')}
                </span>
              )}
              {syncResult.moved_to_rejected.length > 0 && (
                <span style={{ color: '#f85149' }}>
                  ❌ Rejected: {syncResult.moved_to_rejected.join(', ')}
                </span>
              )}
            </>
          )}
          <button onClick={() => setSyncResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', flex: 1, paddingBottom: 16, minHeight: 0 }}>
        {STAGES.map(renderColumn)}
        {/* Rejected — drop target always, expands to show cards when toggled */}
        <div
          className="kanban-col"
          style={{
            minWidth: showRejected ? 220 : 44,
            maxWidth: showRejected ? 260 : 44,
            flex: showRejected ? '0 0 240px' : '0 0 44px',
            background: dragOver === 'rejected' ? 'rgba(248,81,73,0.05)' : 'var(--card)',
            borderColor: dragOver === 'rejected' ? '#f85149' : showRejected ? '#f8514940' : 'var(--border)',
            transition: 'all 0.2s',
            display: 'flex', flexDirection: 'column',
            padding: showRejected ? undefined : '12px 10px',
            alignItems: showRejected ? undefined : 'center',
            gap: showRejected ? undefined : 6,
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver('rejected'); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop('rejected')}
        >
          {showRejected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f85149', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#f85149', letterSpacing: 0.3 }}>REJECTED</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: '#f8514918', color: '#f85149' }}>
                  {applicants.filter(a => a.stage === 'rejected').length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
                {applicants.filter(a => a.stage === 'rejected').map(app => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={() => setDragging(app.id)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    onClick={() => { if (dragging === null) setSelectedApplicantId(app.id); }}
                    style={{
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '8px 10px', cursor: 'pointer', opacity: dragging === app.id ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <GripVertical size={12} style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                      <span style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', paddingLeft: 18 }}>
                      Tap to restore
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <span style={{ writingMode: 'vertical-rl', fontSize: 10, fontWeight: 600, color: '#f85149', letterSpacing: 0.5 }}>REJECTED</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 8, background: '#f8514918', color: '#f85149' }}>
                {applicants.filter(a => a.stage === 'rejected').length}
              </span>
            </>
          )}
        </div>
      </div>

      {selectedApplicantId && (
        <ApplicantDetailModal
          applicantId={selectedApplicantId}
          onClose={() => setSelectedApplicantId(null)}
          onSaved={() => { loadApplicants(); setSelectedApplicantId(null); }}
        />
      )}

      {showNewApplicant && (
        <NewApplicantModal
          positions={positions}
          onClose={() => setShowNewApplicant(false)}
          onCreated={() => { setShowNewApplicant(false); loadApplicants(); }}
        />
      )}
    </div>
  );
}
