import { getDb } from '@/lib/db';
import MilestoneRow from '@/components/production/MilestoneRow';

export const dynamic = "force-dynamic";

export default async function ProductionDashboard() {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const week = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const activeRow = db.prepare("SELECT COUNT(*) as count FROM series WHERE status NOT IN ('published','archived')").get() as any;
  const totalRow = db.prepare("SELECT COUNT(*) as count FROM milestones").get() as any;

  const overdue = db.prepare(`
    SELECT m.*, s.title as series_title FROM milestones m
    JOIN series s ON s.id = m.series_id
    WHERE m.due_date < ? AND m.completed = 0 ORDER BY m.due_date
  `).all(today) as any[];

  const upcoming = db.prepare(`
    SELECT m.*, s.title as series_title FROM milestones m
    JOIN series s ON s.id = m.series_id
    WHERE m.due_date >= ? AND m.due_date <= ? AND m.completed = 0 ORDER BY m.due_date
  `).all(today, week) as any[];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="muted">Production health and upcoming deadlines</div>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "20px" }}>
          <div className="stat-label">Active Productions</div>
          <div className="stat-value" style={{ color: "var(--green)", fontSize: "36px" }}>{activeRow?.count || 0}</div>
        </div>
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "20px" }}>
          <div className="stat-label">Total Milestones</div>
          <div className="stat-value" style={{ color: "var(--accent)", fontSize: "36px" }}>{totalRow?.count || 0}</div>
        </div>
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "20px" }}>
          <div className="stat-label">Overdue Milestones</div>
          <div className="stat-value" style={{ color: "var(--red)", fontSize: "36px" }}>{overdue.length}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="page-header" style={{ marginBottom: "8px" }}>
            <div className="section-title">Overdue Milestones</div>
            <span className="badge"><span className="status-dot status-urgent" />{overdue.length}</span>
          </div>
          {overdue.length === 0 ? (
            <div className="muted">No overdue milestones.</div>
          ) : (
            <div className="list">
              {overdue.map((m: any) => (
                <MilestoneRow key={m.id} milestone={m} showProduction showDaysOverdue dotStatus="urgent" />
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="page-header" style={{ marginBottom: "8px" }}>
            <div className="section-title">Upcoming Deadlines</div>
            <span className="badge"><span className="status-dot status-in_progress" />Next 7 days</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="muted">No upcoming deadlines.</div>
          ) : (
            <div className="list">
              {upcoming.map((m: any) => (
                <MilestoneRow key={m.id} milestone={m} showProduction dotStatus="in_progress" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
