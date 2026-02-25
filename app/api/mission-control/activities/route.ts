import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const agent = searchParams.get('agent');

  const limit = limitParam ? Math.min(Number(limitParam), 200) : 40;
  const where: string[] = [];
  const params: unknown[] = [];

  if (agent) {
    where.push('a.agent_id = ?');
    params.push(agent);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const database = getDb();

  const rows = database.prepare(`
    SELECT a.*, ag.name as agent_name, ag.avatar_color as agent_color, t.title as task_title
    FROM mc_activities a
    LEFT JOIN mc_agents ag ON a.agent_id = ag.id
    LEFT JOIN mc_tasks t ON a.task_id = t.id
    ${clause}
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(...params, limit);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const database = getDb();

  if (!body.type || !body.message) {
    return NextResponse.json({ error: 'type and message are required.' }, { status: 400 });
  }

  const result = database.prepare(`
    INSERT INTO mc_activities (type, agent_id, message, task_id)
    VALUES (?, ?, ?, ?)
  `).run(body.type, body.agent_id ?? null, body.message, body.task_id ?? null);

  const activity = database.prepare('SELECT * FROM mc_activities WHERE id = ?').get(result.lastInsertRowid as number);
  return NextResponse.json(activity);
}
