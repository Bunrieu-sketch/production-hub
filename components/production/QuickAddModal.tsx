"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  onClose: () => void;
}

export default function QuickAddModal({ onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title") as string,
      country: fd.get("country") as string,
      episode_count: parseInt(fd.get("episode_count") as string) || 5,
    };

    const res = await fetch("/api/production/series/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const p = await res.json();
      router.push(`/production/series/${p.id}`);
      router.refresh();
      onClose();
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
        borderRadius: "12px", padding: "28px", width: "100%", maxWidth: "420px",
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
              <label className="label" style={{ marginBottom: "6px", display: "block" }}>Number of Episodes</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {[3, 4, 5, 6].map((n) => (
                  <label key={n} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "8px 0", border: "1px solid var(--border)", borderRadius: "8px",
                    cursor: "pointer", fontSize: "14px", color: "var(--text)",
                    background: "var(--bg)",
                  }}>
                    <input
                      type="radio"
                      name="episode_count"
                      value={n}
                      defaultChecked={n === 5}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        // Highlight selected
                        const parent = e.target.closest("div");
                        if (parent) {
                          parent.querySelectorAll("label").forEach((l) => {
                            (l as HTMLElement).style.borderColor = "var(--border)";
                            (l as HTMLElement).style.background = "var(--bg)";
                          });
                          const label = e.target.closest("label") as HTMLElement;
                          if (label) {
                            label.style.borderColor = "var(--accent)";
                            label.style.background = "var(--accent)22";
                          }
                        }
                      }}
                    />
                    {n}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: "20px", padding: "12px 14px", background: "var(--bg)",
            borderRadius: "8px", border: "1px solid var(--border)",
          }}>
            <div className="muted" style={{ fontSize: "12px", lineHeight: 1.5 }}>
              🎬 This will auto-create:<br />
              • 4 phase milestones (Pre-Prod → Shooting → Editing → Publish)<br />
              • Placeholder episodes (Episode 1, Episode 2, etc.)<br />
              • Status set to <strong style={{ color: "var(--text)" }}>Ideation</strong><br />
              <span style={{ color: "#6e7681" }}>Fill in dates and details as pre-production progresses.</span>
            </div>
          </div>

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
