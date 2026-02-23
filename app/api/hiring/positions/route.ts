import { NextRequest, NextResponse } from 'next/server';
import { getDb, logActivity } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT jp.*,
      COUNT(a.id) as applicant_count,
      SUM(CASE WHEN a.stage = 'applied' THEN 1 ELSE 0 END) as applied_count,
      SUM(CASE WHEN a.stage = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
      SUM(CASE WHEN a.stage = 'trial_sent' THEN 1 ELSE 0 END) as trial_sent_count,
      SUM(CASE WHEN a.stage = 'evaluation' THEN 1 ELSE 0 END) as evaluation_count,
      SUM(CASE WHEN a.stage = 'interview' THEN 1 ELSE 0 END) as interview_count,
      SUM(CASE WHEN a.stage = 'hired' THEN 1 ELSE 0 END) as hired_count,
      SUM(CASE WHEN a.stage = 'rejected' THEN 1 ELSE 0 END) as rejected_count
    FROM job_positions jp
    LEFT JOIN applicants a ON jp.id = a.position_id
    GROUP BY jp.id
    ORDER BY jp.created_at DESC
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, role_type, status, description, requirements, rate_range, location_preference, job_board_urls, trial_task_doc_url } = body;

  const result = db.prepare(`
    INSERT INTO job_positions (title, role_type, status, description, requirements, rate_range, location_preference, job_board_urls, trial_task_doc_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, role_type || 'producer', status || 'active',
    description || '', requirements || '', rate_range || '',
    location_preference || '', job_board_urls || '', trial_task_doc_url || ''
  );

  const position = db.prepare('SELECT * FROM job_positions WHERE id = ?').get(result.lastInsertRowid);
  logActivity('job_position', Number(result.lastInsertRowid), 'created', `Position: ${title}`);
  return NextResponse.json(position, { status: 201 });
}
