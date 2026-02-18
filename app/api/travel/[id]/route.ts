import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const fields = ['type', 'title', 'details', 'date_start', 'date_end', 'cost', 'currency', 'booked', 'confirmation_number', 'notes'];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (f in body) { updates.push(`${f} = ?`); values.push(body[f]); }
  }
  if (!updates.length) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  values.push(id);
  db.prepare(`UPDATE travel SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json(db.prepare('SELECT * FROM travel WHERE id = ?').get(id));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM travel WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
