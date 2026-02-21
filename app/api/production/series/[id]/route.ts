import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const db = getDb();
  db.prepare(
    "UPDATE series SET title=?, location=?, status=?, target_shoot_start=?, target_shoot_end=?, notes=?, budget_target=?, updated_at=? WHERE id=?"
  ).run(data.title, data.location, data.status, data.target_shoot_start, data.target_shoot_end, data.notes, data.budget_target, new Date().toISOString(), id);
  return NextResponse.json({ id: Number(id) });
}
