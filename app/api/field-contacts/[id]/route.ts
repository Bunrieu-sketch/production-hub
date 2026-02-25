import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const FIELDS = [
  'name',
  'destination',
  'type',
  'stage',
  'wa',
  'email',
  'instagram',
  'website',
  'notes',
  'source',
  'priority',
];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of FIELDS) {
    if (field in body) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (!updates.length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE field_contacts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM field_contacts WHERE id = ?').get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM field_contacts WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
