"use client";
import { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  ideation: "#8b949e", pre_prod: "#d29922", shooting: "#58a6ff",
  post_prod: "#a371f7", published: "#3fb950", archived: "#8b949e",
};
const STATUS_LABELS: Record<string, string> = {
  ideation: "Ideation", pre_prod: "Pre-Prod", shooting: "Shooting",
  post_prod: "Editing", published: "Published", archived: "Archived",
};
const STAGE_LABELS: Record<string, string> = {
  idea: "Idea", outlined: "Outlined", confirmed: "Confirmed", filming: "Filming",
  editing: "Editing", review: "Review", published: "Published",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

interface Props {
  seriesId: number;
  onClose: () => void;
}

export default function SeriesSlideOver({ seriesId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/production/series/${seriesId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [seriesId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const color = data ? STATUS_COLORS[data.status] || "#8b949e" : "#8b949e";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "relative", width: "100%", maxWidth: "520px",
        background: "var(--bg-card, #161b22)", borderLeft: "1px solid var(--border)",
        overflowY: "auto", padding: "24px",
        animation: "slideIn 0.2s ease-out",
      }}>
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            {loading ? (
              <div style={{ color: "var(--text-dim)" }}>Loading...</div>
            ) : data ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                    background: `${color}22`, border: `1px solid ${color}66`, color,
                  }}>
                    {STATUS_LABELS[data.status] || data.status}
                  </span>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>{data.title}</div>
                {data.location && <div className="muted" style={{ marginTop: "4px" }}>{data.location}</div>}
              </>
            ) : (
              <div style={{ color: "var(--red)" }}>Failed to load</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "var(--text-dim)",
              fontSize: "20px", cursor: "pointer", padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {data && !loading && (
          <>
            {/* Phase Milestones */}
            <div style={{
              background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)",
              padding: "16px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "12px" }}>
                Phase Milestones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(data.milestones || [])
                  .filter((m: any) => ["Pre-Production", "Shooting", "Editing", "Publish"].includes(m.title))
                  .map((m: any) => {
                    const phaseColors: Record<string, string> = {
                      "Pre-Production": "#d29922", "Shooting": "#58a6ff",
                      "Editing": "#a371f7", "Publish": "#3fb950",
                    };
                    const pc = phaseColors[m.title] || "#8b949e";
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
                          background: m.completed ? pc : "transparent",
                          border: `2px solid ${pc}`,
                        }} />
                        <span style={{ fontSize: "13px", color: "var(--text)", flex: 1 }}>{m.title}</span>
                        <span className="muted" style={{ fontSize: "12px" }}>{formatDate(m.due_date)}</span>
                        {m.completed === 1 && <span style={{ fontSize: "11px", color: "#3fb950" }}>✓</span>}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Episodes */}
            {data.episodes && data.episodes.length > 0 && (
              <div style={{
                background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)",
                padding: "16px", marginBottom: "16px",
              }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "12px" }}>
                  Episodes ({data.episodes.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {data.episodes.map((ep: any) => (
                    <div key={ep.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text)", flex: 1 }}>{ep.title}</span>
                      <span style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "8px",
                        background: "var(--border)", color: "var(--text-dim)",
                      }}>
                        {STAGE_LABELS[ep.stage] || ep.stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div style={{
              background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)",
              padding: "16px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "12px" }}>
                Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                <div><span className="muted">Shoot Start</span><div style={{ color: "var(--text)" }}>{formatDate(data.target_shoot_start)}</div></div>
                <div><span className="muted">Shoot End</span><div style={{ color: "var(--text)" }}>{formatDate(data.target_shoot_end)}</div></div>
                <div><span className="muted">Publish</span><div style={{ color: "var(--text)" }}>{formatDate(data.target_publish_date)}</div></div>
                <div><span className="muted">Editor</span><div style={{ color: "var(--text)" }}>{data.editor || "—"}</div></div>
                {data.budget_target > 0 && (
                  <div><span className="muted">Budget</span><div style={{ color: "var(--text)" }}>${Number(data.budget_target).toLocaleString()}</div></div>
                )}
              </div>
              {data.notes && (
                <div style={{ marginTop: "12px" }}>
                  <span className="muted">Notes</span>
                  <div style={{ color: "var(--text)", fontSize: "13px", marginTop: "4px", lineHeight: 1.5 }}>{data.notes}</div>
                </div>
              )}
            </div>

            {/* Edit link */}
            <a
              href={`/production/series/${data.id}`}
              style={{
                display: "block", textAlign: "center", padding: "10px",
                color: "var(--accent)", fontSize: "13px", textDecoration: "none",
                border: "1px solid var(--border)", borderRadius: "8px",
                background: "var(--bg)",
              }}
            >
              Open Full Editor →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
