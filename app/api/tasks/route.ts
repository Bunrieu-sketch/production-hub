import { NextResponse } from 'next/server';
import { getAllTasks, createTask } from '@/lib/db';

export async function GET() {
  const tasks = getAllTasks();
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const data = await request.json();
  const task = createTask({
    title: data.title,
    description: data.description || '',
    stage: data.stage || 'backlog',
    project: data.project || 'general',
    priority: data.priority || 'normal'
  });
  return NextResponse.json(task, { status: 201 });
}
