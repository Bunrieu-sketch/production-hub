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

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  const body = await request.json().catch(() => ({}));
  const database = getDb();

  const existing = database.prepare('SELECT * FROM mc_tasks WHERE id = ?').get(Number(id)) as any | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  const allowed = ['title', 'description', 'status', 'priority', 'created_by'];

  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if ('assignee_ids' in body) {
    const assigneeIds = Array.isArray(body.assignee_ids) ? body.assignee_ids : [];
    updates.push('assignee_ids = ?');
    values.push(JSON.stringify(assigneeIds));
  }

  if ('tags' in body) {
    const tags = Array.isArray(body.tags) ? body.tags : [];
    updates.push('tags = ?');
    values.push(JSON.stringify(tags));
  }

  if (!updates.length) {
    return NextResponse.json({ error: 'No valid fields provided.' }, { status: 400 });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());

  const prevStatus = existing.status;
  const nextStatus = body.status ?? existing.status;

  database.prepare(`UPDATE mc_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values, Number(id));

  if (prevStatus !== nextStatus) {
    database.prepare(`
      INSERT INTO mc_activities (type, agent_id, message, task_id)
      VALUES (?, ?, ?, ?)
    `).run(
      'status',
      body.updated_by ?? body.created_by ?? existing.created_by ?? null,
      `moved to ${nextStatus}`,
      Number(id)
    );
  }

  const task = database.prepare('SELECT * FROM mc_tasks WHERE id = ?').get(Number(id)) as any;

  return NextResponse.json({
    ...task,
    assignee_ids: parseJsonArray(task.assignee_ids),
    tags: parseJsonArray(task.tags),
  });
}
