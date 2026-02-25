import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  const body = await request.json().catch(() => ({}));

  const updates: Array<{ key: string; value: unknown }> = [];
  const allowed = ['status', 'current_task_id', 'session_key', 'last_heartbeat', 'avatar_color', 'avatar_icon', 'codename', 'role', 'role_type', 'name'];

  for (const key of allowed) {
    if (key in body) updates.push({ key, value: body[key] });
  }

  if (!updates.length) {
    return NextResponse.json({ error: 'No valid fields provided.' }, { status: 400 });
  }

  const database = getDb();
  const setClause = updates.map((u) => `${u.key} = ?`).join(', ');
  const values = updates.map((u) => u.value);

  const result = database.prepare(`UPDATE mc_agents SET ${setClause} WHERE id = ?`).run(...values, id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
  }

  const agent = database.prepare('SELECT * FROM mc_agents WHERE id = ?').get(id);
  return NextResponse.json(agent);
}
