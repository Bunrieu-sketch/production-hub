import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const rows = db.prepare(`
    SELECT e.*, p.name as editor_name
    FROM episodes e
    LEFT JOIN people p ON e.editor_id = p.id
    WHERE e.series_id = ?
    ORDER BY e.sort_order, e.created_at
  `).all(id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { title, stage, episode_type, shoot_date, publish_date, hook, outline, notes } = body;

  const result = db.prepare(`
    INSERT INTO episodes (series_id, title, stage, episode_type, shoot_date, publish_date, hook, outline, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, stage || 'idea', episode_type || 'cornerstone',
    shoot_date || null, publish_date || null,
    hook || '', outline || '', notes || ''
  );

  const ep = db.prepare('SELECT * FROM episodes WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(ep, { status: 201 });
}
