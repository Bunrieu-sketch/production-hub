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

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  const db = getDb();
  const todayStr = today();

  // Only show series that aren't fully published
  const series = db.prepare(`
    SELECT id, title, status, target_shoot_start, target_shoot_end, actual_shoot_start, actual_shoot_end
    FROM series
    WHERE status != 'published'
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

  const phasesBySeries = new Map<number, PhaseRow[]>();
  for (const phase of phases) {
    if (!phasesBySeries.has(phase.series_id)) {
      phasesBySeries.set(phase.series_id, []);
    }
    phasesBySeries.get(phase.series_id)?.push(phase);
  }

  const phaseProgress = (phaseRows: PhaseRow[]): number => {
    if (!phaseRows.length) return 0;
    const total = phaseRows.reduce((acc, row) => acc + statusProgress[row.status], 0);
    return Math.round(total / phaseRows.length);
  };

  for (const s of series) {
    const seriesPhases = phasesBySeries.get(s.id) || [];
    
    // Skip series that ended entirely before today (all phases done and in the past)
    const latestEnd = seriesPhases.reduce<string | null>((max, p) => {
      if (!max || p.end_date > max) return p.end_date;
      return max;
    }, null);
    if (latestEnd && latestEnd < todayStr && seriesPhases.every(p => p.status === 'done')) continue;

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

    // Series header bar
    tasks.push({
      id: `series-${s.id}`,
      name: `📺 ${s.title}`,
      start,
      end,
      progress: completed,
      custom_class: 'gantt-parent',
    });

    // One consolidated PREPROD bar per series
    const preprodPhases = seriesPhases.filter(p => p.phase === 'preprod');
    if (preprodPhases.length) {
      tasks.push({
        id: `series-${s.id}-preprod`,
        name: `  Pre-Production`,
        start: preprodPhases.reduce((min, p) => (p.start_date < min ? p.start_date : min), preprodPhases[0].start_date),
        end: preprodPhases.reduce((max, p) => (p.end_date > max ? p.end_date : max), preprodPhases[0].end_date),
        progress: phaseProgress(preprodPhases),
        dependencies: `series-${s.id}`,
        custom_class: 'phase-preprod',
      });
    }

    // One consolidated SHOOT bar per series
    const shootPhases = seriesPhases.filter(p => p.phase === 'shoot');
    if (shootPhases.length) {
      tasks.push({
        id: `series-${s.id}-shoot`,
        name: `  Shooting`,
        start: shootPhases.reduce((min, p) => (p.start_date < min ? p.start_date : min), shootPhases[0].start_date),
        end: shootPhases.reduce((max, p) => (p.end_date > max ? p.end_date : max), shootPhases[0].end_date),
        progress: phaseProgress(shootPhases),
        dependencies: `series-${s.id}`,
        custom_class: 'phase-shoot',
      });
    }

    // One combined EDIT + PUBLISH bar per episode (merge post and publish into a single bar)
    const postPhases = seriesPhases.filter(p => p.phase === 'post');
    const publishPhases = seriesPhases.filter(p => p.phase === 'publish');
    
    // Group by episode_id
    const episodeIds = [...new Set(postPhases.map(p => p.episode_id))];
    for (const epId of episodeIds) {
      const post = postPhases.find(p => p.episode_id === epId);
      const pub = publishPhases.find(p => p.episode_id === epId);
      
      if (post) {
        // Truncate episode title for cleaner display
        const shortTitle = post.episode_title.length > 45 
          ? post.episode_title.substring(0, 42) + '...' 
          : post.episode_title;
        
        const barStart = post.start_date;
        const barEnd = pub ? pub.end_date : post.end_date;
        
        // Combined progress: average of post + publish status
        const postProgress = statusProgress[post.status];
        const pubProgress = pub ? statusProgress[pub.status] : 0;
        const avgProgress = Math.round((postProgress + pubProgress) / 2);
        
        tasks.push({
          id: `episode-${epId}`,
          name: `  ${shortTitle}`,
          start: barStart,
          end: barEnd,
          progress: avgProgress,
          dependencies: `series-${s.id}`,
          custom_class: 'phase-post',
        });
      }
    }
  }

  // Build collapsed view: just series bars with phase sub-bars, no episode detail
  const collapsedTasks = tasks.filter(t => 
    t.custom_class === 'gantt-parent' || 
    t.custom_class === 'phase-preprod' || 
    t.custom_class === 'phase-shoot'
  );

  // Add one "Edit & Publish" bar per series (spanning all episode post/publish)
  for (const s of series) {
    const seriesPhases = phasesBySeries.get(s.id) || [];
    const postPublish = seriesPhases.filter(p => p.phase === 'post' || p.phase === 'publish');
    if (!postPublish.length) continue;
    
    const latestEnd = postPublish.reduce<string | null>((max, p) => {
      if (!max || p.end_date > max) return p.end_date;
      return max;
    }, null);
    if (latestEnd && latestEnd < todayStr && postPublish.every(p => p.status === 'done')) continue;

    const barStart = postPublish.reduce((min, p) => (p.start_date < min ? p.start_date : min), postPublish[0].start_date);
    const barEnd = postPublish.reduce((max, p) => (p.end_date > max ? p.end_date : max), postPublish[0].end_date);
    const epCount = new Set(postPublish.map(p => p.episode_id)).size;
    
    collapsedTasks.push({
      id: `series-${s.id}-postpublish`,
      name: `  Edit & Publish (${epCount} episodes)`,
      start: barStart,
      end: barEnd,
      progress: phaseProgress(postPublish),
      dependencies: `series-${s.id}`,
      custom_class: 'phase-post',
    });
  }

  // Sort: keep series order, with sub-bars after their parent
  collapsedTasks.sort((a, b) => {
    const aSeriesNum = parseInt(a.id.replace('series-', '').split('-')[0]) || 0;
    const bSeriesNum = parseInt(b.id.replace('series-', '').split('-')[0]) || 0;
    if (aSeriesNum !== bSeriesNum) return aSeriesNum - bSeriesNum;
    // Parent first, then preprod, shoot, postpublish
    const order = (id: string) => {
      if (!id.includes('-', id.indexOf('-') + 1)) return 0; // series parent
      if (id.includes('preprod')) return 1;
      if (id.includes('shoot')) return 2;
      if (id.includes('postpublish')) return 3;
      return 4;
    };
    return order(a.id) - order(b.id);
  });

  return NextResponse.json({ tasks: collapsedTasks });
}
