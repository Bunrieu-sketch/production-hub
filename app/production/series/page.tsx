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

export default async function SeriesPage() {
  const db = getDb();
  const series = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM milestones WHERE series_id=s.id AND completed=1) as done_count,
      (SELECT COUNT(*) FROM milestones WHERE series_id=s.id) as total_count
    FROM series s ORDER BY s.created_at DESC
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

      <div className="list">
        {series.map((s: any) => (
          <div key={s.id} className="card card-hover">
            <div className="page-header" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span className="badge">
                    <span className="status-dot" style={{ background: STATUS_COLORS[s.status] || "#8b949e" }} />
                    {s.status?.replace("_", " ")}
                  </span>
                  <Link href={`/production/series/${s.id}`} className="page-title" style={{ fontSize: "16px" }}>
                    {s.title}
                  </Link>
                </div>
                <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {s.location && <span>{s.location}</span>}
                  {s.target_shoot_start && <span>Shoot: {s.target_shoot_start}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ textAlign: "right" }}>
                  <div className="muted" style={{ fontSize: "12px" }}>Milestones</div>
                  <div>{s.done_count}/{s.total_count}</div>
                </div>
                <div style={{ width: "80px", height: "6px", background: "var(--border)", borderRadius: "999px" }}>
                  <div style={{ width: `${s.total_count ? (s.done_count / s.total_count) * 100 : 0}%`, height: "100%", background: "var(--blue)", borderRadius: "999px" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
        {series.length === 0 && (
          <div className="panel muted" style={{ textAlign: "center" }}>No series yet. Create one.</div>
        )}
      </div>
    </div>
  );
}
