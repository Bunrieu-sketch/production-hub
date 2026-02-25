import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const database = getDb();

  const agentsActive = (database.prepare("SELECT COUNT(*) as count FROM mc_agents WHERE status = 'working'").get() as { count: number }).count;
  const tasksInQueue = (database.prepare("SELECT COUNT(*) as count FROM mc_tasks WHERE status != 'done'").get() as { count: number }).count;
  const totalTasks = (database.prepare('SELECT COUNT(*) as count FROM mc_tasks').get() as { count: number }).count;

  return NextResponse.json({ agentsActive, tasksInQueue, totalTasks });
}
