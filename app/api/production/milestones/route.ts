import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { series_id, title, due_date } = await req.json();
  const db = getDb();
  const result = db.prepare("INSERT INTO milestones (series_id, title, due_date, week_number) VALUES (?, ?, ?, ?)").run(series_id, title, due_date, 0);
  return NextResponse.json({ id: result.lastInsertRowid });
}
