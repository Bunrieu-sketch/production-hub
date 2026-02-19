import { getDb } from '../lib/db';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_HANDLE = '@Andrew_Fraser';

const DAY_MS = 86400000;

type YouTubeSearchItem = {
  id?: { videoId?: string };
};

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
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type SponsorRow = {
  id: number;
  brand_name: string;
};

type EpisodeRow = {
  id: number;
  title: string;
  publish_date: string | null;
  actual_publish_date: string | null;
  series_id: number | null;
};

function toDateString(value: string) {
  return value.split('T')[0];
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDurationSeconds(iso?: string) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function pickThumbnail(video: YouTubeVideo) {
  return (
    video.snippet?.thumbnails?.high?.url ||
    video.snippet?.thumbnails?.medium?.url ||
    video.snippet?.thumbnails?.default?.url ||
    ''
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function extractUrls(text: string) {
  return text.match(/https?:\/\/[^\s)]+/gi) || [];
}

function isTrackingUrl(raw: string) {
  try {
    const url = new URL(raw);
    const query = url.search.toLowerCase();
    return /utm_|ref=|aff=|affiliate|coupon|promo|code=/.test(query);
  } catch {
    return false;
  }
}

function hostnameBrand(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length < 2) return host;
    return parts[0];
  } catch {
    return '';
  }
}

function extractPatternCandidates(text: string) {
  const candidates: string[] = [];
  const patterns = [
    /sponsored by\s+([^\n\.]+)/gi,
    /thanks to\s+([^\n\.]+)/gi,
    /brought to you by\s+([^\n\.]+)/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      candidates.push(match[1].trim());
    }
  }

  const urlCandidates = extractUrls(text)
    .filter(isTrackingUrl)
    .map(hostnameBrand)
    .filter(Boolean);

  candidates.push(...urlCandidates);
  return unique(candidates.map(c => c.replace(/\s+/g, ' ').trim()));
}

function matchSponsors(text: string, sponsors: SponsorRow[], source: 'description' | 'pinned_comment') {
  const matches: Array<{ sponsor: SponsorRow; detectedText: string; sponsorSource: 'description' | 'pinned_comment' }> = [];
  const normalizedText = normalize(text);
  for (const sponsor of sponsors) {
    const brand = normalize(sponsor.brand_name);
    if (!brand || brand.length < 3) continue;
    if (normalizedText.includes(brand)) {
      const idx = normalizedText.indexOf(brand);
      const snippet = text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + brand.length + 40));
      matches.push({ sponsor, detectedText: snippet.trim(), sponsorSource: source });
    }
  }

  const candidates = extractPatternCandidates(text);
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    if (!normalizedCandidate) continue;
    const sponsor = sponsors.find(s => {
      const brand = normalize(s.brand_name);
      if (!brand) return false;
      return brand.includes(normalizedCandidate) || normalizedCandidate.includes(brand);
    });
    if (sponsor) {
      matches.push({ sponsor, detectedText: candidate, sponsorSource: source });
    } else {
      console.log(`[sponsor] Unknown candidate from ${source}: ${candidate}`);
    }
  }

  const uniqueMatches = new Map<number, { sponsor: SponsorRow; detectedText: string; sponsorSource: 'description' | 'pinned_comment' }>();
  for (const match of matches) {
    if (!uniqueMatches.has(match.sponsor.id)) {
      uniqueMatches.set(match.sponsor.id, match);
    }
  }

  return Array.from(uniqueMatches.values());
}

function extractCountry(title: string) {
  const countries = [
    'China',
    'Indonesia',
    'Bangladesh',
    'Hong Kong',
    'Japan',
    'India',
    'Vietnam',
    'Thailand',
    'Philippines',
    'Pakistan',
    'Malaysia',
    'Singapore',
    'Taiwan',
    'Cambodia',
    'Laos',
    'Nepal',
    'Sri Lanka',
    'Myanmar',
  ];
  for (const country of countries) {
    const pattern = new RegExp(`\\b${country.replace(' ', '\\s+')}\\b`, 'i');
    if (pattern.test(title)) return country;
  }
  return '';
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function fetchChannelId(apiKey: string, handle: string) {
  const url = new URL(`${API_BASE}/channels`);
  url.search = new URLSearchParams({
    part: 'id',
    forHandle: handle,
    key: apiKey,
  }).toString();
  const data = await fetchJson(url.toString());
  const id = data.items?.[0]?.id;
  if (!id) throw new Error(`Channel not found for handle ${handle}`);
  return id as string;
}

async function fetchVideoIds(apiKey: string, channelId: string) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${API_BASE}/search`);
    url.search = new URLSearchParams({
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'date',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
      key: apiKey,
    }).toString();
    const data = await fetchJson(url.toString());
    const items = (data.items || []) as YouTubeSearchItem[];
    ids.push(...items.map(item => item.id?.videoId).filter(Boolean) as string[]);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return unique(ids);
}

async function fetchVideoDetails(apiKey: string, ids: string[]) {
  if (!ids.length) return [] as YouTubeVideo[];
  const url = new URL(`${API_BASE}/videos`);
  url.search = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    id: ids.join(','),
    key: apiKey,
  }).toString();
  const data = await fetchJson(url.toString());
  return (data.items || []) as YouTubeVideo[];
}

async function fetchPinnedComment(apiKey: string, videoId: string, channelId: string) {
  const url = new URL(`${API_BASE}/commentThreads`);
  url.search = new URLSearchParams({
    part: 'snippet',
    videoId,
    order: 'relevance',
    maxResults: '5',
    key: apiKey,
  }).toString();
  const data = await fetchJson(url.toString());
  const items = data.items || [];
  for (const item of items) {
    const snippet = item?.snippet?.topLevelComment?.snippet;
    const authorId = snippet?.authorChannelId?.value;
    if (authorId && authorId === channelId) {
      return snippet?.textOriginal || '';
    }
  }
  return '';
}

function buildSeriesName(base: string, existing: Set<string>) {
  let name = `${base} Series`;
  if (!existing.has(name)) {
    existing.add(name);
    return name;
  }
  let counter = 2;
  while (existing.has(`${name} ${counter}`)) counter += 1;
  const next = `${name} ${counter}`;
  existing.add(next);
  return next;
}

function daysAgo(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

function phaseStatus(endDate: string) {
  const end = parseDate(endDate);
  if (!end) return 'planned';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end.getTime() < today.getTime() ? 'done' : 'planned';
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY');

  const db = getDb();
  const channelId = await fetchChannelId(apiKey, CHANNEL_HANDLE);
  console.log(`Resolved channel ${CHANNEL_HANDLE} → ${channelId}`);

  const videoIds = await fetchVideoIds(apiKey, channelId);
  console.log(`Fetched ${videoIds.length} video ids`);

  const sponsors = db.prepare('SELECT id, brand_name FROM sponsors').all() as SponsorRow[];

  const nowIso = new Date().toISOString();
  const upserted: string[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const videos = await fetchVideoDetails(apiKey, batch);

    for (const video of videos) {
      const publishDate = parseDate(video.snippet?.publishedAt);
      if (!publishDate) continue;

      const title = video.snippet?.title || 'Untitled';
      const description = video.snippet?.description || '';
      const durationSeconds = parseDurationSeconds(video.contentDetails?.duration);
      const viewCount = parseInt(video.statistics?.viewCount || '0', 10) || 0;
      const likeCount = parseInt(video.statistics?.likeCount || '0', 10) || 0;
      const commentCount = parseInt(video.statistics?.commentCount || '0', 10) || 0;
      const thumbnailUrl = pickThumbnail(video);
      const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;

      const existing = db.prepare('SELECT id FROM episodes WHERE youtube_video_id = ?').get(video.id) as { id: number } | undefined;

      if (existing) {
        db.prepare(`
          UPDATE episodes
          SET title = ?,
              description = ?,
              publish_date = ?,
              actual_publish_date = COALESCE(actual_publish_date, ?),
              duration_seconds = ?,
              youtube_url = ?,
              view_count = ?,
              like_count = ?,
              comment_count = ?,
              thumbnail_url = ?,
              scraped_at = ?,
              view_count_updated_at = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          title,
          description,
          toDateString(publishDate.toISOString()),
          toDateString(publishDate.toISOString()),
          durationSeconds,
          youtubeUrl,
          viewCount,
          likeCount,
          commentCount,
          thumbnailUrl,
          nowIso,
          nowIso,
          nowIso,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO episodes (
            title, stage, publish_date, actual_publish_date, youtube_video_id, youtube_url,
            view_count, like_count, comment_count, description, duration_seconds,
            thumbnail_url, scraped_at, view_count_updated_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          title,
          'published',
          toDateString(publishDate.toISOString()),
          toDateString(publishDate.toISOString()),
          video.id,
          youtubeUrl,
          viewCount,
          likeCount,
          commentCount,
          description,
          durationSeconds,
          thumbnailUrl,
          nowIso,
          nowIso,
          nowIso,
          nowIso
        );
      }

      upserted.push(video.id);

      if (description && sponsors.length) {
        const matches = matchSponsors(description, sponsors, 'description');
        for (const match of matches) {
          db.prepare(`
            UPDATE sponsors
            SET episode_id = COALESCE(episode_id, (SELECT id FROM episodes WHERE youtube_video_id = ?)),
                youtube_video_id = COALESCE(youtube_video_id, ?),
                youtube_video_title = COALESCE(youtube_video_title, ?),
                sponsor_source = ?,
                detected_text = ?,
                updated_at = ?
            WHERE id = ?
          `).run(video.id, video.id, title, match.sponsorSource, match.detectedText, nowIso, match.sponsor.id);
        }
      }

      if (sponsors.length) {
        const pinnedComment = await fetchPinnedComment(apiKey, video.id, channelId);
        if (pinnedComment) {
          const matches = matchSponsors(pinnedComment, sponsors, 'pinned_comment');
          for (const match of matches) {
            db.prepare(`
              UPDATE sponsors
              SET episode_id = COALESCE(episode_id, (SELECT id FROM episodes WHERE youtube_video_id = ?)),
                  youtube_video_id = COALESCE(youtube_video_id, ?),
                  youtube_video_title = COALESCE(youtube_video_title, ?),
                  sponsor_source = ?,
                  detected_text = ?,
                  updated_at = ?
              WHERE id = ?
            `).run(video.id, video.id, title, match.sponsorSource, match.detectedText, nowIso, match.sponsor.id);
          }
        }
      }
    }
  }

  console.log(`Upserted ${upserted.length} episodes`);

  const episodesForSeries = db.prepare(`
    SELECT id, title, publish_date, actual_publish_date, series_id
    FROM episodes
    WHERE publish_date IS NOT NULL
      AND (series_id IS NULL OR series_id = 0)
    ORDER BY publish_date ASC
  `).all() as EpisodeRow[];

  const seriesGroups: Array<{ country: string; episodes: EpisodeRow[] }> = [];
  let current: { country: string; episodes: EpisodeRow[] } | null = null;

  for (const ep of episodesForSeries) {
    const country = extractCountry(ep.title);
    if (!country) continue;
    const pubDate = parseDate(ep.publish_date || ep.actual_publish_date);
    if (!pubDate) continue;

    if (!current || current.country !== country) {
      current = { country, episodes: [ep] };
      seriesGroups.push(current);
      continue;
    }

    const lastEp = current.episodes[current.episodes.length - 1];
    const lastDate = parseDate(lastEp.publish_date || lastEp.actual_publish_date);
    if (!lastDate) continue;
    const diffDays = Math.abs((pubDate.getTime() - lastDate.getTime()) / DAY_MS);
    if (diffDays <= 28) {
      current.episodes.push(ep);
    } else {
      current = { country, episodes: [ep] };
      seriesGroups.push(current);
    }
  }

  const seriesTitleSet = new Set(
    (db.prepare('SELECT title FROM series').all() as Array<{ title: string }>).map(r => r.title)
  );

  const seriesShootWindows = new Map<number, { start: string; end: string }>();

  for (const group of seriesGroups) {
    if (group.episodes.length < 3) continue;

    const chunks: EpisodeRow[][] = [];
    if (group.episodes.length > 5) {
      for (let i = 0; i < group.episodes.length; i += 5) {
        chunks.push(group.episodes.slice(i, i + 5));
      }
    } else {
      chunks.push(group.episodes);
    }

    for (const chunk of chunks) {
      if (chunk.length < 3) continue;
      const firstDate = parseDate(chunk[0].publish_date || chunk[0].actual_publish_date);
      const lastDate = parseDate(chunk[chunk.length - 1].publish_date || chunk[chunk.length - 1].actual_publish_date);
      if (!firstDate || !lastDate) continue;

      const shootStart = daysAgo(firstDate, 42);
      const shootEnd = daysAgo(firstDate, 28);

      const seriesTitle = buildSeriesName(group.country, seriesTitleSet);
      const result = db.prepare(`
        INSERT INTO series (title, location, country, status, target_shoot_start, target_shoot_end, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        seriesTitle,
        group.country,
        group.country,
        'published',
        toDateString(shootStart.toISOString()),
        toDateString(shootEnd.toISOString()),
        'source: inferred',
        nowIso,
        nowIso
      );

      const seriesId = result.lastInsertRowid as number;
      seriesShootWindows.set(seriesId, {
        start: toDateString(shootStart.toISOString()),
        end: toDateString(shootEnd.toISOString()),
      });

      chunk.forEach((ep, index) => {
        db.prepare('UPDATE episodes SET series_id = ?, sort_order = ? WHERE id = ?')
          .run(seriesId, index + 1, ep.id);
      });
    }
  }

  const allEpisodes = db.prepare(`
    SELECT id, title, publish_date, actual_publish_date, series_id
    FROM episodes
    WHERE publish_date IS NOT NULL OR actual_publish_date IS NOT NULL
  `).all() as EpisodeRow[];

  const seriesEpisodeCounts = db.prepare(`
    SELECT series_id as id, COUNT(*) as count
    FROM episodes
    WHERE series_id IS NOT NULL
    GROUP BY series_id
  `).all() as Array<{ id: number; count: number }>;
  const seriesCountMap = new Map(seriesEpisodeCounts.map(row => [row.id, row.count]));

  const insertPhase = db.prepare(`
    INSERT INTO episode_phases (episode_id, phase, start_date, end_date, status, confidence, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(episode_id, phase) DO UPDATE SET
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      status = excluded.status,
      confidence = excluded.confidence,
      source = excluded.source
  `);

  const phaseTxn = db.transaction(() => {
    for (const ep of allEpisodes) {
      const publishDate = parseDate(ep.publish_date || ep.actual_publish_date);
      if (!publishDate) continue;
      const publishStr = toDateString(publishDate.toISOString());
      const postStart = daysAgo(publishDate, 14);
      const postEnd = daysAgo(publishDate, 1);

      let shootStartStr = '';
      let shootEndStr = '';
      const seriesId = ep.series_id ?? null;
      if (seriesId && seriesCountMap.get(seriesId) && (seriesCountMap.get(seriesId) || 0) > 1) {
        const window = seriesShootWindows.get(seriesId);
        if (window) {
          shootStartStr = window.start;
          shootEndStr = window.end;
        }
      }
      if (!shootStartStr || !shootEndStr) {
        const shootStart = daysAgo(publishDate, 42);
        const shootEnd = daysAgo(publishDate, 35);
        shootStartStr = toDateString(shootStart.toISOString());
        shootEndStr = toDateString(shootEnd.toISOString());
      }

      const preprodStart = daysAgo(new Date(shootStartStr), 14);
      const preprodEnd = daysAgo(new Date(shootStartStr), 1);

      insertPhase.run(ep.id, 'publish', publishStr, publishStr, phaseStatus(publishStr), 0.6, 'inferred');
      insertPhase.run(ep.id, 'post', toDateString(postStart.toISOString()), toDateString(postEnd.toISOString()), phaseStatus(toDateString(postEnd.toISOString())), 0.6, 'inferred');
      insertPhase.run(ep.id, 'shoot', shootStartStr, shootEndStr, phaseStatus(shootEndStr), 0.6, 'inferred');
      insertPhase.run(ep.id, 'preprod', toDateString(preprodStart.toISOString()), toDateString(preprodEnd.toISOString()), phaseStatus(toDateString(preprodEnd.toISOString())), 0.6, 'inferred');
    }
  });
  phaseTxn();

  console.log('Episode phases inferred');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
