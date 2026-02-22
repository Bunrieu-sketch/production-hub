import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const { mid } = await params;
  const patch = await req.json();
  const db = getDb();

  const sets: string[] = [];
  const vals: any[] = [];

  if (patch.due_date !== undefined) { sets.push("due_date = ?"); vals.push(patch.due_date || null); }
  if (patch.completed !== undefined) {
    sets.push("completed = ?"); vals.push(patch.completed);
    if (patch.completed) { sets.push("completed_at = ?"); vals.push(new Date().toISOString()); }
    else { sets.push("completed_at = ?"); vals.push(null); }
  }
  if (patch.title !== undefined) { sets.push("title = ?"); vals.push(patch.title); }

  if (sets.length > 0) {
    vals.push(mid);
    db.prepare(`UPDATE milestones SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }

  return NextResponse.json({ ok: true });
}
