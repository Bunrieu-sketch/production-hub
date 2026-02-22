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
  const systemPrompt = `You are a YouTube thumbnail designer for a travel/food channel with 500K+ subscribers. The host explores extreme, otherworldly food and culture.

Your job: write ONE image generation prompt for a YouTube thumbnail that would get a 10%+ CTR.

Think about what makes top YouTube thumbnails work:
- ONE clear focal point (a shocking food, dangerous animal, extreme situation)
- Exaggerated scale — make things look bigger, more intense, more extreme than reality
- Bright, saturated colors that pop on a phone screen
- Simple composition — not cluttered, one clear subject
- The "WOW factor" — what makes someone think "no way, I have to click"

Rules:
- Describe a SINGLE striking image, not a complex scene
- Keep it simple — one subject, one background, one mood
- Think photorealistic, like an actual photograph but more dramatic
- Specify camera angle and lighting (low angle + dramatic lighting works great)
- Each time, come up with a COMPLETELY DIFFERENT creative interpretation
- Output ONLY the image prompt, nothing else`;

  const userPrompt = `Episode title: "${episode.title}"
${context ? context + '\n' : ''}
Generate a vivid, creative thumbnail concept that exaggerates and adds intrigue to this episode. Make it attention-grabbing and visually shocking.`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('No OPENAI_API_KEY');
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const model = 'gpt-4o-mini';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        temperature: 1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    const data = await res.json();
    if (data.error) console.error('AI API error:', JSON.stringify(data.error));
    const concept = data?.choices?.[0]?.message?.content?.trim();

    if (concept) {
      return NextResponse.json({ concept: concept + SUFFIX_RULES });
    }
  } catch (e: unknown) {
    console.error('AI concept generation failed:', e);
    console.error('Used model:', moonKey ? 'kimi' : 'openai', 'key present:', !!apiKey);
  }

  // Fallback: simple template if API fails
  return NextResponse.json({
    concept: `A photorealistic, dramatic depiction of the most extreme version of "${episode.title}", set in ${episode.series_title || 'an exotic location'}. Vivid, saturated colors, dramatic lighting, ultra-sharp details.${SUFFIX_RULES}`,
  });
}
