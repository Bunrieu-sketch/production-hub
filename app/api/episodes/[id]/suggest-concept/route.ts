import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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
  const context = [hook, notes, seriesTitle].filter(Boolean).join('. ').trim();

  // Focus on the SCENE — the most dramatic, exaggerated visual of the subject matter
  // Do NOT focus on describing the host — just the environment, subject, and drama
  // Text overlay: 1-3 words MAX that add intrigue BEYOND the title (never duplicate the title)
  const scenePrompt = context
    ? `The most extreme, dramatic, cinematic depiction of: "${title}" (context: ${context}).`
    : `The most extreme, dramatic, cinematic depiction of: "${title}".`;

  return `YouTube thumbnail scene: ${scenePrompt} Focus on the subject matter and environment — make it as visually shocking and attention-grabbing as possible. Dramatic lighting, vivid colors, 16:9 composition. If text overlay is needed, use only 1-3 words that ADD INTRIGUE beyond the title (e.g. an arrow pointing to something with a surprising fact, a scale comparison, or a provocative label). Never repeat words from the title "${title}".`;
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
