"use client";
import { Check } from "lucide-react";

interface Props {
  milestone: Record<string, unknown>;
  showProduction?: boolean;
  showDaysOverdue?: boolean;
  dotStatus?: "urgent" | "in_progress" | "done" | "backlog" | "review";
  variant?: "dot" | "checkbox";
}

export default function MilestoneRow({
  milestone: m,
  showProduction,
  showDaysOverdue,
  dotStatus,
  variant = "dot",
}: Props) {
  const dueDate = m.due_date ? new Date(m.due_date as string) : null;
  const isCompleted = m.completed === 1 || m.completed === true;
  const isOverdue = dueDate && dueDate < new Date() && !isCompleted;
  const formatted = dueDate
    ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  const daysOverdue = isOverdue && dueDate
    ? Math.ceil((Date.now() - dueDate.getTime()) / 86400000)
    : 0;

  const statusClass = dotStatus
    ? `status-${dotStatus}`
    : isOverdue
      ? "status-urgent"
      : isCompleted
        ? "status-done"
        : "status-in_progress";

  async function toggle() {
    await fetch("/api/production/milestones/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, completed: isCompleted ? 0 : 1 }),
    });
    window.location.reload();
  }

  return (
    <div className="list-row">
      <button onClick={toggle} className="icon-button" aria-label="Toggle milestone">
        {variant === "checkbox" ? (
          <span className={`check-toggle${isCompleted ? " completed" : ""}`}>
            {isCompleted && <Check size={12} />}
          </span>
        ) : (
          <span className={`status-dot ${statusClass}`} />
        )}
      </button>
      <div>
        <div className={isCompleted ? "muted" : ""}>
          {(m.title as string) || (m.label as string)}
        </div>
        {showProduction && (
          <div className="muted" style={{ fontSize: "12px" }}>{m.series_title as string}</div>
        )}
      </div>
      <div className="muted" style={{ fontSize: "12px" }}>
        {showDaysOverdue && isOverdue ? `${daysOverdue}d overdue` : formatted}
      </div>
    </div>
  );
}
