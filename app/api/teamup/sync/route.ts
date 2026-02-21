import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const TEAMUP_API_BASE = 'https://api.teamup.com';

// Map TeamUp sub-calendar names to Mission Control categories
const CATEGORY_MAP: Record<string, string> = {
  'shoot': 'shoot',
  'shooting': 'shoot',
  'pre-production': 'preprod',
  'preproduction': 'preprod',
  'pre-prod': 'preprod',
  'post-production': 'post',
  'postproduction': 'post',
  'post-prod': 'post',
  'editing': 'post',
  'edit': 'post',
  'publish': 'publish',
  'publishing': 'publish',
  'upload': 'publish',
  'premiere': 'publish',
  'sponsor': 'sponsor',
  'sponsors': 'sponsor',
  'milestone': 'milestone',
  'milestones': 'milestone',
  'deadline': 'milestone',
  'travel': 'travel',
  'flights': 'travel',
  'hotel': 'travel',
};

// Map categories to colors
const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  preprod: { bg: '#58a6ff', border: '#58a6ff' },
  shoot: { bg: '#a371f7', border: '#a371f7' },
  post: { bg: '#d29922', border: '#d29922' },
  publish: { bg: '#3fb950', border: '#3fb950' },
  sponsor: { bg: '#58a6ff', border: '#58a6ff' },
  milestone: { bg: '#f85149', border: '#f85149' },
  travel: { bg: '#f0883e', border: '#f0883e' },
  default: { bg: '#8b949e', border: '#8b949e' },
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.TEAMUP_API_KEY;
  const calendarId = process.env.TEAMUP_CALENDAR_ID;

  if (!apiKey || !calendarId) {
    return NextResponse.json(
      { error: 'TeamUp API key or calendar ID not configured. Check .env.local' },
      { status: 500 }
    );
  }

  const db = getDb();

  try {
    // Get date range for sync (1 year back, 2 years forward)
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const endDate = new Date(now.getFullYear() + 2, now.getMonth() + 1, 0);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Fetch events from TeamUp
    const url = `${TEAMUP_API_BASE}/${calendarId}/events?startDate=${startStr}&endDate=${endStr}`;
    
    const response = await fetch(url, {
      headers: {
        'Teamup-Token': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `TeamUp API error: ${response.status} - ${error}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const events = data.events || [];

    // Get sub-calendar info for category mapping
    const calendarsUrl = `${TEAMUP_API_BASE}/${calendarId}/subcalendars`;
    const calendarsResponse = await fetch(calendarsUrl, {
      headers: {
        'Teamup-Token': apiKey,
        'Accept': 'application/json',
      },
    });

    const calendarsData = await calendarsResponse.json();
    const calendars = calendarsData.subcalendars || [];
    const calendarMap = new Map<number, string>(calendars.map((c: { id: number; name: string }) => [c.id, c.name]));

    // Ensure synced_events table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS synced_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teamup_event_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        all_day INTEGER DEFAULT 1,
        location TEXT DEFAULT '',
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'default',
        calendar_name TEXT DEFAULT '',
        calendar_id INTEGER,
        synced_at TEXT DEFAULT (datetime('now')),
        raw_data TEXT DEFAULT ''
      )
    `);

    // Insert or update events
    const insert = db.prepare(`
      INSERT INTO synced_events 
        (teamup_event_id, title, start_date, end_date, all_day, location, description, category, calendar_name, calendar_id, raw_data)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(teamup_event_id) DO UPDATE SET
        title = excluded.title,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        all_day = excluded.all_day,
        location = excluded.location,
        description = excluded.description,
        category = excluded.category,
        calendar_name = excluded.calendar_name,
        calendar_id = excluded.calendar_id,
        synced_at = datetime('now'),
        raw_data = excluded.raw_data
    `);

    const insertMany = db.transaction((items: Array<{
      teamup_event_id: string;
      title: string;
      start_date: string;
      end_date: string | null;
      all_day: number;
      location: string;
      description: string;
      category: string;
      calendar_name: string;
      calendar_id: number;
      raw_data: string;
    }>) => {
      for (const item of items) {
        insert.run(
          item.teamup_event_id,
          item.title,
          item.start_date,
          item.end_date,
          item.all_day,
          item.location,
          item.description,
          item.category,
          item.calendar_name,
          item.calendar_id,
          item.raw_data
        );
      }
    });

    const toInsert = events
      .filter((e: { delete_dt?: string }) => !e.delete_dt) // Skip deleted events
      .map((e: {
        id: string;
        title: string;
        start_dt: string;
        end_dt: string;
        all_day?: boolean;
        location?: string;
        notes?: string;
        subcalendar_id?: number;
      }) => {
        const calendarName = calendarMap.get(e.subcalendar_id || 0) || '';
        const normalizedName = calendarName.toLowerCase().trim();
        const category = CATEGORY_MAP[normalizedName] || 'default';

        return {
          teamup_event_id: String(e.id),
          title: e.title,
          start_date: e.start_dt.split('T')[0],
          end_date: e.end_dt ? e.end_dt.split('T')[0] : null,
          all_day: e.all_day ? 1 : 0,
          location: e.location || '',
          description: e.notes || '',
          category,
          calendar_name: calendarName,
          calendar_id: e.subcalendar_id || 0,
          raw_data: JSON.stringify(e),
        };
      });

    insertMany(toInsert);

    // Return summary
    return NextResponse.json({
      success: true,
      synced: toInsert.length,
      startDate: startStr,
      endDate: endStr,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Sync failed: ${message}` },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve synced events
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndExclusive = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0];

  const startDate = startParam || defaultStart;
  const endDate = endParam || defaultEndExclusive;

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS synced_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamup_event_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      all_day INTEGER DEFAULT 1,
      location TEXT DEFAULT '',
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'default',
      calendar_name TEXT DEFAULT '',
      calendar_id INTEGER,
      synced_at TEXT DEFAULT (datetime('now')),
      raw_data TEXT DEFAULT ''
    )
  `);

  const events = db.prepare(`
    SELECT 
      teamup_event_id as id,
      title,
      start_date as start,
      end_date as end,
      all_day as allDay,
      location,
      description,
      category,
      calendar_name as calendarName,
      synced_at as syncedAt
    FROM synced_events
    WHERE start_date <= ? AND (end_date >= ? OR end_date IS NULL)
    ORDER BY start_date
  `).all(endDate, startDate) as Array<{
    id: string;
    title: string;
    start: string;
    end: string | null;
    allDay: number;
    location: string;
    description: string;
    category: string;
    calendarName: string;
    syncedAt: string;
  }>;

  const formattedEvents = events.map(e => {
    const colors = CATEGORY_COLORS[e.category] || CATEGORY_COLORS.default;
    return {
      id: `teamup-${e.id}`,
      title: e.calendarName ? `[${e.calendarName}] ${e.title}` : e.title,
      start: e.start,
      end: e.end ? e.end : undefined,
      allDay: e.allDay === 1,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      extendedProps: {
        source: 'teamup',
        location: e.location,
        description: e.description,
        category: e.category,
        calendarName: e.calendarName,
        syncedAt: e.syncedAt,
      },
    };
  });

  return NextResponse.json(formattedEvents);
}
