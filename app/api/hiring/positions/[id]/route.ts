import { NextRequest, NextResponse } from 'next/server';
import { getDb, logActivity } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const position = db.prepare('SELECT * FROM job_positions WHERE id = ?').get(id);
  if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(position);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const fields = Object.keys(body).filter(k => k !== 'id');
  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => body[f]);
  db.prepare(`UPDATE job_positions SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  const updated = db.prepare('SELECT * FROM job_positions WHERE id = ?').get(id);
  logActivity('job_position', parseInt(id), 'updated', `Position updated`);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM job_positions WHERE id = ?').run(id);
  logActivity('job_position', parseInt(id), 'deleted', 'Position deleted');
  return NextResponse.json({ success: true });
}
