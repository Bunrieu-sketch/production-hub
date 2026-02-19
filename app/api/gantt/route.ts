import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type PhaseRow = {
  id: number;
  phase: 'preprod' | 'shoot' | 'post' | 'publish';
  start_date: string;
  end_date: string;
  status: 'planned' | 'in_progress' | 'done';
  episode_id: number;
  episode_title: string;
  series_id: number;
};

type SeriesRow = {
  id: number;
  title: string;
  status: string;
  target_shoot_start: string | null;
  target_shoot_end: string | null;
  actual_shoot_start: string | null;
  actual_shoot_end: string | null;
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export async function GET() {
  const db = getDb();

  const series = db.prepare(`
    SELECT id, title, status, target_shoot_start, target_shoot_end, actual_shoot_start, actual_shoot_end
    FROM series
    ORDER BY id
  `).all() as SeriesRow[];

  const phases = db.prepare(`
    SELECT
      ep.id,
      ep.phase,
      ep.start_date,
      ep.end_date,
      ep.status,
      e.id as episode_id,
      e.title as episode_title,
      e.series_id as series_id
    FROM episode_phases ep
    JOIN episodes e ON ep.episode_id = e.id
    ORDER BY e.series_id, e.id, ep.start_date
  `).all() as PhaseRow[];

  const phaseColors: Record<PhaseRow['phase'], string> = {
    preprod: '#58a6ff',
    shoot: '#a371f7',
    post: '#d29922',
    publish: '#3fb950',
  };

  const statusProgress: Record<PhaseRow['status'], number> = {
    planned: 0,
    in_progress: 50,
    done: 100,
  };

  const tasks: Array<{
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }> = [];

  for (const s of series) {
    const seriesPhases = phases.filter(p => p.series_id === s.id);
    const derivedStart = seriesPhases.reduce<string | null>((min, p) => {
      if (!min || p.start_date < min) return p.start_date;
      return min;
    }, null);
    const derivedEnd = seriesPhases.reduce<string | null>((max, p) => {
      if (!max || p.end_date > max) return p.end_date;
      return max;
    }, null);

    const start = derivedStart || s.actual_shoot_start || s.target_shoot_start;
    if (!start) continue;
    let end = derivedEnd || s.actual_shoot_end || s.target_shoot_end;
    if (!end) end = addDays(start, 7);

    const completed = seriesPhases.length
      ? Math.round(seriesPhases.reduce((acc, p) => acc + statusProgress[p.status], 0) / seriesPhases.length)
      : 0;

    tasks.push({
      id: `series-${s.id}`,
      name: s.title,
      start,
      end,
      progress: completed,
      custom_class: 'gantt-parent',
    });

    for (const p of seriesPhases) {
      tasks.push({
        id: `phase-${p.id}`,
        name: `- ${p.episode_title} - ${p.phase.toUpperCase()}`,
        start: p.start_date,
        end: p.end_date,
        progress: statusProgress[p.status],
        dependencies: `series-${s.id}`,
        custom_class: `phase-${p.phase}`,
      });
    }
  }

  return NextResponse.json({ tasks });
}
