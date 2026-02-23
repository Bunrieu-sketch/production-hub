import { NextRequest, NextResponse } from 'next/server';
import { getDb, logActivity } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const applicant = db.prepare(`
    SELECT a.*, jp.title as position_title
    FROM applicants a
    LEFT JOIN job_positions jp ON a.position_id = jp.id
    WHERE a.id = ?
  `).get(id);
  if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(applicant);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const fields = Object.keys(body).filter(k => k !== 'id' && k !== 'position_title');
  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => body[f]);
  db.prepare(`UPDATE applicants SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  const updated = db.prepare(`
    SELECT a.*, jp.title as position_title
    FROM applicants a
    LEFT JOIN job_positions jp ON a.position_id = jp.id
    WHERE a.id = ?
  `).get(id);
  logActivity('applicant', parseInt(id), 'updated', 'Applicant updated');
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM applicants WHERE id = ?').run(id);
  logActivity('applicant', parseInt(id), 'deleted', 'Applicant deleted');
  return NextResponse.json({ success: true });
}
