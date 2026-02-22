import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  const { title, country, episode_count = 5, start_date } = await req.json();

  if (!title || !country) {
    return NextResponse.json({ error: 'Title and country are required' }, { status: 400 });
  }

  const db = getDb();
  const numEpisodes = Math.min(Math.max(parseInt(episode_count) || 5, 1), 6);

  // Calculate phase dates if start_date provided
  // Rules: 6wk pre-prod, 2wk shooting, 1wk per episode for editing
  let preProdDate: string | null = null;
  let shootingDate: string | null = null;
  let editingDate: string | null = null;
  let publishDate: string | null = null;
  let shootStart: string | null = null;
  let shootEnd: string | null = null;

  if (start_date) {
    preProdDate = start_date;
    shootingDate = addDays(start_date, 42); // +6 weeks
    shootStart = shootingDate;
    shootEnd = addDays(shootingDate, 14); // +2 weeks
    editingDate = shootEnd;
    publishDate = addDays(shootEnd, numEpisodes * 7); // 1 week per episode
  }

  const create = db.transaction(() => {
    // Create series
    const result = db.prepare(
      `INSERT INTO series (title, location, country, status, target_shoot_start, target_shoot_end, target_publish_date, notes)
       VALUES (?, ?, ?, 'ideation', ?, ?, ?, ?)`
    ).run(
      title, country, country,
      shootStart, shootEnd, publishDate,
      `${numEpisodes} episodes. Auto-created.`
    );

    const seriesId = result.lastInsertRowid as number;

    // Create 4 phase milestones
    const insertMilestone = db.prepare(
      'INSERT INTO milestones (series_id, week_number, title, due_date) VALUES (?, ?, ?, ?)'
    );
    insertMilestone.run(seriesId, 1, 'Pre-Production', preProdDate);
    insertMilestone.run(seriesId, 2, 'Shooting', shootingDate);
    insertMilestone.run(seriesId, 3, 'Editing', editingDate);
    insertMilestone.run(seriesId, 4, 'Publish', publishDate);

    // Create placeholder episodes named after the series
    const insertEpisode = db.prepare(
      `INSERT INTO episodes (series_id, title, stage, sort_order, episode_type)
       VALUES (?, ?, 'idea', ?, 'cornerstone')`
    );
    for (let i = 1; i <= numEpisodes; i++) {
      insertEpisode.run(seriesId, `${title} — Episode ${i}`, i);
    }

    return seriesId;
  });

  const id = create();
  return NextResponse.json({ id });
}
