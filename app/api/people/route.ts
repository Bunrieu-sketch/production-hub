import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');

  let query = `
    SELECT p.*,
      COUNT(DISTINCT e.id) as episode_count,
      COUNT(DISTINCT s.id) as series_count
    FROM people p
    LEFT JOIN episodes e ON p.id = e.editor_id
    LEFT JOIN series s ON p.id = s.fixer_id OR p.id = s.producer_id OR p.id = s.camera_id
    WHERE p.active = 1
  `;
  const params: string[] = [];
  if (role) { query += ' AND p.role = ?'; params.push(role); }
  query += ' GROUP BY p.id ORDER BY p.name';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { name, role, email, phone, rate_per_day, currency, location, instagram, notes } = body;

  const result = db.prepare(`
    INSERT INTO people (name, role, email, phone, rate_per_day, currency, location, instagram, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, role || 'other', email || '', phone || '',
    rate_per_day || 0, currency || 'USD', location || '', instagram || '', notes || ''
  );

  const person = db.prepare('SELECT * FROM people WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(person, { status: 201 });
}
