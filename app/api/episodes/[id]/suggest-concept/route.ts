import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const EXPRESSIONS = ['shocked', 'amazed', 'disgusted', 'thrilled', 'terrified', 'mind-blown'];

function pickExpression(seed: number) {
  return EXPRESSIONS[seed % EXPRESSIONS.length];
}

function buildConcept({
  title,
  hook,
  notes,
  seriesTitle,
}: {
  title: string;
  hook?: string | null;
  notes?: string | null;
  seriesTitle?: string | null;
}) {
  const extras = [hook, notes].filter(Boolean).join(' ').trim();
  const extreme = extras
    ? `the most extreme exaggerated version of "${title}" (${extras})`
    : `the most extreme exaggerated version of "${title}"`;
  const location = seriesTitle ? `${seriesTitle} backdrop` : 'vivid location background';
  const expression = pickExpression(title.length);

  return `YouTube thumbnail for a travel/food video: Andrew with ${expression} face, ${extreme}, ${location}, dramatic lighting, 16:9 composition with space for bold text overlay`;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const episode = db.prepare(`
    SELECT e.title, e.hook, e.notes, s.title as series_title
    FROM episodes e
    LEFT JOIN series s ON e.series_id = s.id
    WHERE e.id = ?
  `).get(id) as { title?: string; hook?: string | null; notes?: string | null; series_title?: string | null } | undefined;

  if (!episode?.title) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const concept = buildConcept({
    title: episode.title,
    hook: episode.hook,
    notes: episode.notes,
    seriesTitle: episode.series_title,
  });

  return NextResponse.json({ concept });
}
