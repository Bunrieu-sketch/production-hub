import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SUFFIX_RULES = `\n\nTechnical rules for the image prompt (append these exactly):\n- Photorealistic photography style with rich, saturated colors and ultra-sharp focus\n- If any text appears in the image, maximum 1-3 words that add intrigue — never repeat words from the episode title\n- Clear negative space on one side for text overlay\n- Landscape 16:9 format`;

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

  const context = [
    episode.hook && `Hook: ${episode.hook}`,
    episode.notes && `Notes: ${episode.notes}`,
    episode.series_title && `Series: ${episode.series_title}`,
  ].filter(Boolean).join('\n');

  // Use Sonnet to creatively generate a concept
  const systemPrompt = `You are a YouTube thumbnail concept artist for a travel/food channel. The host explores extreme, otherworldly food and culture content.

Your job: write ONE vivid, creative image generation prompt for a YouTube thumbnail. Think about what would make someone STOP scrolling.

Rules:
- Focus on the SCENE — the subject matter, environment, drama. Not the host.
- Exaggerate HARD. Make it the most extreme, dramatic version of the concept.
- Think like a cinematographer — describe camera angle, lighting, mood, textures.
- Be narrative and descriptive, not a keyword list.
- Each time you're asked, come up with a DIFFERENT creative angle/interpretation.
- Output ONLY the image prompt, nothing else. No preamble, no explanation.`;

  const userPrompt = `Episode title: "${episode.title}"
${context ? context + '\n' : ''}
Generate a vivid, creative thumbnail concept that exaggerates and adds intrigue to this episode. Make it attention-grabbing and visually shocking.`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No ANTHROPIC_API_KEY');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 300,
        temperature: 1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await res.json();
    const concept = data?.content?.[0]?.text?.trim();

    if (concept) {
      return NextResponse.json({ concept: concept + SUFFIX_RULES });
    }
  } catch (e) {
    console.error('Sonnet concept generation failed:', e);
  }

  // Fallback: simple template if API fails
  return NextResponse.json({
    concept: `A photorealistic, dramatic depiction of the most extreme version of "${episode.title}", set in ${episode.series_title || 'an exotic location'}. Vivid, saturated colors, dramatic lighting, ultra-sharp details.${SUFFIX_RULES}`,
  });
}
