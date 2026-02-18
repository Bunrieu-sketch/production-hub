import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare(`
    SELECT s.*,
      p1.name as fixer_name, p2.name as producer_name, p3.name as camera_name
    FROM series s
    LEFT JOIN people p1 ON s.fixer_id = p1.id
    LEFT JOIN people p2 ON s.producer_id = p2.id
    LEFT JOIN people p3 ON s.camera_id = p3.id
    WHERE s.id = ?
  `).get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const existing = db.prepare('SELECT * FROM series WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields = [
    'title', 'location', 'status', 'target_shoot_start', 'target_shoot_end',
    'actual_shoot_start', 'actual_shoot_end', 'fixer_id', 'producer_id',
    'camera_id', 'budget_target', 'budget_actual', 'notes',
  ];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (f in body) { updates.push(`${f} = ?`); values.push(body[f]); }
  }
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE series SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json(db.prepare('SELECT * FROM series WHERE id = ?').get(id));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM series WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
