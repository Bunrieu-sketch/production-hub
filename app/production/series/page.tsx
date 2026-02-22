import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  ideation: "#8b949e",
  pre_prod: "#d29922",
  shooting: "#58a6ff",
  post_prod: "#a371f7",
  published: "#3fb950",
  archived: "#8b949e",
};

const STATUS_LABELS: Record<string, string> = {
  ideation: "Ideation",
  pre_prod: "Pre-Prod",
  shooting: "Shooting",
  post_prod: "Editing",
  published: "Published",
  archived: "Archived",
};

// Phase milestone definitions — maps series.status to which phases are completed
const PHASES = [
  { key: 'pre_prod', label: 'Pre-Prod', milestone: 'Pre-Production', color: '#d29922' },
  { key: 'shooting', label: 'Shooting', milestone: 'Shooting', color: '#58a6ff' },
  { key: 'post_prod', label: 'Editing', milestone: 'Editing', color: '#a371f7' },
  { key: 'published', label: 'Publish', milestone: 'Publish', color: '#3fb950' },
];

// Returns phase index for a given series status (-1 = before all phases)
function getPhaseIndex(status: string): number {
  switch (status) {
    case 'pre_prod': return 0;
    case 'shooting': return 1;
    case 'post_prod': return 2;
    case 'published': return 3;
    case 'archived': return 3; // treat as fully done
    default: return -1; // ideation = before pre-prod
  }
}

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return d; }
}

function formatMoney(n: number | null) {
  if (!n) return null;
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface MilestoneRow {
  title: string;
  due_date: string | null;
  completed: number;
}

export default async function SeriesPage() {
  const db = getDb();
  const series = db.prepare(`
    SELECT s.*
    FROM series s ORDER BY
      CASE s.status
        WHEN 'shooting' THEN 1
        WHEN 'post_prod' THEN 2
        WHEN 'pre_prod' THEN 3
        WHEN 'ideation' THEN 4
        WHEN 'published' THEN 5
        WHEN 'archived' THEN 6
      END,
      s.target_shoot_start ASC
  `).all() as any[];

  // Fetch milestones for all series
  const milestonesStmt = db.prepare(
    `SELECT title, due_date, completed FROM milestones WHERE series_id = ? AND title IN ('Pre-Production', 'Shooting', 'Editing', 'Publish')`
  );

  const seriesMilestones: Record<number, Record<string, MilestoneRow>> = {};
  for (const s of series) {
    const rows = milestonesStmt.all(s.id) as MilestoneRow[];
    const map: Record<string, MilestoneRow> = {};
    for (const r of rows) map[r.title] = r;
    seriesMilestones[s.id] = map;
  }

  return (
    <div className="page">
      <style>{`
        @keyframes phase-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); }
        }
      `}</style>
      <div>
        <div className="page-title">Productions</div>
        <div className="muted">Manage every production and its milestones</div>
      </div>

      <div className="list" style={{ gap: "12px" }}>
        {series.map((s: any) => {
          const color = STATUS_COLORS[s.status] || "#8b949e";
          const activePhaseIdx = getPhaseIndex(s.status);
          const milestones = seriesMilestones[s.id] || {};

          return (
            <Link key={s.id} href={`/production/series/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card card-hover" style={{ borderLeft: `4px solid ${color}`, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span className="badge" style={{
                        background: `${color}22`,
                        borderColor: `${color}66`,
                        color: color,
                        fontWeight: 600,
                      }}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                      <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
                        {s.title}
                      </span>
                    </div>
                    <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px" }}>
                      {s.location && <span>{s.location}</span>}
                      {s.editor && <span>Editor: {s.editor}</span>}
                      {s.budget_target > 0 && (
                        <span>Budget: {formatMoney(s.budget_target)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phase Milestone Bar */}
                <div style={{ marginTop: "14px", padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
                    {/* Connecting line */}
                    <div style={{
                      position: "absolute",
                      top: "7px",
                      left: "7px",
                      right: "7px",
                      height: "2px",
                      background: "var(--border)",
                      zIndex: 0,
                    }} />
                    {/* Completed portion of line */}
                    {activePhaseIdx >= 0 && (
                      <div style={{
                        position: "absolute",
                        top: "7px",
                        left: "7px",
                        width: `${(Math.min(activePhaseIdx, PHASES.length - 1) / (PHASES.length - 1)) * 100}%`,
                        height: "2px",
                        background: PHASES[Math.min(activePhaseIdx, PHASES.length - 1)].color,
                        zIndex: 1,
                        transition: "width 0.3s",
                      }} />
                    )}

                    {PHASES.map((phase, i) => {
                      const ms = milestones[phase.milestone];
                      const isCompleted = i < activePhaseIdx || (i === activePhaseIdx && s.status === 'published') || (i === activePhaseIdx && s.status === 'archived') || (ms?.completed === 1);
                      const isActive = i === activePhaseIdx && !isCompleted;
                      const isFuture = !isCompleted && !isActive;
                      const dotColor = isFuture ? '#484f58' : phase.color;

                      return (
                        <div key={phase.key} style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          position: "relative",
                          zIndex: 2,
                        }}>
                          {/* Dot */}
                          <div style={{
                            width: isActive ? "14px" : "14px",
                            height: isActive ? "14px" : "14px",
                            borderRadius: "50%",
                            background: isCompleted || isActive ? dotColor : 'transparent',
                            border: `2px solid ${dotColor}`,
                            animation: isActive ? "phase-pulse 2s ease-in-out infinite" : "none",
                            boxShadow: isActive ? `0 0 0 3px ${dotColor}44` : "none",
                            transition: "all 0.3s",
                          }} />
                          {/* Label */}
                          <span style={{
                            fontSize: "10px",
                            marginTop: "4px",
                            color: isFuture ? "#484f58" : dotColor,
                            fontWeight: isActive ? 600 : 400,
                            whiteSpace: "nowrap",
                          }}>
                            {phase.label}
                          </span>
                          {/* Due date */}
                          {ms?.due_date && (
                            <span style={{
                              fontSize: "9px",
                              color: isFuture ? "#484f58" : "#8b949e",
                              marginTop: "1px",
                              whiteSpace: "nowrap",
                            }}>
                              {formatDate(ms.due_date)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {series.length === 0 && (
          <div className="panel muted" style={{ textAlign: "center", padding: "40px" }}>No productions yet. Create one.</div>
        )}
        <Link href="/production/series/new" className="card card-hover" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", color: "var(--text-dim)", gap: "8px", borderStyle: "dashed" }}>
          + Add Production
        </Link>
      </div>
    </div>
  );
}
