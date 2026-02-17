import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { action, details, source } = await request.json();
    
    if (!action || !details) {
      return NextResponse.json({ error: 'action and details required' }, { status: 400 });
    }
    
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO activity_log (action, task_id, details) VALUES (?, ?, ?)'
    ).run(source || 'external', null, `[${source || 'system'}] ${details}`);
    
    return NextResponse.json({ 
      id: result.lastInsertRowid,
      action,
      details,
      created_at: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Activity log error:', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}
