"use client";
import { useState } from "react";

export default function AddMilestone({ seriesId }: { seriesId: number }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/production/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        series_id: seriesId,
        title: fd.get("title"),
        due_date: fd.get("due_date") || null,
      }),
    });
    window.location.reload();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="button button-ghost">
        Add Milestone
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="list">
      <input name="title" placeholder="Milestone name" required className="input" />
      <input type="date" name="due_date" className="input" />
      <div className="inline-actions">
        <button type="submit" className="button button-primary">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="button button-ghost">Cancel</button>
      </div>
    </form>
  );
}
