import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const series = db.prepare(`
    SELECT * FROM series
    WHERE target_shoot_start IS NOT NULL OR actual_shoot_start IS NOT NULL
    ORDER BY COALESCE(target_shoot_start, actual_shoot_start)
  `).all() as Array<{
    id: number; title: string; status: string;
    target_shoot_start: string; target_shoot_end: string;
    actual_shoot_start: string; actual_shoot_end: string;
  }>;

  const episodes = db.prepare(`
    SELECT e.* FROM episodes e
    WHERE e.shoot_date IS NOT NULL OR e.publish_date IS NOT NULL
    ORDER BY COALESCE(e.shoot_date, e.publish_date)
  `).all() as Array<{ id: number; series_id: number; title: string; stage: string; shoot_date: string; publish_date: string }>;

  const milestones = db.prepare(`
    SELECT m.* FROM milestones m
    WHERE m.due_date IS NOT NULL
    ORDER BY m.due_date
  `).all() as Array<{ id: number; series_id: number; title: string; due_date: string; completed: number }>;

  const statusColors: Record<string, string> = {
    ideation: '#8b949e',
    pre_prod: '#58a6ff',
    shooting: '#a371f7',
    post_prod: '#d29922',
    published: '#3fb950',
    archived: '#8b949e',
  };

  const stageColors: Record<string, string> = {
    idea: '#8b949e',
    outlined: '#58a6ff',
    confirmed: '#58a6ff',
    filming: '#a371f7',
    editing: '#3fb950',
    review: '#d29922',
    published: '#3fb950',
  };

  type GanttTask = {
    id: string; text: string; start_date: string; end_date: string;
    type: string; parent?: string; color?: string;
  };
  const tasks: GanttTask[] = [];

  for (const s of series) {
    const start = s.actual_shoot_start || s.target_shoot_start;
    let end = s.actual_shoot_end || s.target_shoot_end;
    if (!end) {
      const d = new Date(start);
      d.setDate(d.getDate() + 7);
      end = d.toISOString().split('T')[0];
    }
    tasks.push({ id: `s-${s.id}`, text: s.title, start_date: start, end_date: end, type: 'project', color: statusColors[s.status] || '#8b949e' });
  }

  for (const e of episodes) {
    const start = e.shoot_date || e.publish_date;
    if (!start) continue;
    const end = e.publish_date || new Date(new Date(start).getTime() + 86400000).toISOString().split('T')[0];
    tasks.push({ id: `e-${e.id}`, text: e.title, start_date: start, end_date: end, type: 'task', parent: `s-${e.series_id}`, color: stageColors[e.stage] || '#8b949e' });
  }

  return NextResponse.json({ tasks, milestones });
}
