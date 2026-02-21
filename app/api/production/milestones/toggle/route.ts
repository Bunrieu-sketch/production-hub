import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { id, completed } = await req.json();
  const db = getDb();
  const completedAt = completed ? new Date().toISOString() : null;
  db.prepare("UPDATE milestones SET completed = ?, completed_at = ? WHERE id = ?").run(completed, completedAt, id);
  return NextResponse.json({ ok: true });
}
