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
  screening_score: number;
  trial_task_score: number;
  screening_notes: string;
  trial_task_notes: string;
  desired_salary: string;
  experience: string;
  created_at: string;
  updated_at: string;
}

interface Position {
  id: number;
  title: string;
}

const STAGES = [
  { key: 'applied', label: 'Applied', color: '#58a6ff' },
  { key: 'contacted', label: 'Contacted', color: '#d29922' },
  { key: 'trial_sent', label: 'Trial Sent', color: '#a371f7' },
  { key: 'evaluation', label: 'Evaluation', color: '#58a6ff' },
  { key: 'interview', label: 'Interview', color: '#d29922' },
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

export default function OpsHiringPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState<number | null>(null);
  const [showNewApplicant, setShowNewApplicant] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const loadApplicants = useCallback(() => {
    fetch('/api/hiring/applicants?role_type=producer').then(r => r.json()).then(setApplicants);
  }, []);

  const loadPositions = useCallback(() => {
    fetch('/api/hiring/positions').then(r => r.json()).then(data => {
      setPositions(data.filter((p: Position & { role_type: string }) => p.role_type === 'producer'));
    });
  }, []);

  useEffect(() => { loadApplicants(); loadPositions(); }, [loadApplicants, loadPositions]);

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
    const stageApps = applicants.filter(a => a.stage === stage.key);
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
                  const score = typeof app.trial_task_score === 'string' ? parseInt(app.trial_task_score, 10) || 0 : app.trial_task_score || 0;
                  return score > 0 ? (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                        background: score >= 7 ? '#3fb95025' : score >= 4 ? '#d2992225' : '#f8514925',
                        color: score >= 7 ? '#3fb950' : score >= 4 ? '#d29922' : '#f85149',
                      }}>
                        {score}/10
                      </span>
                    </div>
                  ) : null;
                })()}
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
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Content Operations Hiring</h1>
        <button className="btn btn-secondary" onClick={() => setShowNewApplicant(true)}>
          <Plus size={14} /> Applicant
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', flex: 1, paddingBottom: 16, minHeight: 0, overflow: 'hidden' }}>
        {STAGES.map(renderColumn)}
        <div
          className="kanban-col"
          style={{
            minWidth: 44, maxWidth: 44, flex: '0 0 44px',
            background: dragOver === 'rejected' ? 'rgba(248,81,73,0.05)' : 'var(--card)',
            borderColor: dragOver === 'rejected' ? '#f85149' : 'var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '12px 10px', cursor: 'pointer',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver('rejected'); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop('rejected')}
        >
          <span style={{ writingMode: 'vertical-rl', fontSize: 10, fontWeight: 600, color: '#f85149', letterSpacing: 0.5 }}>REJECTED</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 8, background: '#f8514918', color: '#f85149' }}>
            {applicants.filter(a => a.stage === 'rejected').length}
          </span>
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
