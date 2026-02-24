import { NextRequest, NextResponse } from 'next/server';
import { getDb, logActivity } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const positionId = searchParams.get('position_id');
  const stage = searchParams.get('stage');
  const roleType = searchParams.get('role_type');

  let query = `
    SELECT a.*, jp.title as position_title, jp.role_type
    FROM applicants a
    LEFT JOIN job_positions jp ON a.position_id = jp.id
    WHERE 1=1
  `;
  const params: string[] = [];
  if (positionId) { query += ' AND a.position_id = ?'; params.push(positionId); }
  if (stage) { query += ' AND a.stage = ?'; params.push(stage); }
  if (roleType) { query += ' AND jp.role_type = ?'; params.push(roleType); }
  query += ' ORDER BY a.created_at DESC';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { position_id, name, email, phone, source, portfolio_url, resume_url, notes } = body;

  const result = db.prepare(`
    INSERT INTO applicants (position_id, name, email, phone, source, portfolio_url, resume_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    position_id, name, email || '', phone || '',
    source || '', portfolio_url || '', resume_url || '', notes || ''
  );

  const applicant = db.prepare(`
    SELECT a.*, jp.title as position_title, jp.role_type
    FROM applicants a
    LEFT JOIN job_positions jp ON a.position_id = jp.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);
  logActivity('applicant', Number(result.lastInsertRowid), 'created', `Applicant: ${name}`);
  return NextResponse.json(applicant, { status: 201 });
}
