"use client";
import { useEffect, useMemo, useState } from "react";

interface Milestone {
  id: number;
  title: string;
  due_date: string | null;
  completed: number;
}

interface Series {
  id: number;
  title: string;
  status: string;
  target_shoot_start: string | null;
  target_shoot_end: string | null;
  milestones: Milestone[];
}

const STATUS_COLORS: Record<string, string> = {
  ideation: "#8b949e",
  pre_prod: "#d29922",
  shooting: "#58a6ff",
  post_prod: "#a371f7",
  published: "#3fb950",
  archived: "#8b949e",
};

function toDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function TimelineView() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  useEffect(() => {
    fetch("/api/production/series")
      .then((r) => r.json())
      .then(setSeriesList);
  }, []);

  const { minDate, maxDate } = useMemo(() => {
    const dates: Date[] = [];
    seriesList.forEach((s) => {
      const start = toDate(s.target_shoot_start);
      const end = toDate(s.target_shoot_end);
      if (start) dates.push(start);
      if (end) dates.push(end);
      s.milestones?.forEach((m) => {
        const md = toDate(m.due_date);
        if (md) dates.push(md);
      });
    });
    if (!dates.length) {
      const now = new Date();
      return { minDate: now, maxDate: new Date(now.getTime() + 86400000 * 60) };
    }
    dates.sort((a, b) => a.getTime() - b.getTime());
    const min = new Date(dates[0]);
    const max = new Date(dates[dates.length - 1]);
    min.setDate(min.getDate() - 14);
    max.setDate(max.getDate() + 14);
    return { minDate: min, maxDate: max };
  }, [seriesList]);

  const totalMs = maxDate.getTime() - minDate.getTime();
  function pct(d: Date) { return ((d.getTime() - minDate.getTime()) / totalMs) * 100; }

  const months = useMemo(() => {
    const items: { label: string; left: number; width: number }[] = [];
    const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cursor <= maxDate) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const left = pct(cursor < minDate ? minDate : cursor);
      const right = pct(next > maxDate ? maxDate : next);
      items.push({ label: cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" }), left, width: right - left });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return items;
  }, [minDate, maxDate]);

  const todayPct = pct(new Date());

  if (!seriesList.length) {
    return <div style={{ color: "var(--text-dim)", padding: 40, textAlign: "center" }}>No series to display.</div>;
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)", overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", position: "relative" }}>
        {months.map((m) => (
          <div key={m.label} style={{ position: "absolute", left: `${m.left}%`, width: `${m.width}%`, padding: "10px 12px", fontSize: 11, color: "var(--text-dim)", borderRight: "1px solid var(--border)", boxSizing: "border-box" }}>
            {m.label}
          </div>
        ))}
        <div style={{ height: 36 }} />
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 1, background: "var(--red)", opacity: 0.5, zIndex: 10, pointerEvents: "none" }} />

        {seriesList.map((s) => {
          const start = toDate(s.target_shoot_start);
          const end = toDate(s.target_shoot_end) || start;
          if (!start || !end) return null;

          const barLeft = pct(start);
          const barRight = pct(end);
          const barWidth = Math.max(barRight - barLeft, 2);
          const color = STATUS_COLORS[s.status] || "#8b949e";

          return (
            <div key={s.id} style={{ position: "relative", height: 48, borderBottom: "1px solid var(--border)" }}>
              <div style={{ position: "absolute", left: `${barLeft}%`, width: `${barWidth}%`, top: 10, height: 28, borderRadius: 4, background: color, opacity: 0.4 }} />
              <div style={{ position: "absolute", left: `${barLeft}%`, width: `${barWidth}%`, top: 10, height: 28, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 11, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", zIndex: 2 }}>
                {s.title}
              </div>
              {s.milestones?.map((m) => {
                if (!m.due_date) return null;
                const mLeft = pct(new Date(m.due_date));
                return (
                  <div key={m.id} title={m.title} style={{ position: "absolute", left: `${mLeft}%`, top: 20, width: 6, height: 6, borderRadius: "50%", background: m.completed ? "#3fb950" : "rgba(255,255,255,0.5)", border: "1.5px solid var(--bg)", transform: "translateX(-3px)", zIndex: 3 }} />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
