"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["ideation", "pre_prod", "shooting", "post_prod", "published", "archived"];

interface Props {
  initial?: Record<string, unknown>;
}

export default function ProductionForm({ initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => { data[k] = v || null; });

    const url = initial ? `/api/production/series/${initial.id}` : "/api/production/series";
    const method = initial ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const p = await res.json();
      router.push(`/production/series/${p.id}`);
      router.refresh();
    }
    setSaving(false);
  }

  const v = (k: string) => (initial?.[k] as string) ?? "";

  return (
    <form onSubmit={handleSubmit} className="list">
      <div className="form-grid">
        <div className="form-group">
          <label className="label">Title *</label>
          <input name="title" defaultValue={v("title")} required className="input" />
        </div>
        <div className="form-group">
          <label className="label">Location</label>
          <input name="location" defaultValue={v("location")} className="input" />
        </div>
        <div className="form-group">
          <label className="label">Status</label>
          <select name="status" defaultValue={v("status") || "ideation"} className="select">
            {STATUSES.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Budget Target ($)</label>
          <input type="number" name="budget_target" defaultValue={v("budget_target")} className="input" />
        </div>
        <div className="form-group">
          <label className="label">Shoot Start</label>
          <input type="date" name="target_shoot_start" defaultValue={v("target_shoot_start")} className="input" />
        </div>
        <div className="form-group">
          <label className="label">Shoot End</label>
          <input type="date" name="target_shoot_end" defaultValue={v("target_shoot_end")} className="input" />
        </div>
      </div>
      {/* Phase milestone dates */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "8px" }}>
        <label className="label" style={{ marginBottom: "12px", fontSize: "13px", color: "var(--text-dim)" }}>Phase Milestones</label>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">Pre-Production Date</label>
            <input type="date" name="phase_pre_prod" defaultValue={v("phase_pre_prod")} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Shooting Date</label>
            <input type="date" name="phase_shooting" defaultValue={v("phase_shooting")} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Editing Date</label>
            <input type="date" name="phase_editing" defaultValue={v("phase_editing")} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Publish Date</label>
            <input type="date" name="phase_publish" defaultValue={v("phase_publish")} className="input" />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Notes</label>
        <textarea name="notes" rows={3} defaultValue={v("notes")} className="textarea" />
      </div>
      <button type="submit" disabled={saving} className="button button-primary">
        {saving ? "Saving..." : initial ? "Update" : "Create Series"}
      </button>
    </form>
  );
}
