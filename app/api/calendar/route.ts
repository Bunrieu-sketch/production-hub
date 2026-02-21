import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const COLORS = {
  preprod: '#58a6ff',
  shoot: '#a371f7',
  post: '#d29922',
  publish: '#3fb950',
  sponsor: '#58a6ff',
  milestone: '#f85149',
  idea: '#8b949e',
  series: '#30363d',
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
};

function toDateString(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndExclusive = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0];

  const startDate = toDateString(startParam) || defaultStart;
  const endDateExclusive = toDateString(endParam) || defaultEndExclusive;
  const endDateInclusive = addDays(endDateExclusive, -1);

  const events: CalendarEvent[] = [];

  const phases = db.prepare(`
    SELECT ep.id, ep.phase, ep.start_date, ep.end_date, e.title as episode_title
    FROM episode_phases ep
    JOIN episodes e ON ep.episode_id = e.id
    WHERE ep.start_date <= ? AND ep.end_date >= ?
  `).all(endDateInclusive, startDate) as Array<{
    id: number;
    phase: 'preprod' | 'shoot' | 'post' | 'publish';
    start_date: string;
    end_date: string;
    episode_title: string;
  }>;

  for (const phase of phases) {
    events.push({
      id: `phase-${phase.id}`,
      title: `${phase.phase.toUpperCase()}: ${phase.episode_title}`,
      start: phase.start_date,
      end: addDays(phase.end_date, 1),
      allDay: true,
      backgroundColor: COLORS[phase.phase],
      borderColor: COLORS[phase.phase],
    });
  }

  const sponsors = db.prepare(`
    SELECT id, brand_name, script_due, live_date, payment_due_date
    FROM sponsors
    WHERE (script_due BETWEEN ? AND ?)
       OR (live_date BETWEEN ? AND ?)
       OR (payment_due_date BETWEEN ? AND ?)
  `).all(startDate, endDateInclusive, startDate, endDateInclusive, startDate, endDateInclusive) as Array<{
    id: number;
    brand_name: string;
    script_due: string | null;
    live_date: string | null;
    payment_due_date: string | null;
  }>;

  for (const sponsor of sponsors) {
    if (sponsor.script_due) {
      events.push({
        id: `sponsor-script-${sponsor.id}`,
        title: `Script due: ${sponsor.brand_name}`,
        start: sponsor.script_due,
        allDay: true,
        backgroundColor: COLORS.sponsor,
        borderColor: COLORS.sponsor,
      });
    }
    if (sponsor.live_date) {
      events.push({
        id: `sponsor-live-${sponsor.id}`,
        title: `Live: ${sponsor.brand_name}`,
        start: sponsor.live_date,
        allDay: true,
        backgroundColor: COLORS.sponsor,
        borderColor: COLORS.sponsor,
      });
    }
    if (sponsor.payment_due_date) {
      events.push({
        id: `sponsor-pay-${sponsor.id}`,
        title: `Payment due: ${sponsor.brand_name}`,
        start: sponsor.payment_due_date,
        allDay: true,
        backgroundColor: COLORS.sponsor,
        borderColor: COLORS.sponsor,
      });
    }
  }

  const milestones = db.prepare(`
    SELECT id, title, due_date
    FROM milestones
    WHERE due_date BETWEEN ? AND ?
  `).all(startDate, endDateInclusive) as Array<{ id: number; title: string; due_date: string }>;

  for (const milestone of milestones) {
    events.push({
      id: `milestone-${milestone.id}`,
      title: `Milestone: ${milestone.title}`,
      start: milestone.due_date,
      allDay: true,
      backgroundColor: COLORS.milestone,
      borderColor: COLORS.milestone,
    });
  }

  const ideas = db.prepare(`
    SELECT id, title, shoot_date
    FROM episodes
    WHERE stage = 'idea'
      AND shoot_date IS NOT NULL
      AND shoot_date BETWEEN ? AND ?
  `).all(startDate, endDateInclusive) as Array<{ id: number; title: string; shoot_date: string }>;

  for (const idea of ideas) {
    events.push({
      id: `idea-${idea.id}`,
      title: `💡 IDEA: ${idea.title}`,
      start: idea.shoot_date,
      allDay: true,
      backgroundColor: COLORS.idea,
      borderColor: COLORS.idea,
    });
  }

  const series = db.prepare(`
    SELECT id, title, target_shoot_start, target_shoot_end
    FROM series
    WHERE target_shoot_start IS NOT NULL
      AND target_shoot_end IS NOT NULL
      AND target_shoot_start <= ?
      AND target_shoot_end >= ?
  `).all(endDateInclusive, startDate) as Array<{
    id: number;
    title: string;
    target_shoot_start: string;
    target_shoot_end: string;
  }>;

  for (const s of series) {
    events.push({
      id: `series-${s.id}`,
      title: `SERIES: ${s.title}`,
      start: s.target_shoot_start,
      end: addDays(s.target_shoot_end, 1),
      allDay: true,
      backgroundColor: COLORS.series,
      borderColor: COLORS.series,
    });
  }

  return NextResponse.json(events);
}
