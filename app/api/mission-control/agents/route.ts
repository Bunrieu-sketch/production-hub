import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const database = getDb();
  const rows = database.prepare(`
    SELECT
      a.*, 
      t.id as current_task_id,
      t.title as current_task_title,
      t.status as current_task_status
    FROM mc_agents a
    LEFT JOIN mc_tasks t ON a.current_task_id = t.id
    ORDER BY a.created_at ASC
  `).all();

  return NextResponse.json(rows);
}
