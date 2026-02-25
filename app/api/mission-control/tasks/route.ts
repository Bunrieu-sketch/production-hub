import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const parseJsonArray = (value: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');
  const taskId = searchParams.get('id');

  const where: string[] = [];
  const params: unknown[] = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  if (assignee) {
    where.push('assignee_ids LIKE ?');
    params.push(`%"${assignee}"%`);
  }

  if (taskId) {
    where.push('id = ?');
    params.push(Number(taskId));
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const database = getDb();
  const rows = database.prepare(`SELECT * FROM mc_tasks ${clause} ORDER BY updated_at DESC`).all(...params);

  const shaped = rows.map((row: any) => ({
    ...row,
    assignee_ids: parseJsonArray(row.assignee_ids),
    tags: parseJsonArray(row.tags),
  }));

  return NextResponse.json(shaped);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const database = getDb();

  if (!body.title) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const assigneeIds = Array.isArray(body.assignee_ids) ? body.assignee_ids : [];
  const tags = Array.isArray(body.tags) ? body.tags : [];

  const result = database.prepare(`
    INSERT INTO mc_tasks (title, description, status, priority, assignee_ids, tags, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.title,
    body.description ?? null,
    body.status ?? 'inbox',
    body.priority ?? 'normal',
    JSON.stringify(assigneeIds),
    JSON.stringify(tags),
    body.created_by ?? null
  );

  const taskId = result.lastInsertRowid as number;

  database.prepare(`
    INSERT INTO mc_activities (type, agent_id, message, task_id)
    VALUES (?, ?, ?, ?)
  `).run(
    'task',
    body.created_by ?? null,
    'created',
    taskId
  );

  const task = database.prepare('SELECT * FROM mc_tasks WHERE id = ?').get(taskId) as any;

  return NextResponse.json({
    ...task,
    assignee_ids: parseJsonArray(task.assignee_ids),
    tags: parseJsonArray(task.tags),
  });
}
