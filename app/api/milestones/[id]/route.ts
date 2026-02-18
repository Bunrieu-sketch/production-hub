import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { completed } = body;

  db.prepare('UPDATE milestones SET completed = ?, completed_at = ? WHERE id = ?').run(
    completed ? 1 : 0,
    completed ? new Date().toISOString() : null,
    id
  );
  return NextResponse.json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(id));
}
