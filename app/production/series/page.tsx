import { getDb } from '@/lib/db';
import Link from 'next/link';
import AddProductionButton from './AddProductionButton';

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title">Productions</div>
          <div className="muted">Manage every production and its milestones</div>
        </div>
        <AddProductionButton />
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

                {/* Phase Milestone Bar — week ruler with phase dots */}
                <div style={{ marginTop: "14px" }}>
                  {(() => {
                    // Get milestone dates
                    const phaseDates = PHASES.map(p => {
                      const ms = milestones[p.milestone];
                      return ms?.due_date ? new Date(ms.due_date).getTime() : null;
                    });

                    // Find valid dates
                    const validDates = phaseDates.filter(d => d !== null) as number[];

                    // No dates — show simple equal-spaced dots (no ruler)
                    if (validDates.length < 2) {
                      return (
                        <div style={{ display: "flex", alignItems: "flex-start", position: "relative", padding: "0 4px" }}>
                          <div style={{ position: "absolute", top: "7px", left: "7px", right: "7px", height: "2px", background: "var(--border)", zIndex: 0 }} />
                          {/* Colored progress line up to active phase */}
                          {activePhaseIdx >= 0 && (
                            <div style={{
                              position: "absolute", top: "7px", left: "7px",
                              width: `${(activePhaseIdx / (PHASES.length - 1)) * 100}%`,
                              height: "2px", background: PHASES[Math.min(activePhaseIdx, PHASES.length - 1)].color, zIndex: 1,
                            }} />
                          )}
                          {PHASES.map((phase, i) => {
                            const ms = milestones[phase.milestone];
                            const isCompleted = i < activePhaseIdx || (i === activePhaseIdx && (s.status === 'published' || s.status === 'archived')) || (ms?.completed === 1);
                            const isActive = i === activePhaseIdx && !isCompleted;
                            const isFuture = !isCompleted && !isActive;
                            const dotColor = isFuture ? '#484f58' : phase.color;
                            return (
                              <div key={phase.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 2 }}>
                                <div style={{
                                  width: "14px", height: "14px", borderRadius: "50%",
                                  background: isCompleted || isActive ? dotColor : 'transparent',
                                  border: `2px solid ${dotColor}`,
                                  animation: isActive ? "phase-pulse 2s ease-in-out infinite" : "none",
                                  boxShadow: isActive ? `0 0 0 3px ${dotColor}44` : "none",
                                }} />
                                <span style={{ fontSize: "10px", marginTop: "4px", color: isFuture ? "#484f58" : dotColor, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>{phase.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    const startDate = Math.min(...validDates);
                    const endDate = Math.max(...validDates);
                    const totalMs = endDate - startDate;
                    const oneWeek = 7 * 24 * 60 * 60 * 1000;
                    const totalWeeks = Math.ceil(totalMs / oneWeek);

                    // Position as percentage (0-100)
                    const getPos = (ts: number) => ((ts - startDate) / totalMs) * 100;

                    // Generate week ticks
                    const weekTicks: { pos: number; week: number }[] = [];
                    for (let w = 0; w <= totalWeeks; w++) {
                      const tickTs = startDate + w * oneWeek;
                      if (tickTs <= endDate + oneWeek * 0.1) {
                        weekTicks.push({ pos: Math.min(getPos(tickTs), 100), week: w + 1 });
                      }
                    }

                    return (
                      <div style={{ margin: "0 30px" }}>
                        <div style={{ position: "relative", height: "56px", marginBottom: "4px" }}>
                          {/* Base line */}
                          <div style={{ position: "absolute", top: "14px", left: 0, right: 0, height: "2px", background: "var(--border)", zIndex: 0 }} />

                          {/* Colored segments between phases */}
                          {PHASES.slice(0, -1).map((phase, i) => {
                            if (!phaseDates[i] || !phaseDates[i + 1]) return null;
                            const left = getPos(phaseDates[i]!);
                            const width = getPos(phaseDates[i + 1]!) - left;
                            const isDone = i < activePhaseIdx;
                            const isCurrent = i === activePhaseIdx;
                            if (!isDone && !isCurrent) return null;
                            return (
                              <div key={`seg-${i}`} style={{
                                position: "absolute", top: "13px",
                                left: `${left}%`, width: `${width}%`,
                                height: "4px", background: isCurrent ? `${phase.color}88` : phase.color,
                                borderRadius: "2px", zIndex: 1,
                              }} />
                            );
                          })}

                          {/* Week tick marks */}
                          {weekTicks.map((tick) => (
                            <div key={`tick-${tick.week}`} style={{
                              position: "absolute", top: "10px",
                              left: `${tick.pos}%`,
                              width: "1px", height: "10px", background: "#30363d", zIndex: 1,
                              transform: "translateX(-0.5px)",
                            }}>
                              <span style={{
                                position: "absolute", top: "32px", left: "50%", transform: "translateX(-50%)",
                                fontSize: "8px", color: "#484f58", whiteSpace: "nowrap",
                              }}>
                                {tick.week}
                              </span>
                            </div>
                          ))}

                          {/* Phase dots */}
                          {PHASES.map((phase, i) => {
                            const ms = milestones[phase.milestone];
                            if (!phaseDates[i]) return null;
                            const pos = getPos(phaseDates[i]!);
                            const isCompleted = i < activePhaseIdx || (i === activePhaseIdx && (s.status === 'published' || s.status === 'archived')) || (ms?.completed === 1);
                            const isActive = i === activePhaseIdx && !isCompleted;
                            const isFuture = !isCompleted && !isActive;
                            const dotColor = isFuture ? '#484f58' : phase.color;

                            return (
                              <div key={phase.key} style={{
                                position: "absolute",
                                left: `${pos}%`,
                                top: "4px", transform: "translateX(-50%)", zIndex: 3,
                                display: "flex", flexDirection: "column", alignItems: "center",
                              }}>
                                <div style={{
                                  width: "14px", height: "14px", borderRadius: "50%",
                                  background: isCompleted || isActive ? dotColor : 'var(--bg-card, #161b22)',
                                  border: `2.5px solid ${dotColor}`,
                                  animation: isActive ? "phase-pulse 2s ease-in-out infinite" : "none",
                                  boxShadow: isActive ? `0 0 0 3px ${dotColor}44` : "none",
                                }} />
                                <span style={{
                                  fontSize: "10px", marginTop: "2px", color: isFuture ? "#484f58" : dotColor,
                                  fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap",
                                }}>
                                  {phase.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
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
