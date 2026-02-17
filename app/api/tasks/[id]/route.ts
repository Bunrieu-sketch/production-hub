import { NextResponse } from 'next/server';
import { updateTask } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await request.json();
  const task = updateTask(parseInt(id), data);
  if (!task) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(task);
}
