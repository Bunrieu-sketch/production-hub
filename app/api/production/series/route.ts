import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const db = getDb();
  const series = db.prepare("SELECT * FROM series ORDER BY created_at DESC").all() as any[];
  // Attach milestones for timeline
  for (const s of series) {
    s.milestones = db.prepare("SELECT id, title, due_date, completed FROM milestones WHERE series_id = ?").all(s.id);
  }
  return NextResponse.json(series);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO series (title, location, status, target_shoot_start, target_shoot_end, notes, budget_target) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(data.title, data.location, data.status || 'ideation', data.target_shoot_start, data.target_shoot_end, data.notes, data.budget_target);

  const id = result.lastInsertRowid as number;

  // Auto-create the 4 standard phase milestones
  const insertMilestone = db.prepare(
    'INSERT INTO milestones (series_id, week_number, title, due_date) VALUES (?, ?, ?, ?)'
  );
  const createMilestones = db.transaction(() => {
    insertMilestone.run(id, 1, 'Pre-Production', data.phase_pre_prod || null);
    insertMilestone.run(id, 2, 'Shooting', data.phase_shooting || null);
    insertMilestone.run(id, 3, 'Editing', data.phase_editing || null);
    insertMilestone.run(id, 4, 'Publish', data.phase_publish || null);
  });
  createMilestones();

  return NextResponse.json({ id });
}
