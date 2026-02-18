import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();

  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

  const events: Array<{ id: string; date: string; title: string; type: string; color: string }> = [];

  // Series shoot dates
  const seriesShots = db.prepare(`
    SELECT id, title, target_shoot_start, target_shoot_end FROM series
    WHERE target_shoot_start BETWEEN ? AND ? OR actual_shoot_start BETWEEN ? AND ?
  `).all(startDate, endDate, startDate, endDate) as Array<{ id: number; title: string; target_shoot_start: string }>;

  for (const s of seriesShots) {
    if (s.target_shoot_start) {
      events.push({ id: `shoot-${s.id}`, date: s.target_shoot_start, title: `Shoot: ${s.title}`, type: 'shoot', color: 'var(--accent)' });
    }
  }

  // Episode publish dates
  const epPublish = db.prepare(`
    SELECT e.id, e.title, e.publish_date FROM episodes e
    WHERE e.publish_date BETWEEN ? AND ?
  `).all(startDate, endDate) as Array<{ id: number; title: string; publish_date: string }>;

  for (const e of epPublish) {
    events.push({ id: `publish-${e.id}`, date: e.publish_date, title: `Publish: ${e.title}`, type: 'publish', color: 'var(--green)' });
  }

  // Sponsor deadlines
  const sponsorDeadlines = db.prepare(`
    SELECT id, brand_name, script_due, live_date FROM sponsors
    WHERE script_due BETWEEN ? AND ? OR live_date BETWEEN ? AND ?
  `).all(startDate, endDate, startDate, endDate) as Array<{ id: number; brand_name: string; script_due: string; live_date: string }>;

  for (const s of sponsorDeadlines) {
    if (s.script_due && s.script_due >= startDate && s.script_due <= endDate) {
      events.push({ id: `script-${s.id}`, date: s.script_due, title: `Script: ${s.brand_name}`, type: 'deadline', color: 'var(--orange)' });
    }
    if (s.live_date && s.live_date >= startDate && s.live_date <= endDate) {
      events.push({ id: `live-${s.id}`, date: s.live_date, title: `Live: ${s.brand_name}`, type: 'sponsor', color: 'var(--blue)' });
    }
  }

  // Milestones
  const milestones = db.prepare(`
    SELECT m.id, m.title, m.due_date, m.completed, s.title as series_title
    FROM milestones m JOIN series s ON m.series_id = s.id
    WHERE m.due_date BETWEEN ? AND ?
  `).all(startDate, endDate) as Array<{ id: number; title: string; due_date: string; completed: number; series_title: string }>;

  for (const m of milestones) {
    events.push({ id: `ms-${m.id}`, date: m.due_date, title: m.title, type: 'milestone', color: m.completed ? 'var(--green)' : 'var(--red)' });
  }

  return NextResponse.json(events);
}
