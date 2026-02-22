import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const seriesId = searchParams.get('series_id');

  let query = `
    SELECT e.*, s.title as series_title, p.name as editor_name, sp.brand_name as sponsor_name
    FROM episodes e
    LEFT JOIN series s ON e.series_id = s.id
    LEFT JOIN people p ON e.editor_id = p.id
    LEFT JOIN sponsors sp ON sp.episode_id = e.id
  `;
  const params: string[] = [];
  if (seriesId) { query += ' WHERE e.series_id = ?'; params.push(seriesId); }
  query += ' ORDER BY e.sort_order, e.created_at';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { series_id, title, stage, episode_type, shoot_date, publish_date, hook, outline, notes } = body;

  const result = db.prepare(`
    INSERT INTO episodes (series_id, title, stage, episode_type, shoot_date, publish_date, hook, outline, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    series_id, title, stage || 'idea', episode_type || 'cornerstone',
    shoot_date || null, publish_date || null,
    hook || '', outline || '', notes || ''
  );

  const ep = db.prepare('SELECT * FROM episodes WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(ep, { status: 201 });
}
