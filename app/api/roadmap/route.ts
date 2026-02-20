import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type SeriesRow = {
  id: number;
  title: string;
  status: string;
  target_shoot_start: string | null;
  target_shoot_end: string | null;
};

type EpisodeRow = {
  id: number;
  series_id: number;
  title: string;
  sort_order: number | null;
  episode_type: string;
};

const PREPROD_WEEKS = 5;
const SHOOT_WEEKS = 2;
const EDIT_WEEKS_PER_EP = 2;
const EDIT_STAGGER_WEEKS = 1;

const COLOR_PALETTE = ['#4DD0E1', '#F59E0B', '#60A5FA'];

function toDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = toDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

function addWeeks(dateStr: string, weeks: number): string {
  return addDays(dateStr, weeks * 7);
}

function startOfWeek(dateStr: string): string {
  const d = toDate(dateStr);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return formatDate(d);
}

function nextSaturday(dateStr: string): string {
  const d = toDate(dateStr);
  const day = d.getUTCDay();
  const diff = (6 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return formatDate(d);
}

function rangeFromWeeks(start: string, weeks: number) {
  const end = addDays(start, weeks * 7 - 1);
  const nextStart = addDays(start, weeks * 7);
  return { start, end, nextStart };
}

function minDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const producersParam = Number(searchParams.get('producers') || '1');
  const producerCount = producersParam >= 2 ? 2 : 1;

  const series = db.prepare(`
    SELECT id, title, status, target_shoot_start, target_shoot_end
    FROM series
    WHERE status NOT IN ('published', 'archived')
    ORDER BY
      CASE WHEN target_shoot_start IS NULL THEN 1 ELSE 0 END,
      target_shoot_start,
      id
  `).all() as SeriesRow[];

  const episodes = db.prepare(`
    SELECT id, series_id, title, sort_order, episode_type
    FROM episodes
    WHERE episode_type IN ('cornerstone', 'filler')
    ORDER BY sort_order, id
  `).all() as EpisodeRow[];

  const episodesBySeries = new Map<number, EpisodeRow[]>();
  for (const ep of episodes) {
    if (!episodesBySeries.has(ep.series_id)) episodesBySeries.set(ep.series_id, []);
    episodesBySeries.get(ep.series_id)?.push(ep);
  }

  const todayStr = formatDate(new Date());
  const earliestTarget = series.reduce<string | null>(
    (min, s) => minDate(min, s.target_shoot_start),
    null
  );
  const baseProducerDate = earliestTarget
    ? addWeeks(earliestTarget, -PREPROD_WEEKS)
    : todayStr;

  const producerAvailability = Array.from({ length: producerCount }).map(() => baseProducerDate);

  const tracks: Array<{ id: number; lastEnd: string; lastColorIndex: number | null }> = [];
  const scheduledSeries: Array<{
    id: number;
    title: string;
    track: number;
    color: string;
    producerIndex: number;
    preprod: { start: string; end: string };
    shoot: { start: string; end: string };
    edits: Array<{
      episodeId: number;
      title: string;
      start: string;
      end: string;
      editorSlot: number;
      index: number;
      episodeType: string;
    }>;
    publishes: Array<{
      episodeId: number;
      title: string;
      start: string;
      end: string;
      index: number;
      publishDate: string;
      episodeType: string;
    }>;
    block: { start: string; end: string };
  }> = [];

  for (const s of series) {
    const seriesEpisodes = episodesBySeries.get(s.id) || [];
    const desiredShootStart = s.target_shoot_start;
    const preprodStartCandidate = desiredShootStart
      ? addWeeks(desiredShootStart, -PREPROD_WEEKS)
      : null;

    let chosenProducer = 0;
    let chosenStart = preprodStartCandidate
      ? maxDate(producerAvailability[0], preprodStartCandidate) as string
      : producerAvailability[0];

    for (let i = 1; i < producerAvailability.length; i += 1) {
      const candidate = preprodStartCandidate
        ? (maxDate(producerAvailability[i], preprodStartCandidate) as string)
        : producerAvailability[i];
      if (candidate < chosenStart) {
        chosenStart = candidate;
        chosenProducer = i;
      }
    }

    const preprodRange = rangeFromWeeks(chosenStart, PREPROD_WEEKS);
    const shootRange = rangeFromWeeks(preprodRange.nextStart, SHOOT_WEEKS);
    const editStartBase = shootRange.nextStart;

    const edits = seriesEpisodes.map((ep, index) => {
      const start = addWeeks(editStartBase, index * EDIT_STAGGER_WEEKS);
      const end = addDays(start, EDIT_WEEKS_PER_EP * 7 - 1);
      return {
        episodeId: ep.id,
        title: ep.title,
        start,
        end,
        editorSlot: index % 2,
        index,
        episodeType: ep.episode_type,
      };
    });

    const editEndForPublish = edits.length
      ? edits[0].end
      : addDays(editStartBase, EDIT_WEEKS_PER_EP * 7 - 1);
    const publishStart = nextSaturday(editEndForPublish);

    const publishes = edits.map((edit, index) => {
      const publishDate = addDays(publishStart, index * 7);
      return {
        episodeId: edit.episodeId,
        title: edit.title,
        start: publishDate,
        end: addDays(publishDate, 6),
        index,
        publishDate,
        episodeType: edit.episodeType,
      };
    });

    const publishEnd = publishes.length
      ? publishes[publishes.length - 1].end
      : shootRange.end;

    producerAvailability[chosenProducer] = preprodRange.nextStart;

    const blockStart = preprodRange.start;
    const blockEnd = publishEnd;

    let trackIndex = -1;
    let bestLastEnd: string | null = null;
    for (let i = 0; i < tracks.length; i += 1) {
      const t = tracks[i];
      if (t.lastEnd <= blockStart) {
        if (!bestLastEnd || t.lastEnd < bestLastEnd) {
          bestLastEnd = t.lastEnd;
          trackIndex = i;
        }
      }
    }

    if (trackIndex === -1) {
      tracks.push({ id: tracks.length + 1, lastEnd: blockEnd, lastColorIndex: null });
      trackIndex = tracks.length - 1;
    } else {
      tracks[trackIndex].lastEnd = blockEnd;
    }

    const track = tracks[trackIndex];
    const lastColorIndex = track.lastColorIndex ?? -1;
    const nextColorIndex = (lastColorIndex + 1) % COLOR_PALETTE.length;
    track.lastColorIndex = nextColorIndex;

    scheduledSeries.push({
      id: s.id,
      title: s.title,
      track: track.id,
      color: COLOR_PALETTE[nextColorIndex],
      producerIndex: chosenProducer,
      preprod: { start: preprodRange.start, end: preprodRange.end },
      shoot: { start: shootRange.start, end: shootRange.end },
      edits,
      publishes,
      block: { start: blockStart, end: blockEnd },
    });
  }

  const year = new Date().getUTCFullYear();
  const yearStart = formatDate(new Date(Date.UTC(year, 0, 1)));
  const yearEnd = formatDate(new Date(Date.UTC(year, 11, 31)));
  const weekStart = startOfWeek(yearStart);
  const weekEnd = startOfWeek(yearEnd);

  const weeks: Array<{ index: number; start: string; end: string; label: string; month: number; monthLabel: string }> = [];
  let cursor = weekStart;
  let index = 0;
  while (cursor <= weekEnd) {
    const start = cursor;
    const end = addDays(start, 6);
    const d = toDate(start);
    const month = d.getUTCMonth();
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    weeks.push({
      index,
      start,
      end,
      label: `W${index + 1}`,
      month,
      monthLabel,
    });
    cursor = addDays(start, 7);
    index += 1;
  }

  return NextResponse.json({
    weeks,
    tracks: tracks.map((t) => ({ id: t.id, label: `Track ${t.id}` })),
    series: scheduledSeries,
    producerCount,
    year,
  });
}
