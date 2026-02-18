import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateMilestones } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = `
    SELECT s.*,
      p1.name as fixer_name, p2.name as producer_name, p3.name as camera_name,
      COUNT(DISTINCT e.id) as episode_count
    FROM series s
    LEFT JOIN people p1 ON s.fixer_id = p1.id
    LEFT JOIN people p2 ON s.producer_id = p2.id
    LEFT JOIN people p3 ON s.camera_id = p3.id
    LEFT JOIN episodes e ON s.id = e.series_id
  `;
  const params: string[] = [];
  if (status) { query += ' WHERE s.status = ?'; params.push(status); }
  query += ' GROUP BY s.id ORDER BY s.created_at DESC';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, location, status, target_shoot_start, target_shoot_end, budget_target, notes } = body;

  const result = db.prepare(`
    INSERT INTO series (title, location, status, target_shoot_start, target_shoot_end, budget_target, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, location || '', status || 'ideation',
    target_shoot_start || null, target_shoot_end || null,
    budget_target || 0, notes || ''
  );

  const id = result.lastInsertRowid as number;
  if (target_shoot_start) generateMilestones(id, target_shoot_start);

  const series = db.prepare('SELECT * FROM series WHERE id = ?').get(id);
  return NextResponse.json(series, { status: 201 });
}
