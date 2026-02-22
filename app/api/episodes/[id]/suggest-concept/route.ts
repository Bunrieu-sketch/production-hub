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
  const context = [hook, notes].filter(Boolean).join('. ').trim();
  const location = seriesTitle || 'an exotic location';

  // Use Google's recommended photorealistic narrative style
  // Describe the scene like a photographer — camera angle, lens, lighting, mood, textures
  // Focus on the SUBJECT and ENVIRONMENT, not the host
  // Any text: 1-3 words max, adds intrigue beyond title, never duplicates title words
  const subject = context
    ? `the most extreme, exaggerated version of "${title}" — ${context}`
    : `the most extreme, exaggerated version of "${title}"`;

  return `A photorealistic wide-angle shot depicting ${subject}, set in ${location}. The scene is illuminated by dramatic, high-contrast lighting that creates an intense, awe-inspiring atmosphere. Captured with a 16mm wide-angle lens at a low angle to make the subject feel massive and imposing. Ultra-sharp focus on key details and textures. Rich, saturated colors. 16:9 landscape format, YouTube thumbnail composition with clear negative space on one side for bold text overlay. If any text appears in the image, it must be maximum 1-3 words that add a surprising fact or scale comparison — never repeating any words from "${title}".`;
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
