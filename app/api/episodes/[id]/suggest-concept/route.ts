import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ANGLES = [
  'Captured with a 16mm wide-angle lens at a dramatic low angle, making the subject feel massive and imposing.',
  'Shot from a bird\'s-eye overhead perspective, revealing the full scale of the scene below.',
  'Captured at eye level with a 35mm lens, putting the viewer right in the middle of the action.',
  'Shot from behind the subject looking forward into the scene, creating a sense of discovery and adventure.',
  'Captured with a fisheye lens creating an exaggerated, immersive perspective that warps the environment.',
  'Shot from a tilted Dutch angle with a 24mm lens, creating visual tension and unease.',
];

const LIGHTING = [
  'dramatic, high-contrast cinematic lighting with deep shadows and intense highlights',
  'golden hour backlighting that silhouettes the subject against a blazing sky',
  'moody, atmospheric lighting with rays breaking through haze or smoke',
  'harsh midday sun creating bold, saturated colors and sharp shadows',
  'neon-lit nighttime scene with vivid color splashes and reflections',
  'overcast, desaturated lighting that feels raw and documentary-style',
];

const MOODS = [
  'intense and awe-inspiring',
  'chaotic and overwhelming',
  'mysterious and foreboding',
  'raw and visceral',
  'electrifying and larger-than-life',
  'gritty and confrontational',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  const context = [hook, notes].filter(Boolean).join('. ').trim();
  const location = seriesTitle || 'an exotic location';

  const subject = context
    ? `the most extreme, exaggerated version of "${title}" — ${context}`
    : `the most extreme, exaggerated version of "${title}"`;

  const angle = pick(ANGLES);
  const lighting = pick(LIGHTING);
  const mood = pick(MOODS);

  return `A photorealistic shot depicting ${subject}, set in ${location}. The scene is illuminated by ${lighting}, creating a ${mood} atmosphere. ${angle} Ultra-sharp focus on key details and textures. Rich, saturated colors. Clear negative space on one side for text overlay. If any text appears, maximum 1-3 words adding a surprising fact or scale — never repeating words from "${title}". Landscape 16:9 format.`;
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
