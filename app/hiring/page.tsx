'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight, Briefcase, Clock, GripVertical } from 'lucide-react';
import NewPositionModal from '@/components/NewPositionModal';
import NewApplicantModal from '@/components/NewApplicantModal';
import ApplicantDetailModal from '@/components/ApplicantDetailModal';

interface Position {
  id: number;
  title: string;
  role_type: string;
  status: string;
  applicant_count: number;
  applied_count: number;
  contacted_count: number;
  trial_sent_count: number;
  evaluation_count: number;
  interview_count: number;
  hired_count: number;
  rejected_count: number;
}

interface Applicant {
  id: number;
  position_id: number;
  position_title: string;
  role_type?: string;
  name: string;
  email: string;
  source: string;
  stage: string;
  overall_rating: number;
  communication_rating: number;
  attitude_rating: number;
  motivation_rating: number;
  screening_score: number;
  trial_task_score: number;
  portfolio_score: number;
  created_at: string;
  updated_at: string;
}

// Default stage labels (Content Ops Manager flow)
const DEFAULT_STAGES = [
  { key: 'applied', label: 'Applied', color: '#58a6ff' },
  { key: 'contacted', label: 'Contacted', color: '#d29922' },
  { key: 'trial_sent', label: 'Trial Sent', color: '#a371f7' },
  { key: 'evaluation', label: 'Evaluation', color: '#58a6ff' },
  { key: 'interview', label: 'Interview', color: '#d29922' },
  { key: 'hired', label: 'Hired', color: '#3fb950' },
];

// Editor positions use portfolio-based screening instead of trial tasks
const EDITOR_STAGES = [
  { key: 'applied', label: 'Applied', color: '#58a6ff' },
  { key: 'contacted', label: 'Portfolio Requested', color: '#d29922' },
  { key: 'trial_sent', label: 'Portfolio Received', color: '#a371f7' },
  { key: 'evaluation', label: 'Portfolio Review', color: '#2f9e44' },
  { key: 'interview', label: 'Interview', color: '#d29922' },
  { key: 'hired', label: 'Hired', color: '#3fb950' },
];

function getStagesForPosition(positions: Position[], selectedPosition: number | null): typeof DEFAULT_STAGES {
  if (!selectedPosition) return DEFAULT_STAGES;
  const pos = positions.find(p => p.id === selectedPosition);
  if (pos?.role_type === 'editor') return EDITOR_STAGES;
  return DEFAULT_STAGES;
}

// Keep a reference for non-filtered views
const STAGES = DEFAULT_STAGES;

const REJECTED_STAGE = { key: 'rejected', label: 'Rejected', color: '#f85149' };

const SOURCE_LABELS: Record<string, string> = {
  onlinejobs_ph: 'OLJ.ph',
  vietnamworks: 'VNWorks',
  referral: 'Referral',
  direct: 'Direct',
  other: 'Other',
};

const SOURCE_COLORS: Record<string, string> = {
  onlinejobs_ph: '#58a6ff',
  vietnamworks: '#3fb950',
  referral: '#a371f7',
  direct: '#d29922',
  other: '#7d8590',
};

const ROLE_COLORS: Record<string, string> = {
  producer: '#a371f7',
  editor: '#58a6ff',
  fixer: '#3fb950',
  camera: '#d29922',
  other: '#7d8590',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#3fb950',
  paused: '#d29922',
  filled: '#58a6ff',
  cancelled: '#f85149',
};

function daysInStage(updatedAt: string): number {
  if (!updatedAt) return 0;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function RatingDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: i < value ? 'var(--orange)' : 'var(--border)',
        }} />
      ))}
    </div>
  );
}

export default function HiringPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [showNewApplicant, setShowNewApplicant] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState<number | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Prompt states for stage transitions
  const [interviewPrompt, setInterviewPrompt] = useState<{ applicantId: number; date: string } | null>(null);
  const [rejectionPrompt, setRejectionPrompt] = useState<{ applicantId: number; reason: string } | null>(null);

  const loadPositions = useCallback(() => {
    fetch('/api/hiring/positions').then(r => r.json()).then(setPositions);
  }, []);

  const loadApplicants = useCallback(() => {
    const url = selectedPosition
      ? `/api/hiring/applicants?position_id=${selectedPosition}`
      : '/api/hiring/applicants';
    fetch(url).then(r => r.json()).then(setApplicants);
  }, [selectedPosition]);

  useEffect(() => { loadPositions(); }, [loadPositions]);
  useEffect(() => { loadApplicants(); }, [loadApplicants]);

  const moveApplicant = async (applicantId: number, newStage: string, extra?: Record<string, string>) => {
    await fetch(`/api/hiring/applicants/${applicantId}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage, ...extra }),
    });
    // Optimistic update
    setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, stage: newStage, updated_at: new Date().toISOString() } : a));
    loadPositions();
  };

  const handleDrop = async (stageKey: string) => {
    if (dragging === null) return;
    const applicant = applicants.find(a => a.id === dragging);
    if (!applicant || applicant.stage === stageKey) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    // Handle special stage transitions
    if (stageKey === 'interview') {
      setInterviewPrompt({ applicantId: dragging, date: '' });
      setDragging(null);
      setDragOver(null);
      return;
    }

    if (stageKey === 'rejected') {
      setRejectionPrompt({ applicantId: dragging, reason: '' });
      setDragging(null);
      setDragOver(null);
      return;
    }

    await moveApplicant(dragging, stageKey);
    setDragging(null);
    setDragOver(null);
  };

  const confirmInterview = async () => {
    if (!interviewPrompt) return;
    await moveApplicant(interviewPrompt.applicantId, 'interview', {
      interview_date: interviewPrompt.date,
    });
    setInterviewPrompt(null);
  };

  const confirmRejection = async () => {
    if (!rejectionPrompt) return;
    await moveApplicant(rejectionPrompt.applicantId, 'rejected', {
      rejection_reason: rejectionPrompt.reason,
    });
    setRejectionPrompt(null);
  };

  const filteredApplicants = applicants;

  const renderColumn = (stage: { key: string; label: string; color: string }) => {
    const stageApps = filteredApplicants.filter(a => a.stage === stage.key);
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
        {/* Column header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: 0.3 }}>{stage.label.toUpperCase()}</span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
            background: 'var(--border)', color: 'var(--text-dim)',
          }}>
            {stageApps.length}
          </span>
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40, flex: 1, overflowY: 'auto' }}>
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
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                {/* Name */}
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <GripVertical size={10} style={{ color: 'var(--border)', flexShrink: 0 }} />
                  {app.name}
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {/* Source badge */}
                  {app.source && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 6,
                      background: (SOURCE_COLORS[app.source] || '#7d8590') + '18',
                      color: SOURCE_COLORS[app.source] || '#7d8590',
                    }}>
                      {SOURCE_LABELS[app.source] || app.source}
                    </span>
                  )}

                  {/* Position title (when no filter) */}
                  {!selectedPosition && app.position_title && (
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                      {app.position_title}
                    </span>
                  )}

                  {/* Days in stage */}
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                    <Clock size={8} /> {days}d
                  </span>
                </div>

                {/* Trial/Portfolio score badge */}
                {app.role_type === 'editor' ? (
                  app.portfolio_score > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                        background: app.portfolio_score >= 7 ? '#3fb95025' : app.portfolio_score >= 4 ? '#d2992225' : '#f8514925',
                        color: app.portfolio_score >= 7 ? '#3fb950' : app.portfolio_score >= 4 ? '#d29922' : '#f85149',
                      }}>
                        Portfolio {app.portfolio_score}/10
                      </span>
                    </div>
                  )
                ) : (
                  app.trial_task_score > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                        background: app.trial_task_score >= 7 ? '#3fb95025' : app.trial_task_score >= 4 ? '#d2992225' : '#f8514925',
                        color: app.trial_task_score >= 7 ? '#3fb950' : app.trial_task_score >= 4 ? '#d29922' : '#f85149',
                      }}>
                        {app.trial_task_score}/10
                      </span>
                    </div>
                  )
                )}

                {/* Rating dots */}
                {app.overall_rating > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <RatingDots value={app.overall_rating} />
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Hiring</h1>
          <a href="/docs/hiring-flow"
             style={{ fontSize: 11, color: 'var(--text-dim)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            📋 Content Ops Manager Flow
          </a>
          <a href="/docs/junior-editor-flow"
             style={{ fontSize: 11, color: 'var(--text-dim)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            🎬 Junior Editor Flow
          </a>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowNewApplicant(true)}>
            <Plus size={14} /> Applicant
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewPosition(true)}>
            <Plus size={14} /> Position
          </button>
        </div>
      </div>

      {/* Position cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', flexShrink: 0, paddingBottom: 4 }}>
        {/* All filter */}
        <button
          onClick={() => setSelectedPosition(null)}
          style={{
            background: !selectedPosition ? 'rgba(163,113,247,0.12)' : 'var(--card)',
            border: `1px solid ${!selectedPosition ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
            minWidth: 120, textAlign: 'left', transition: 'border-color 0.15s',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: !selectedPosition ? 'var(--accent)' : 'var(--text)', marginBottom: 2 }}>All Positions</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{applicants.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>applicants</div>
        </button>

        {positions.map(pos => {
          const active = selectedPosition === pos.id;
          const roleColor = ROLE_COLORS[pos.role_type] || '#7d8590';
          const statusColor = STATUS_COLORS[pos.status] || '#7d8590';
          return (
            <button
              key={pos.id}
              onClick={() => setSelectedPosition(active ? null : pos.id)}
              style={{
                background: active ? 'rgba(163,113,247,0.12)' : 'var(--card)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
                minWidth: 160, textAlign: 'left', transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Briefcase size={11} style={{ color: roleColor }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text)' }}>{pos.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 6,
                  background: roleColor + '18', color: roleColor,
                }}>
                  {pos.role_type}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 6,
                  background: statusColor + '18', color: statusColor,
                }}>
                  {pos.status}
                </span>
              </div>
              {/* Mini pipeline */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {[
                  { count: pos.applied_count, color: '#58a6ff' },
                  { count: pos.contacted_count, color: '#d29922' },
                  { count: pos.trial_sent_count, color: '#a371f7' },
                  { count: pos.evaluation_count, color: '#58a6ff' },
                  { count: pos.interview_count, color: '#d29922' },
                  { count: pos.hired_count, color: '#3fb950' },
                ].map((s, i) => (
                  <div key={i} style={{
                    width: 14, height: 14, borderRadius: 3, fontSize: 8, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: s.count > 0 ? s.color + '25' : 'var(--hover-bg)',
                    color: s.count > 0 ? s.color : 'var(--border)',
                  }}>
                    {s.count}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', flex: 1, paddingBottom: 16, minHeight: 0, overflow: 'hidden' }}>
        {getStagesForPosition(positions, selectedPosition).map(stage => renderColumn(stage))}

        {/* Rejected column - collapsible */}
        {showRejected ? (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 220, maxWidth: 260, flex: '0 0 240px' }}>
            <button
              onClick={() => setShowRejected(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)',
                fontSize: 11, fontWeight: 600, marginBottom: 4, padding: 0,
              }}
            >
              <ChevronDown size={12} /> HIDE REJECTED
            </button>
            {renderColumn(REJECTED_STAGE)}
          </div>
        ) : (
          <button
            onClick={() => setShowRejected(true)}
            style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '12px 10px', cursor: 'pointer', minWidth: 44, maxWidth: 44,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          >
            <ChevronRight size={12} style={{ color: 'var(--red)' }} />
            <span style={{
              writingMode: 'vertical-rl', fontSize: 10, fontWeight: 600,
              color: 'var(--red)', letterSpacing: 0.5,
            }}>
              REJECTED
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 8,
              background: '#f8514918', color: 'var(--red)',
            }}>
              {filteredApplicants.filter(a => a.stage === 'rejected').length}
            </span>
          </button>
        )}
      </div>

      {/* Modals */}
      {showNewPosition && (
        <NewPositionModal
          onClose={() => setShowNewPosition(false)}
          onCreated={() => { setShowNewPosition(false); loadPositions(); }}
        />
      )}

      {showNewApplicant && positions.length > 0 && (
        <NewApplicantModal
          positions={positions}
          defaultPositionId={selectedPosition || undefined}
          onClose={() => setShowNewApplicant(false)}
          onCreated={() => { setShowNewApplicant(false); loadApplicants(); loadPositions(); }}
        />
      )}

      {selectedApplicantId !== null && (
        <ApplicantDetailModal
          applicantId={selectedApplicantId}
          onClose={() => setSelectedApplicantId(null)}
          onSaved={() => { loadApplicants(); loadPositions(); }}
        />
      )}

      {/* Interview date prompt */}
      {interviewPrompt && (
        <div className="modal-overlay" onClick={() => setInterviewPrompt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Schedule Interview</h3>
            <div className="form-group">
              <label className="form-label">Interview Date</label>
              <input
                type="date"
                value={interviewPrompt.date}
                onChange={e => setInterviewPrompt({ ...interviewPrompt, date: e.target.value })}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setInterviewPrompt(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmInterview}>Move to Interview</button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection reason prompt */}
      {rejectionPrompt && (
        <div className="modal-overlay" onClick={() => setRejectionPrompt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Reject Applicant</h3>
            <div className="form-group">
              <label className="form-label">Reason for Rejection</label>
              <textarea
                value={rejectionPrompt.reason}
                onChange={e => setRejectionPrompt({ ...rejectionPrompt, reason: e.target.value })}
                rows={3}
                placeholder="Why is this applicant being rejected?"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setRejectionPrompt(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmRejection} style={{ background: 'var(--red)', borderColor: 'var(--red)' }}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
