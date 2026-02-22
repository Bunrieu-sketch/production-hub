"use client";
import { useCallback, useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  ideation: "#8b949e", pre_prod: "#d29922", shooting: "#58a6ff",
  post_prod: "#a371f7", published: "#3fb950", archived: "#8b949e",
};
const STATUS_LABELS: Record<string, string> = {
  ideation: "Ideation", pre_prod: "Pre-Prod", shooting: "Shooting",
  post_prod: "Editing", published: "Published", archived: "Archived",
};
const STATUSES = ["ideation", "pre_prod", "shooting", "post_prod", "published", "archived"];
const STAGE_LABELS: Record<string, string> = {
  idea: "Idea", outlined: "Outlined", confirmed: "Confirmed", filming: "Filming",
  editing: "Editing", review: "Review", published: "Published",
};
const STAGES = ["idea", "outlined", "confirmed", "filming", "editing", "review", "published"];

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

// Inline editable text field
function EditableText({ value, onSave, placeholder, style }: {
  value: string; onSave: (v: string) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== value) onSave(draft); }}
        onKeyDown={e => { if (e.key === "Enter") { setEditing(false); if (draft !== value) onSave(draft); } if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        placeholder={placeholder}
        className="input"
        style={{ fontSize: "13px", padding: "2px 6px", ...style }}
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: "pointer", borderBottom: "1px dashed var(--border)", color: "var(--text)", ...style }}
      title="Click to edit"
    >
      {value || <span className="muted">{placeholder || "Click to set"}</span>}
    </span>
  );
}

// Inline editable date field
function EditableDate({ value, onSave }: { value: string | null; onSave: (v: string) => void; }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => setDraft(value || ""), [value]);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        value={draft}
        onChange={e => { setDraft(e.target.value); }}
        onBlur={() => { setEditing(false); if (draft !== (value || "")) onSave(draft); }}
        onKeyDown={e => { if (e.key === "Escape") { setEditing(false); setDraft(value || ""); } }}
        className="input"
        style={{ fontSize: "12px", padding: "2px 6px", width: "140px", flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: "pointer", borderBottom: "1px dashed var(--border)", color: "var(--text)", fontSize: "12px" }}
      title="Click to edit"
    >
      {value ? formatDate(value) : <span className="muted">Set date</span>}
    </span>
  );
}

// Inline add row
function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => Promise<void> }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value.trim()) return;
    setSaving(true);
    await onAdd(value.trim());
    setValue("");
    setActive(false);
    setSaving(false);
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        style={{
          background: "none", border: "1px dashed var(--border)", borderRadius: "6px",
          color: "var(--text-dim)", fontSize: "12px", padding: "6px 10px", cursor: "pointer",
          width: "100%", textAlign: "left", marginTop: "8px",
        }}
      >
        + {placeholder}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setActive(false); setValue(""); } }}
        placeholder={placeholder}
        className="input"
        style={{ flex: 1, fontSize: "12px", padding: "4px 8px" }}
      />
      <button onClick={submit} disabled={saving} style={{
        background: "var(--accent)", color: "#fff", border: "none", borderRadius: "6px",
        padding: "4px 10px", fontSize: "12px", cursor: "pointer", flexShrink: 0,
      }}>
        {saving ? "..." : "Add"}
      </button>
      <button onClick={() => { setActive(false); setValue(""); }} style={{
        background: "none", border: "1px solid var(--border)", borderRadius: "6px",
        color: "var(--text-dim)", padding: "4px 8px", fontSize: "12px", cursor: "pointer",
      }}>
        ✕
      </button>
    </div>
  );
}

interface Props {
  seriesId: number;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function SeriesSlideOver({ seriesId, onClose, onUpdated }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle, 1=first click, 2=confirmed

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/production/series/${seriesId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [seriesId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Save series field
  async function saveSeries(patch: Record<string, any>) {
    setSaving(true);
    const updated = { ...data, ...patch };
    await fetch(`/api/production/series/${seriesId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setData(updated);
    setSaving(false);
    onUpdated?.();
  }

  // Save milestone
  async function saveMilestone(milestoneId: number, patch: Record<string, any>) {
    await fetch(`/api/production/series/${seriesId}/milestones/${milestoneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadData();
    onUpdated?.();
  }

  // Toggle milestone completed
  async function toggleMilestone(m: any) {
    await saveMilestone(m.id, { completed: m.completed ? 0 : 1 });
  }

  // Save episode
  async function saveEpisode(episodeId: number, patch: Record<string, any>) {
    await fetch(`/api/production/series/${seriesId}/episodes/${episodeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadData();
  }

  const color = data ? STATUS_COLORS[data.status] || "#8b949e" : "#8b949e";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />

      <div style={{
        position: "relative", width: "100%", maxWidth: "540px",
        background: "var(--bg-card, #161b22)", borderLeft: "1px solid var(--border)",
        overflowY: "auto", padding: "24px", animation: "slideIn 0.2s ease-out",
      }}>
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: "20px", right: "20px", background: "none", border: "none",
          color: "var(--text-dim)", fontSize: "20px", cursor: "pointer", padding: "4px 8px", zIndex: 10,
        }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          {loading ? (
            <div style={{ color: "var(--text-dim)" }}>Loading...</div>
          ) : data ? (
            <>
              <EditableText
                value={data.title}
                onSave={v => saveSeries({ title: v })}
                style={{ fontSize: "22px", fontWeight: 700, display: "block", marginBottom: "6px", paddingRight: "40px" }}
              />
              <EditableText
                value={data.location || ""}
                onSave={v => saveSeries({ location: v })}
                placeholder="Set location"
                style={{ fontSize: "14px", color: "#8b949e", display: "block", marginBottom: "10px" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                  value={data.status}
                  onChange={e => saveSeries({ status: e.target.value })}
                  style={{
                    padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                    background: `${color}22`, border: `1px solid ${color}66`, color,
                    cursor: "pointer", appearance: "none", WebkitAppearance: "none",
                  }}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {saving && <span className="muted" style={{ fontSize: "11px" }}>Saving...</span>}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--red)" }}>Failed to load</div>
          )}
        </div>

        {data && !loading && (
          <>
            {/* Phase Milestones */}
            <div style={{ background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "12px" }}>Phase Milestones</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(data.milestones || [])
                  .filter((m: any) => ["Pre-Production", "Shooting", "Editing", "Publish"].includes(m.title))
                  .map((m: any) => {
                    const phaseColors: Record<string, string> = {
                      "Pre-Production": "#d29922", "Shooting": "#58a6ff", "Editing": "#a371f7", "Publish": "#3fb950",
                    };
                    const pc = phaseColors[m.title] || "#8b949e";
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          onClick={() => toggleMilestone(m)}
                          style={{
                            width: "12px", height: "12px", borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                            background: m.completed ? pc : "transparent", border: `2px solid ${pc}`,
                            transition: "all 0.15s",
                          }}
                          title={m.completed ? "Mark incomplete" : "Mark complete"}
                        />
                        <span style={{ fontSize: "13px", color: "var(--text)", flex: 1 }}>{m.title}</span>
                        <EditableDate value={m.due_date} onSave={v => saveMilestone(m.id, { due_date: v })} />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Episodes */}
            {data.episodes && data.episodes.length > 0 && (
              <div style={{ background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "12px" }}>
                  Episodes ({data.episodes.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {data.episodes.map((ep: any) => (
                    <div key={ep.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: "13px", color: "var(--text)" }}>
                        <EditableText
                          value={ep.title}
                          onSave={v => saveEpisode(ep.id, { title: v })}
                          style={{ fontSize: "13px" }}
                        />
                      </div>
                      <select
                        value={ep.stage}
                        onChange={e => saveEpisode(ep.id, { stage: e.target.value })}
                        style={{
                          fontSize: "11px", padding: "2px 6px", borderRadius: "8px",
                          background: "var(--border)", color: "var(--text-dim)", border: "none",
                          cursor: "pointer", flexShrink: 0, width: "80px",
                        }}
                      >
                        {STAGES.map(st => (
                          <option key={st} value={st}>{STAGE_LABELS[st] || st}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <AddInline
                  placeholder="Add episode..."
                  onAdd={async (title) => {
                    await fetch(`/api/production/series/${seriesId}/episodes`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title, series_id: seriesId }),
                    });
                    loadData();
                  }}
                />
              </div>
            )}
            {/* Add episodes section if none exist */}
            {(!data.episodes || data.episodes.length === 0) && (
              <div style={{ background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "12px" }}>Episodes</div>
                <AddInline
                  placeholder="Add first episode..."
                  onAdd={async (title) => {
                    await fetch(`/api/production/series/${seriesId}/episodes`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title, series_id: seriesId }),
                    });
                    loadData();
                  }}
                />
              </div>
            )}

            {/* Details */}
            <div style={{ background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "12px" }}>Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Shoot Start</span>
                  <EditableDate value={data.target_shoot_start} onSave={v => saveSeries({ target_shoot_start: v })} />
                </div>
                <div>
                  <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Shoot End</span>
                  <EditableDate value={data.target_shoot_end} onSave={v => saveSeries({ target_shoot_end: v })} />
                </div>
                <div>
                  <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Publish</span>
                  <EditableDate value={data.target_publish_date} onSave={v => saveSeries({ target_publish_date: v })} />
                </div>
                <div>
                  <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Producer</span>
                  <EditableText
                    value={data.editor || ""}
                    onSave={v => saveSeries({ editor: v })}
                    placeholder="Set producer"
                  />
                </div>
                <div>
                  <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Budget</span>
                  <EditableText
                    value={data.budget_target ? `$${Number(data.budget_target).toLocaleString()}` : ""}
                    onSave={v => saveSeries({ budget_target: parseInt(v.replace(/[^0-9]/g, "")) || 0 })}
                    placeholder="Set budget"
                    style={{ fontSize: "13px" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "14px" }}>
                <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Notes</span>
                <EditableText
                  value={data.notes || ""}
                  onSave={v => saveSeries({ notes: v })}
                  placeholder="Add notes"
                  style={{ fontSize: "13px", lineHeight: 1.5 }}
                />
              </div>
            </div>

            {/* Delete Series */}
            <div style={{ background: "var(--bg)", borderRadius: "10px", border: `1px solid ${deleteStep > 0 ? "#f8514966" : "var(--border)"}`, padding: "16px", marginBottom: "16px" }}>
              {deleteStep === 0 && (
                <button
                  onClick={() => setDeleteStep(1)}
                  style={{
                    background: "none", border: "1px solid #f8514944", borderRadius: "8px",
                    color: "#f85149", fontSize: "13px", padding: "8px 16px", cursor: "pointer",
                    width: "100%",
                  }}
                >
                  🗑 Delete Series
                </button>
              )}
              {deleteStep === 1 && (
                <div>
                  <div style={{ fontSize: "13px", color: "#f85149", fontWeight: 600, marginBottom: "8px" }}>
                    ⚠️ This will permanently delete "{data.title}" and all {data.episodes?.length || 0} episode{(data.episodes?.length || 0) !== 1 ? "s" : ""} underneath it.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={async () => {
                        setDeleteStep(2);
                        await fetch(`/api/production/series/${seriesId}`, { method: "DELETE" });
                        onClose();
                        onUpdated?.();
                        window.location.reload();
                      }}
                      style={{
                        background: "#f85149", color: "#fff", border: "none", borderRadius: "8px",
                        fontSize: "13px", fontWeight: 600, padding: "8px 16px", cursor: "pointer", flex: 1,
                      }}
                    >
                      Yes, delete everything
                    </button>
                    <button
                      onClick={() => setDeleteStep(0)}
                      style={{
                        background: "none", border: "1px solid var(--border)", borderRadius: "8px",
                        color: "var(--text-dim)", fontSize: "13px", padding: "8px 16px", cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {deleteStep === 2 && (
                <div style={{ fontSize: "13px", color: "var(--text-dim)", textAlign: "center" }}>Deleting...</div>
              )}
            </div>

            {/* All editing is now inline — no need for full editor */}
          </>
        )}
      </div>
    </div>
  );
}
