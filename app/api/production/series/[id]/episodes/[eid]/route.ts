import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; eid: string }> }) {
  const { eid } = await params;
  const patch = await req.json();
  const db = getDb();

  const sets: string[] = [];
  const vals: any[] = [];

  if (patch.title !== undefined) { sets.push("title = ?"); vals.push(patch.title); }
  if (patch.stage !== undefined) { sets.push("stage = ?"); vals.push(patch.stage); }
  if (patch.shoot_date !== undefined) { sets.push("shoot_date = ?"); vals.push(patch.shoot_date || null); }
  if (patch.publish_date !== undefined) { sets.push("publish_date = ?"); vals.push(patch.publish_date || null); }

  if (sets.length > 0) {
    sets.push("updated_at = ?"); vals.push(new Date().toISOString());
    vals.push(eid);
    db.prepare(`UPDATE episodes SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }

  return NextResponse.json({ ok: true });
}
