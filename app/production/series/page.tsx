import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  ideation: "#8b949e",
  pre_prod: "#d29922",
  shooting: "#58a6ff",
  post_prod: "#a371f7",
  published: "#3fb950",
  archived: "#8b949e",
};

const STATUS_LABELS: Record<string, string> = {
  ideation: "Ideation",
  pre_prod: "Pre-Prod",
  shooting: "Shooting",
  post_prod: "Editing",
  published: "Published",
  archived: "Archived",
};

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

function formatMoney(n: number | null) {
  if (!n) return null;
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SeriesPage() {
  const db = getDb();
  const series = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM milestones WHERE series_id=s.id AND completed=1) as done_count,
      (SELECT COUNT(*) FROM milestones WHERE series_id=s.id) as total_count
    FROM series s ORDER BY
      CASE s.status
        WHEN 'shooting' THEN 1
        WHEN 'post_prod' THEN 2
        WHEN 'pre_prod' THEN 3
        WHEN 'ideation' THEN 4
        WHEN 'published' THEN 5
        WHEN 'archived' THEN 6
      END,
      s.target_shoot_start ASC
  `).all() as any[];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Productions</div>
          <div className="muted">Manage every production and its milestones</div>
        </div>
        <Link href="/production/series/new" className="button button-primary">New Series</Link>
      </div>

      <div className="list" style={{ gap: "12px" }}>
        {series.map((s: any) => {
          const color = STATUS_COLORS[s.status] || "#8b949e";
          return (
            <Link key={s.id} href={`/production/series/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card card-hover" style={{ borderLeft: `4px solid ${color}`, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span className="badge" style={{
                        background: `${color}22`,
                        borderColor: `${color}66`,
                        color: color,
                        fontWeight: 600,
                      }}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                      <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
                        {s.title}
                      </span>
                    </div>
                    <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px" }}>
                      {s.location && <span>{s.location}</span>}
                      {s.editor && <span>Editor: {s.editor}</span>}
                      {s.target_shoot_start && (
                        <span>Shoot: {formatDate(s.target_shoot_start)}</span>
                      )}
                      {s.target_publish_date && (
                        <span>Publish: {formatDate(s.target_publish_date)}</span>
                      )}
                      {s.budget_target > 0 && (
                        <span>Budget: {formatMoney(s.budget_target)}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="muted" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Milestones</div>
                      <div style={{ fontWeight: 600 }}>{s.done_count}/{s.total_count}</div>
                    </div>
                    <div style={{ width: "80px", height: "6px", background: "var(--border)", borderRadius: "999px" }}>
                      <div style={{
                        width: `${s.total_count ? (s.done_count / s.total_count) * 100 : 0}%`,
                        height: "100%",
                        background: color,
                        borderRadius: "999px",
                        transition: "width 0.3s",
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {series.length === 0 && (
          <div className="panel muted" style={{ textAlign: "center", padding: "40px" }}>No series yet. Create one.</div>
        )}
      </div>
    </div>
  );
}
