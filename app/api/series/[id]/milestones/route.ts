import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM milestones WHERE series_id = ? ORDER BY week_number, due_date'
  ).all(id);
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const { milestoneId, completed } = await req.json();

  db.prepare('UPDATE milestones SET completed = ?, completed_at = ? WHERE id = ? AND series_id = ?').run(
    completed ? 1 : 0,
    completed ? new Date().toISOString() : null,
    milestoneId,
    id
  );
  return NextResponse.json({ ok: true });
}
