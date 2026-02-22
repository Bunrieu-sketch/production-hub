"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  onClose: () => void;
  onCreated?: (id: number) => void;
}

export default function QuickAddModal({ onClose, onCreated }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [episodeCount, setEpisodeCount] = useState(5);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");

  // Calculate projected dates from start date
  function getProjectedDates(start: string, eps: number) {
    if (!start) return null;
    const d = new Date(start);
    const preProd = new Date(d);
    const shooting = new Date(d); shooting.setDate(d.getDate() + 42); // +6 weeks
    const shootEnd = new Date(shooting); shootEnd.setDate(shooting.getDate() + 14); // +2 weeks
    const editing = new Date(shootEnd);
    const publish = new Date(shootEnd); publish.setDate(shootEnd.getDate() + eps * 7); // 1 week per episode
    return {
      preProd: fmt(preProd),
      shooting: fmt(shooting),
      editing: fmt(editing),
      publish: fmt(publish),
      totalWeeks: Math.ceil((publish.getTime() - preProd.getTime()) / (7 * 86400000)),
    };
  }

  function fmt(d: Date) {
    return d.toISOString().split("T")[0];
  }

  function fmtDisplay(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const projected = getProjectedDates(startDate, episodeCount);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title") as string,
      country: fd.get("country") as string,
      episode_count: episodeCount,
      start_date: startDate || null,
    };

    const res = await fetch("/api/production/series/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const p = await res.json();
      router.refresh();
      onClose();
      if (onCreated) {
        onCreated(p.id);
      }
    }
    setSaving(false);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg-card, #161b22)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "28px", width: "100%", maxWidth: "440px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)" }}>New Production</div>
            <div className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
              Just the basics — we'll scaffold the rest
            </div>
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label className="label" style={{ marginBottom: "6px", display: "block" }}>Series Title *</label>
              <input
                name="title"
                required
                autoFocus
                placeholder="e.g. Borneo — Into the Jungle"
                className="input"
                style={{ width: "100%" }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="label" style={{ marginBottom: "6px", display: "block" }}>Country / Location *</label>
              <input
                name="country"
                required
                placeholder="e.g. Indonesia, Vietnam, Scotland"
                className="input"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label className="label" style={{ marginBottom: "6px", display: "block" }}>Episodes</label>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <label key={n} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "8px 0", border: `1px solid ${n === episodeCount ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "8px", cursor: "pointer", fontSize: "14px", color: "var(--text)",
                    background: n === episodeCount ? "var(--accent)22" : "var(--bg)",
                    transition: "all 0.15s",
                  }}>
                    <input
                      type="radio"
                      name="episode_count"
                      value={n}
                      checked={n === episodeCount}
                      onChange={() => setEpisodeCount(n)}
                      style={{ display: "none" }}
                    />
                    {n}
                  </label>
                ))}
              </div>
              {title && (
                <div className="muted" style={{ fontSize: "11px", marginTop: "6px" }}>
                  {Array.from({ length: episodeCount }, (_, i) => (
                    <span key={i} style={{ display: "block", padding: "1px 0" }}>
                      📄 {title} — Episode {i + 1}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label" style={{ marginBottom: "6px", display: "block" }}>
                Start Date <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="date"
                name="start_date"
                className="input"
                style={{ width: "100%" }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                If set, we'll auto-calculate all phase dates
              </div>
            </div>
          </div>

          {/* Projected timeline */}
          {projected && (
            <div style={{
              marginTop: "16px", padding: "12px 14px", background: "var(--bg)",
              borderRadius: "8px", border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-dim)", marginBottom: "8px" }}>
                📅 Projected Timeline ({projected.totalWeeks} weeks)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px" }}>
                <div><span style={{ color: "#d29922" }}>●</span> Pre-Prod: <span style={{ color: "var(--text)" }}>{fmtDisplay(projected.preProd)}</span></div>
                <div><span style={{ color: "#58a6ff" }}>●</span> Shooting: <span style={{ color: "var(--text)" }}>{fmtDisplay(projected.shooting)}</span></div>
                <div><span style={{ color: "#a371f7" }}>●</span> Editing: <span style={{ color: "var(--text)" }}>{fmtDisplay(projected.editing)}</span></div>
                <div><span style={{ color: "#3fb950" }}>●</span> Publish: <span style={{ color: "var(--text)" }}>{fmtDisplay(projected.publish)}</span></div>
              </div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "6px" }}>
                6wk pre-prod → 2wk shooting → {episodeCount}wk editing ({episodeCount} episodes × 1wk each)
              </div>
            </div>
          )}

          {!projected && (
            <div style={{
              marginTop: "16px", padding: "12px 14px", background: "var(--bg)",
              borderRadius: "8px", border: "1px solid var(--border)",
            }}>
              <div className="muted" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                🎬 Will auto-create:<br />
                • 4 phase milestones (Pre-Prod → Shooting → Editing → Publish)<br />
                • {episodeCount} placeholder episode{episodeCount > 1 ? "s" : ""}<br />
                • Status: <strong style={{ color: "var(--text)" }}>Ideation</strong>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="button button-primary"
            style={{ width: "100%", marginTop: "16px", padding: "10px" }}
          >
            {saving ? "Creating..." : "Create Production"}
          </button>
        </form>
      </div>
    </div>
  );
}
