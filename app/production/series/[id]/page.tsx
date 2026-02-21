import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import ProductionForm from '@/components/production/ProductionForm';
import MilestoneRow from '@/components/production/MilestoneRow';
import AddMilestone from '@/components/production/AddMilestone';
import Link from 'next/link';

export const dynamic = "force-dynamic";

export default async function SeriesDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const series = db.prepare("SELECT * FROM series WHERE id = ?").get(id) as any;
  if (!series) notFound();

  const milestones = db.prepare("SELECT * FROM milestones WHERE series_id = ? ORDER BY due_date").all(id) as any[];
  const episodes = db.prepare("SELECT * FROM episodes WHERE series_id = ? ORDER BY shoot_date").all(id) as any[];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">{series.title}</div>
          <div className="muted">Edit series details and milestones</div>
        </div>
        <Link href="/production/series" className="button">← Back</Link>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="section-title" style={{ marginBottom: "12px" }}>Edit Series</div>
          <ProductionForm initial={series} />
        </div>

        <div className="panel">
          <div className="page-header" style={{ marginBottom: "8px" }}>
            <div className="section-title">Milestones</div>
            <span className="badge">
              <span className="status-dot status-done" />
              {milestones.filter((m: any) => m.completed === 1).length}/{milestones.length}
            </span>
          </div>
          <div className="list" style={{ marginBottom: "12px" }}>
            {milestones.map((m: any) => (
              <MilestoneRow key={m.id} milestone={m} variant="checkbox" />
            ))}
          </div>
          <AddMilestone seriesId={Number(id)} />
        </div>
      </div>

      {episodes.length > 0 && (
        <div className="panel">
          <div className="section-title" style={{ marginBottom: "12px" }}>Episodes</div>
          <div className="list">
            {episodes.map((ep: any) => (
              <div key={ep.id} className="list-row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                <div>{ep.title}</div>
                <div className="muted" style={{ fontSize: "12px" }}>{ep.stage}</div>
                <div className="muted" style={{ fontSize: "12px" }}>{ep.shoot_date || "No date"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
