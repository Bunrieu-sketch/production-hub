import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  const db = getDb();
  const events: Record<string, unknown>[] = [];

  const series = db.prepare("SELECT * FROM series").all() as any[];
  for (const s of series) {
    if (s.target_shoot_start) {
      events.push({
        type: "shoot", title: s.title,
        start: s.target_shoot_start,
        end: s.target_shoot_end || s.target_shoot_start,
        status: s.status, series_id: s.id,
      });
    }
  }

  const milestones = db.prepare(`
    SELECT m.*, s.title as series_title FROM milestones m
    JOIN series s ON s.id = m.series_id WHERE m.due_date IS NOT NULL
  `).all() as any[];

  for (const m of milestones) {
    events.push({
      type: "milestone",
      title: `${m.series_title}: ${m.title}`,
      start: m.due_date, end: m.due_date,
      status: m.completed ? "done" : "pending",
      series_id: m.series_id,
    });
  }

  const filtered = month
    ? events.filter(e => (e.start as string)?.startsWith(month))
    : events;

  return NextResponse.json(filtered);
}
