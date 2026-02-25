import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id');

  if (!taskId) {
    return NextResponse.json({ error: 'task_id is required.' }, { status: 400 });
  }

  const database = getDb();
  const rows = database.prepare(`
    SELECT m.*, a.name as agent_name, a.avatar_color as agent_color
    FROM mc_messages m
    LEFT JOIN mc_agents a ON m.from_agent_id = a.id
    WHERE m.task_id = ?
    ORDER BY m.created_at ASC
  `).all(Number(taskId));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const database = getDb();

  if (!body.task_id || !body.content) {
    return NextResponse.json({ error: 'task_id and content are required.' }, { status: 400 });
  }

  const result = database.prepare(`
    INSERT INTO mc_messages (task_id, from_agent_id, content)
    VALUES (?, ?, ?)
  `).run(Number(body.task_id), body.from_agent_id ?? null, body.content);

  database.prepare(`
    INSERT INTO mc_activities (type, agent_id, message, task_id)
    VALUES (?, ?, ?, ?)
  `).run('comment', body.from_agent_id ?? null, 'commented on task', Number(body.task_id));

  const message = database.prepare('SELECT * FROM mc_messages WHERE id = ?').get(result.lastInsertRowid as number);
  return NextResponse.json(message);
}
