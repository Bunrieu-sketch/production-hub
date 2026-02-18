import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM travel WHERE series_id = ? ORDER BY date_start'
  ).all(id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { type, title, details, date_start, date_end, cost, currency, booked, confirmation_number, notes } = body;

  const result = db.prepare(`
    INSERT INTO travel (series_id, type, title, details, date_start, date_end, cost, currency, booked, confirmation_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, type, title, details || '', date_start || null, date_end || null, cost || 0, currency || 'USD', booked ? 1 : 0, confirmation_number || '', notes || '');

  const item = db.prepare('SELECT * FROM travel WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(item, { status: 201 });
}
