import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CHANNEL_ID = 'UCfVqXHFHPtdOtzNaTAuglag';
const LOOKBACK_DAYS = 14;
const MATCH_WINDOW_DAYS = 5;
const DAY_MS = 86400000;

type YouTubeVideo = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  statistics?: {
    viewCount?: string;
  };
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

function pickThumbnail(video: YouTubeVideo) {
  return (
    video.snippet?.thumbnails?.high?.url ||
    video.snippet?.thumbnails?.medium?.url ||
    video.snippet?.thumbnails?.default?.url ||
    ''
  );
}

async function fetchVideos(apiKey: string, ids: string[]) {
  if (!ids.length) return [];
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.search = new URLSearchParams({
    part: 'statistics,snippet,contentDetails',
    id: ids.join(','),
    key: apiKey,
  }).toString();

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube videos API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return (data.items || []) as YouTubeVideo[];
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing YOUTUBE_API_KEY' }, { status: 500 });
  }

  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const publishedAfter = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString();

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.search = new URLSearchParams({
    part: 'snippet',
    channelId: CHANNEL_ID,
    type: 'video',
    order: 'date',
    maxResults: '10',
    publishedAfter,
    key: apiKey,
  }).toString();

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    const text = await searchRes.text();
    return NextResponse.json({ error: `YouTube search API error: ${searchRes.status} ${text}` }, { status: 500 });
  }
  const searchData = await searchRes.json();
  const recentVideoIds = (searchData.items || [])
    .map((item: { id?: { videoId?: string } }) => item.id?.videoId)
    .filter((id: string | undefined): id is string => !!id);

  const recentVideos = await fetchVideos(apiKey, recentVideoIds);

  const createdEpisodes: Array<{ episodeId: number; videoId: string }> = [];
  const updatedEpisodes: Array<{ episodeId: number; videoId: string }> = [];
  const matchedSponsors: Array<{ sponsorId: number; brandName: string; videoId: string }> = [];

  for (const video of recentVideos) {
    if (!video?.id) continue;
    const publishDate = parseDate(video.snippet?.publishedAt);
    const viewCount = parseInt(video.statistics?.viewCount || '0', 10) || 0;
    const title = video.snippet?.title || 'Untitled';
    const description = video.snippet?.description || '';
    const thumbnailUrl = pickThumbnail(video);
    const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;

    const existing = db.prepare('SELECT id, title FROM episodes WHERE youtube_video_id = ?').get(video.id) as { id: number; title?: string } | undefined;
    let episodeId: number;

    if (existing) {
      episodeId = existing.id;
      const shouldUpdateTitle = !existing.title;
      db.prepare(`
        UPDATE episodes
        SET title = COALESCE(?, title),
            actual_publish_date = COALESCE(?, actual_publish_date),
            youtube_url = ?,
            view_count = ?,
            view_count_updated_at = ?,
            thumbnail_url = COALESCE(?, thumbnail_url),
            updated_at = ?
        WHERE id = ?
      `).run(
        shouldUpdateTitle ? title : null,
        publishDate ? toDateString(publishDate) : null,
        youtubeUrl,
        viewCount,
        nowIso,
        thumbnailUrl || null,
        nowIso,
        episodeId
      );
      updatedEpisodes.push({ episodeId, videoId: video.id });
    } else {
      const result = db.prepare(`
        INSERT INTO episodes (
          title, stage, actual_publish_date, youtube_video_id, youtube_url,
          view_count, view_count_updated_at, thumbnail_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title,
        'published',
        publishDate ? toDateString(publishDate) : null,
        video.id,
        youtubeUrl,
        viewCount,
        nowIso,
        thumbnailUrl,
        nowIso,
        nowIso
      );
      episodeId = result.lastInsertRowid as number;
      createdEpisodes.push({ episodeId, videoId: video.id });
    }

    if (!publishDate) continue;

    const minDate = new Date(publishDate.getTime() - MATCH_WINDOW_DAYS * DAY_MS);
    const maxDate = new Date(publishDate.getTime() + MATCH_WINDOW_DAYS * DAY_MS);
    const candidates = db.prepare(`
      SELECT id, brand_name, live_date
      FROM sponsors
      WHERE episode_id IS NULL
        AND live_date IS NOT NULL
        AND date(live_date) BETWEEN date(?) AND date(?)
    `).all(toDateString(minDate), toDateString(maxDate)) as Array<{ id: number; brand_name: string; live_date: string }>;

    if (!candidates.length) continue;

    const haystack = `${title}\n${description}`.toLowerCase();
    const withBrand = candidates.filter(c => haystack.includes(c.brand_name.toLowerCase()));
    const pool = withBrand.length ? withBrand : candidates;

    let best = pool[0];
    let bestDiff = Number.MAX_SAFE_INTEGER;
    for (const candidate of pool) {
      const liveDate = parseDate(candidate.live_date);
      if (!liveDate) continue;
      const diff = Math.abs(Math.round((publishDate.getTime() - liveDate.getTime()) / DAY_MS));
      if (diff < bestDiff) {
        best = candidate;
        bestDiff = diff;
      }
    }

    db.prepare(`
      UPDATE sponsors
      SET episode_id = ?, youtube_video_id = ?, youtube_video_title = ?, updated_at = ?
      WHERE id = ?
    `).run(
      episodeId,
      video.id,
      title,
      nowIso,
      best.id
    );
    matchedSponsors.push({ sponsorId: best.id, brandName: best.brand_name, videoId: video.id });
  }

  const episodesWithYouTube = db.prepare(`
    SELECT id, youtube_video_id
    FROM episodes
    WHERE youtube_video_id IS NOT NULL AND youtube_video_id != ''
  `).all() as Array<{ id: number; youtube_video_id: string }>;
  const uniqueIds = Array.from(new Set(episodesWithYouTube.map(ep => ep.youtube_video_id)));

  let viewUpdates = 0;
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50);
    const details = await fetchVideos(apiKey, batch);
    const detailMap = new Map(details.map(video => [video.id, video]));
    for (const episode of episodesWithYouTube) {
      if (!batch.includes(episode.youtube_video_id)) continue;
      const detail = detailMap.get(episode.youtube_video_id);
      if (!detail) continue;
      const viewCount = parseInt(detail.statistics?.viewCount || '0', 10) || 0;
      const thumbnailUrl = pickThumbnail(detail);
      db.prepare(`
        UPDATE episodes
        SET view_count = ?, view_count_updated_at = ?, thumbnail_url = COALESCE(?, thumbnail_url), updated_at = ?
        WHERE id = ?
      `).run(viewCount, nowIso, thumbnailUrl || null, nowIso, episode.id);
      viewUpdates += 1;
    }
  }

  const autoLocked: Array<{ sponsorId: number; brandName: string; views: number }> = [];
  const lockCandidates = db.prepare(`
    SELECT
      s.id as sponsor_id,
      s.brand_name,
      s.views_at_30_days,
      s.live_date,
      e.view_count,
      e.actual_publish_date,
      e.publish_date
    FROM sponsors s
    JOIN episodes e ON e.id = s.episode_id
    WHERE s.deal_type = 'cpm'
      AND (s.views_at_30_days IS NULL OR s.views_at_30_days = 0)
  `).all() as Array<{
    sponsor_id: number;
    brand_name: string;
    views_at_30_days: number | null;
    live_date: string | null;
    view_count: number;
    actual_publish_date: string | null;
    publish_date: string | null;
  }>;

  for (const candidate of lockCandidates) {
    const publishDate =
      parseDate(candidate.live_date) ||
      parseDate(candidate.actual_publish_date) ||
      parseDate(candidate.publish_date);
    if (!publishDate) continue;
    const daysSince = Math.floor((now.getTime() - publishDate.getTime()) / DAY_MS);
    if (daysSince < 30) continue;

    db.prepare(`
      UPDATE sponsors
      SET views_at_30_days = ?, updated_at = ?
      WHERE id = ?
    `).run(candidate.view_count || 0, nowIso, candidate.sponsor_id);
    autoLocked.push({
      sponsorId: candidate.sponsor_id,
      brandName: candidate.brand_name,
      views: candidate.view_count || 0,
    });
  }

  return NextResponse.json({
    fetchedRecentVideos: recentVideoIds.length,
    createdEpisodes,
    updatedEpisodes,
    matchedSponsors,
    viewUpdates,
    autoLocked,
  });
}
