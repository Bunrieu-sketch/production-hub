import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare(`
    SELECT e.*, s.title as series_title, p.name as editor_name
    FROM episodes e
    LEFT JOIN series s ON e.series_id = s.id
    LEFT JOIN people p ON e.editor_id = p.id
    WHERE e.id = ?
  `).get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const fields = [
    'title', 'stage', 'episode_type', 'shoot_date', 'rough_cut_due',
    'publish_date', 'actual_publish_date', 'editor_id', 'youtube_video_id',
    'youtube_url', 'view_count', 'thumbnail_concept', 'hook', 'outline', 'notes',
    'sort_order',
  ];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (f in body) { updates.push(`${f} = ?`); values.push(body[f]); }
  }
  if (!updates.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE episodes SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json(db.prepare('SELECT * FROM episodes WHERE id = ?').get(id));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM episodes WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
