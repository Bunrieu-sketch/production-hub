"use client";
import { useEffect, useState } from "react";

interface CalEvent {
  type: string; title: string; start: string; end: string;
  status: string; series_id: number;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    fetch(`/api/production/calendar?month=${monthStr}`)
      .then(r => r.json())
      .then(setEvents);
  }, [monthStr]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function eventsForDay(day: number) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.start <= ds && e.end >= ds);
  }

  function eventClass(e: CalEvent) {
    if (e.type === "publish") return "event-publish";
    if (e.type === "shoot") return "event-shoot";
    if (e.status === "done") return "event-complete";
    return "event-milestone";
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setDate(new Date(year, month - 1, 1))} className="button">Prev</button>
          <button onClick={() => setDate(new Date(year, month + 1, 1))} className="button">Next</button>
        </div>
        <h2 className="section-title">{MONTH_NAMES[month]} {year}</h2>
      </div>

      <div className="calendar-grid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="calendar-head">{d}</div>
        ))}
        {cells.map((day, i) => {
          const ds = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
          const dayEvents = day ? eventsForDay(day) : [];
          const isToday = ds === today;
          return (
            <div key={i} className="calendar-cell" style={!day ? { background: "var(--card)" } : undefined}>
              {day && (
                <>
                  <div className={`calendar-day${isToday ? " calendar-today" : ""}`}>{day}</div>
                  <div className="list" style={{ gap: "4px" }}>
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <div key={j} className={`event-pill ${eventClass(e)}`}>{e.title}</div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="muted" style={{ fontSize: "10px" }}>+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="muted" style={{ display: "flex", gap: "16px", fontSize: "12px", marginTop: "12px" }}>
        <span><span className="status-dot status-in_progress" /> Shoot</span>
        <span><span className="status-dot status-done" /> Publish</span>
        <span><span className="status-dot status-review" /> Milestone</span>
      </div>
    </div>
  );
}
