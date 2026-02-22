import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const series = db.prepare("SELECT * FROM series WHERE id = ?").get(id) as any;
  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  series.milestones = db.prepare("SELECT * FROM milestones WHERE series_id = ? ORDER BY week_number").all(id);
  series.episodes = db.prepare("SELECT * FROM episodes WHERE series_id = ? ORDER BY sort_order").all(id);
  return NextResponse.json(series);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const db = getDb();
  db.prepare(
    "UPDATE series SET title=?, location=?, status=?, target_shoot_start=?, target_shoot_end=?, target_publish_date=?, editor=?, notes=?, budget_target=?, updated_at=? WHERE id=?"
  ).run(data.title, data.location, data.status, data.target_shoot_start, data.target_shoot_end, data.target_publish_date || null, data.editor || null, data.notes, data.budget_target, new Date().toISOString(), id);
  return NextResponse.json({ id: Number(id) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const series = db.prepare("SELECT * FROM series WHERE id = ?").get(id);
  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // CASCADE handles episodes, episode_phases, milestones, travel
  db.prepare("DELETE FROM series WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
