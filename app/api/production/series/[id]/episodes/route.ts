import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title } = await req.json();
  const db = getDb();

  // Get next sort order
  const last = db.prepare("SELECT MAX(sort_order) as max_sort FROM episodes WHERE series_id = ?").get(id) as any;
  const sortOrder = (last?.max_sort || 0) + 1;

  const result = db.prepare(
    "INSERT INTO episodes (series_id, title, stage, sort_order, episode_type) VALUES (?, ?, 'idea', ?, 'cornerstone')"
  ).run(id, title, sortOrder);

  return NextResponse.json({ id: result.lastInsertRowid });
}
