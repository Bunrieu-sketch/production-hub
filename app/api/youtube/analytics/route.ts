import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type AnalyticsRow = {
  id: number;
  fetched_at: string;
  period_start: string;
  period_end: string;
  channel_id: string;
  channel_title: string;
  subscribers: number;
  views: number;
  watch_time_hours: number;
  estimated_revenue: number;
  top_videos: string; // JSON
  traffic_sources: string; // JSON
  demographics: string; // JSON
  realtime_subscribers: number;
  realtime_views_48h: number;
};

type YouTubeChannel = {
  id: string;
  snippet?: { title?: string };
  statistics?: { subscriberCount?: string };
};

type AnalyticsReport = {
  kind?: string;
  columnHeaders?: Array<{ name: string; columnType: string; dataType: string }>;
  rows?: any[][];
};

type TopVideoRow = {
  videoId: string;
  title: string;
  publishedAt: string | null;
  views: number;
  watchTimeHours: number;
  subscribers: number;
  revenue: number;
  impressions: number;
  ctr: number; // 0-1
};

function toDateString(d: Date) {
  return d.toISOString().split('T')[0];
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function reportToObjectRow(report: AnalyticsReport) {
  const headers = (report.columnHeaders || []).map(h => h.name);
  const row = (report.rows || [])[0] || [];
  const obj: Record<string, any> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i];
  });
  return obj;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return res.json();
}

function getOAuthToken() {
  return (
    process.env.YOUTUBE_ACCESS_TOKEN ||
    process.env.YOUTUBE_OAUTH_ACCESS_TOKEN ||
    process.env.GOOGLE_ACCESS_TOKEN ||
    ''
  );
}

async function getChannel({ apiKey, accessToken }: { apiKey?: string; accessToken?: string }) {
  // Prefer OAuth + mine=true if available.
  if (accessToken) {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.search = new URLSearchParams({
      part: 'snippet,statistics',
      mine: 'true',
    }).toString();
    const data = await fetchJson(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const channel = (data.items || [])[0] as YouTubeChannel | undefined;
    if (!channel?.id) throw new Error('Could not resolve channel via mine=true');
    return channel;
  }

  const envChannelId = process.env.YOUTUBE_CHANNEL_ID;
  if (envChannelId && apiKey) {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.search = new URLSearchParams({
      part: 'snippet,statistics',
      id: envChannelId,
      key: apiKey,
    }).toString();
    const data = await fetchJson(url.toString());
    const channel = (data.items || [])[0] as YouTubeChannel | undefined;
    if (!channel?.id) throw new Error('Could not resolve channel via YOUTUBE_CHANNEL_ID');
    return channel;
  }

  throw new Error(
    'Missing OAuth access token for mine=true. Set YOUTUBE_ACCESS_TOKEN (or YOUTUBE_OAUTH_ACCESS_TOKEN).'
  );
}

async function queryAnalyticsReport(params: {
  accessToken: string;
  channelId: string;
  startDate: string;
  endDate: string;
  metrics: string;
  dimensions?: string;
  sort?: string;
  maxResults?: number;
}) {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  const search = new URLSearchParams({
    ids: `channel==${params.channelId}`,
    startDate: params.startDate,
    endDate: params.endDate,
    metrics: params.metrics,
  });
  if (params.dimensions) search.set('dimensions', params.dimensions);
  if (params.sort) search.set('sort', params.sort);
  if (params.maxResults) search.set('maxResults', String(params.maxResults));
  // daily granularity is the default; we keep it simple

  url.search = search.toString();
  return (await fetchJson(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })) as AnalyticsReport;
}

async function fetchVideoSnippets({ apiKey, accessToken, ids }: { apiKey?: string; accessToken?: string; ids: string[] }) {
  if (!ids.length) return new Map<string, { title: string; publishedAt: string | null }>();
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  const search = new URLSearchParams({
    part: 'snippet',
    id: ids.join(','),
  });
  if (apiKey) search.set('key', apiKey);
  url.search = search.toString();

  const data = await fetchJson(url.toString(), accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined);
  const items = (data.items || []) as Array<{ id: string; snippet?: { title?: string; publishedAt?: string } }>;
  const map = new Map<string, { title: string; publishedAt: string | null }>();
  for (const it of items) {
    map.set(it.id, {
      title: it.snippet?.title || 'Untitled',
      publishedAt: it.snippet?.publishedAt || null,
    });
  }
  return map;
}

function normalizeTrafficSources(rows: any[][] | undefined) {
  const totals = (rows || []).reduce((sum, r) => sum + safeNumber(r[1]), 0);
  const raw: Record<string, number> = {};
  for (const r of rows || []) {
    const source = String(r[0] || 'UNKNOWN');
    raw[source] = (raw[source] || 0) + safeNumber(r[1]);
  }

  const mapKey = (k: string) => {
    // Values are documented as insightTrafficSourceType enum-like strings.
    if (k === 'BROWSE') return 'Browse features';
    if (k === 'SUGGESTED') return 'Suggested videos';
    if (k === 'YT_SEARCH') return 'YouTube search';
    if (k === 'EXT_URL') return 'External';
    if (k === 'CHANNEL') return 'Channel pages';
    return 'Others';
  };

  const buckets: Record<string, number> = {
    'Browse features': 0,
    'Suggested videos': 0,
    'YouTube search': 0,
    External: 0,
    'Channel pages': 0,
    Others: 0,
  };

  for (const [k, v] of Object.entries(raw)) {
    buckets[mapKey(k)] += v;
  }

  const pct = (n: number) => (totals ? n / totals : 0);
  return {
    totals,
    percentages: {
      browse: pct(buckets['Browse features']),
      suggested: pct(buckets['Suggested videos']),
      search: pct(buckets['YouTube search']),
      external: pct(buckets['External']),
      channelPages: pct(buckets['Channel pages']),
      others: pct(buckets['Others']),
    },
    buckets,
  };
}

function normalizeDemographics(rows: any[][] | undefined) {
  // rows: [ageGroup, gender, viewerPercentage]
  const result: Record<string, Record<string, number>> = {};
  for (const r of rows || []) {
    const age = String(r[0] || 'UNKNOWN');
    const gender = String(r[1] || 'UNKNOWN');
    const pct = safeNumber(r[2]);
    if (!result[age]) result[age] = {};
    result[age][gender] = pct;
  }
  return result;
}

export async function GET() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM youtube_analytics ORDER BY fetched_at DESC LIMIT 1').get() as AnalyticsRow | undefined;
  if (!row) return NextResponse.json({ data: null });

  return NextResponse.json({
    data: {
      ...row,
      top_videos: JSON.parse(row.top_videos || '[]'),
      traffic_sources: JSON.parse(row.traffic_sources || '{}'),
      demographics: JSON.parse(row.demographics || '{}'),
    },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const accessToken = getOAuthToken();

  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          'Missing OAuth access token. YouTube Analytics API (watch time, revenue, traffic sources, demographics) requires OAuth. Set YOUTUBE_ACCESS_TOKEN (or YOUTUBE_OAUTH_ACCESS_TOKEN).',
      },
      { status: 500 }
    );
  }

  // last 7 full days, excluding today
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const period_start = toDateString(start);
  const period_end = toDateString(end);

  try {
    const channel = await getChannel({ apiKey, accessToken });
    const channelId = channel.id;
    const channelTitle = channel.snippet?.title || '';

    // Overview totals
    const overviewReport = await queryAnalyticsReport({
      accessToken,
      channelId,
      startDate: period_start,
      endDate: period_end,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,estimatedRevenue',
    });

    const overview = reportToObjectRow(overviewReport);
    const views = safeNumber(overview.views);
    const minutesWatched = safeNumber(overview.estimatedMinutesWatched);
    const subscribersGained = safeNumber(overview.subscribersGained);
    const estimatedRevenue = safeNumber(overview.estimatedRevenue);

    // Top videos
    const topVideosReport = await queryAnalyticsReport({
      accessToken,
      channelId,
      startDate: period_start,
      endDate: period_end,
      metrics:
        'views,estimatedMinutesWatched,subscribersGained,estimatedRevenue,impressions,impressionsCtr',
      dimensions: 'video',
      sort: '-views',
      maxResults: 15,
    });

    const topVideoRows = (topVideosReport.rows || []) as any[][];
    const videoIds = topVideoRows.map(r => String(r[0])).filter(Boolean);
    const snippets = await fetchVideoSnippets({ apiKey, accessToken, ids: videoIds.slice(0, 50) });

    const top_videos: TopVideoRow[] = topVideoRows.map((r) => {
      const videoId = String(r[0] || '');
      const s = snippets.get(videoId);
      const vViews = safeNumber(r[1]);
      const vMinutes = safeNumber(r[2]);
      const vSubs = safeNumber(r[3]);
      const vRevenue = safeNumber(r[4]);
      const vImpressions = safeNumber(r[5]);
      const vCtr = safeNumber(r[6]);
      return {
        videoId,
        title: s?.title || 'Untitled',
        publishedAt: s?.publishedAt || null,
        views: vViews,
        watchTimeHours: vMinutes / 60,
        subscribers: vSubs,
        revenue: vRevenue,
        impressions: vImpressions,
        ctr: vCtr, // already fraction (0-1)
      };
    });

    // Traffic sources
    const trafficReport = await queryAnalyticsReport({
      accessToken,
      channelId,
      startDate: period_start,
      endDate: period_end,
      metrics: 'views',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
      maxResults: 50,
    });
    const traffic_sources = normalizeTrafficSources(trafficReport.rows);

    // Demographics
    const demographicsReport = await queryAnalyticsReport({
      accessToken,
      channelId,
      startDate: period_start,
      endDate: period_end,
      metrics: 'viewerPercentage',
      dimensions: 'ageGroup,gender',
      sort: 'ageGroup',
      maxResults: 500,
    });
    const demographics = normalizeDemographics(demographicsReport.rows);

    // Realtime-ish: subscribers from channel stats + views last 48 hours (last 2 full days)
    const realtime_subscribers = safeNumber(channel.statistics?.subscriberCount);
    const last2End = new Date(now);
    last2End.setDate(last2End.getDate() - 1);
    const last2Start = new Date(last2End);
    last2Start.setDate(last2Start.getDate() - 1);

    const views48hReport = await queryAnalyticsReport({
      accessToken,
      channelId,
      startDate: toDateString(last2Start),
      endDate: toDateString(last2End),
      metrics: 'views',
      dimensions: 'day',
      maxResults: 10,
    });
    const realtime_views_48h = (views48hReport.rows || []).reduce((sum, r) => sum + safeNumber(r[1]), 0);

    const db = getDb();
    const fetched_at = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO youtube_analytics (
        fetched_at,
        period_start,
        period_end,
        channel_id,
        channel_title,
        subscribers,
        views,
        watch_time_hours,
        estimated_revenue,
        top_videos,
        traffic_sources,
        demographics,
        realtime_subscribers,
        realtime_views_48h
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fetched_at,
      period_start,
      period_end,
      channelId,
      channelTitle,
      Math.round(subscribersGained),
      Math.round(views),
      minutesWatched / 60,
      estimatedRevenue,
      JSON.stringify(top_videos),
      JSON.stringify(traffic_sources),
      JSON.stringify(demographics),
      Math.round(realtime_subscribers),
      Math.round(realtime_views_48h)
    );

    const id = result.lastInsertRowid as number;
    const row = db.prepare('SELECT * FROM youtube_analytics WHERE id = ?').get(id) as AnalyticsRow;

    return NextResponse.json({
      data: {
        ...row,
        top_videos: JSON.parse(row.top_videos || '[]'),
        traffic_sources: JSON.parse(row.traffic_sources || '{}'),
        demographics: JSON.parse(row.demographics || '{}'),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
