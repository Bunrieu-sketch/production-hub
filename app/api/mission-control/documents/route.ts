import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id');
  const agentId = searchParams.get('agent_id');

  const where: string[] = [];
  const params: unknown[] = [];

  if (taskId) {
    where.push('task_id = ?');
    params.push(Number(taskId));
  }

  if (agentId) {
    where.push('agent_id = ?');
    params.push(agentId);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const database = getDb();

  const rows = database.prepare(`
    SELECT d.*, a.name as agent_name, a.avatar_color as agent_color
    FROM mc_documents d
    LEFT JOIN mc_agents a ON d.agent_id = a.id
    ${clause}
    ORDER BY d.created_at DESC
  `).all(...params);

  return NextResponse.json(rows);
}
