import { NextRequest, NextResponse } from 'next/server';
import { getDb, logActivity } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { stage, interview_date, rejection_reason } = body;

  const current = db.prepare('SELECT * FROM applicants WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = { stage };

  // Auto-set timestamps based on stage
  if (stage === 'trial_sent' && !current.trial_task_sent_at) {
    updates.trial_task_sent_at = new Date().toISOString().split('T')[0];
  }

  if (stage === 'interview' && interview_date) {
    updates.interview_date = interview_date;
  }

  if (stage === 'rejected' && rejection_reason) {
    updates.rejection_reason = rejection_reason;
  }

  const fields = Object.keys(updates);
  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  db.prepare(`UPDATE applicants SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);

  const updated = db.prepare(`
    SELECT a.*, jp.title as position_title
    FROM applicants a
    LEFT JOIN job_positions jp ON a.position_id = jp.id
    WHERE a.id = ?
  `).get(id);

  logActivity('applicant', parseInt(id), 'stage_changed', `Moved to ${stage}`);
  return NextResponse.json(updated);
}
