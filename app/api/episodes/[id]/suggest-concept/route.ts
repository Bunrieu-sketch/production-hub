import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SUFFIX_RULES = `\n\nTechnical rules for the image prompt (append these exactly):\n- This is a YOUTUBE THUMBNAIL — it must read instantly at small sizes on a phone screen\n- Include the host/YouTuber (a young male traveler) as the central human element — reference photos will be provided separately for likeness\n- Photorealistic photography style with rich, saturated colors and ultra-sharp focus\n- If any text appears in the image, maximum 1-3 words that add intrigue — never repeat words from the episode title\n- Clear negative space on one side for text overlay\n- Landscape 16:9 format`;

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

  const systemPrompt = `You are a world-class YouTube thumbnail strategist. Your process:

STEP 1 — CURIOSITY ANALYSIS (think silently, don't output this):
- What is the CORE EMOTION this video triggers? (fear, awe, disgust, wonder, disbelief)
- What would make a viewer stop scrolling and think "NO WAY, is that real?"
- What single image would create an information gap — showing enough to intrigue but not enough to satisfy?

STEP 2 — EXTREME VISUAL CONCEPT:
Based on your analysis, describe ONE hyper-dramatic, exaggerated image that:
- Captures the most EXTREME possible version of the subject
- Uses scale distortion — make things look impossibly big, intense, or dangerous
- Has a single unmistakable focal point that reads in 0.5 seconds on a phone
- Evokes a visceral gut reaction (jaw drop, cringe, wonder)
- Feels like a real photograph taken at the perfect moment, but cranked to 11

The channel is a travel/food/culture channel exploring the most extreme, otherworldly experiences on Earth. Think: bizarre foods, dangerous traditions, isolated tribes, places that don't look real.

CRITICAL: Every suggestion must be WILDLY DIFFERENT from the last. Never default to "person holding food" or "person standing in front of landmark." Think cinematically — unusual angles, dramatic scale, unexpected framing.

Output ONLY the image generation prompt. No preamble, no explanation.`;

  const userPrompt = `Episode: "${episode.title}"
${context ? context + '\n' : ''}
Generate a thumbnail concept that would make someone's thumb STOP mid-scroll. What's the most extreme, curiosity-inducing single image for this episode?`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('No GEMINI_API_KEY');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
          ],
          generationConfig: {
            temperature: 1.2,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    const data = await res.json();
    const concept = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (concept) {
      return NextResponse.json({ concept: concept + SUFFIX_RULES });
    }

    console.error('Gemini response issue:', JSON.stringify(data).slice(0, 500));
  } catch (e: unknown) {
    console.error('Gemini concept generation failed:', e);
  }

  // Fallback: simple template if API fails
  return NextResponse.json({
    concept: `A photorealistic, dramatic depiction of the most extreme version of "${episode.title}", set in ${episode.series_title || 'an exotic location'}. Vivid, saturated colors, dramatic lighting, ultra-sharp details.${SUFFIX_RULES}`,
  });
}
