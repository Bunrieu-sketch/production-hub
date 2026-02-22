import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { title, country, episode_count = 5 } = await req.json();

  if (!title || !country) {
    return NextResponse.json({ error: 'Title and country are required' }, { status: 400 });
  }

  const db = getDb();
  const numEpisodes = Math.min(Math.max(parseInt(episode_count) || 5, 1), 12);

  const create = db.transaction(() => {
    // Create series in ideation status
    const result = db.prepare(
      `INSERT INTO series (title, location, country, status, notes)
       VALUES (?, ?, ?, 'ideation', ?)`
    ).run(title, country, country, `Auto-created with ${numEpisodes} placeholder episodes.`);

    const seriesId = result.lastInsertRowid as number;

    // Create 4 phase milestones (no dates yet — TBD during pre-production)
    const insertMilestone = db.prepare(
      'INSERT INTO milestones (series_id, week_number, title) VALUES (?, ?, ?)'
    );
    insertMilestone.run(seriesId, 1, 'Pre-Production');
    insertMilestone.run(seriesId, 2, 'Shooting');
    insertMilestone.run(seriesId, 3, 'Editing');
    insertMilestone.run(seriesId, 4, 'Publish');

    // Create placeholder episodes
    const insertEpisode = db.prepare(
      `INSERT INTO episodes (series_id, title, stage, sort_order, episode_type)
       VALUES (?, ?, 'idea', ?, 'cornerstone')`
    );
    for (let i = 1; i <= numEpisodes; i++) {
      insertEpisode.run(seriesId, `Episode ${i}`, i);
    }

    return seriesId;
  });

  const id = create();
  return NextResponse.json({ id });
}
