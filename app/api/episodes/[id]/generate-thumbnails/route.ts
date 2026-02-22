import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

export const runtime = 'nodejs';

const exec = promisify(execCb);
const REF_DIR = '/Users/montymac/hellp/assets/andrew-refs';
const DEFAULT_SCRIPT = '/opt/homebrew/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py';

const escapeForDoubleQuotes = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');

const shuffle = <T,>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

async function locateScriptPath() {
  try {
    await fs.access(DEFAULT_SCRIPT);
    return DEFAULT_SCRIPT;
  } catch {
    const { stdout } = await exec(
      'find /opt/homebrew/lib/node_modules/openclaw/skills/nano-banana-pro -name "generate_image.py" -print -quit',
    );
    const found = stdout.trim();
    if (!found) throw new Error('Nano Banana script not found');
    return found;
  }
}

async function pickReferencePhotos() {
  const entries = await fs.readdir(REF_DIR);
  const files = entries
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .map((file) => path.join(REF_DIR, file));
  if (!files.length) throw new Error('No reference images found');

  const preferred = files.filter((file) => /personal|thumb/i.test(path.basename(file)));
  const fallback = files.filter((file) => !/personal|thumb/i.test(path.basename(file)));
  const ordered = [...shuffle(preferred), ...shuffle(fallback)];

  const picks = ordered.slice(0, 3);
  while (picks.length < 3) {
    picks.push(files[Math.floor(Math.random() * files.length)]);
  }
  return picks;
}

function buildVariants(concept: string) {
  const trimmed = concept.trim();
  return [
    trimmed,
    `${trimmed}. Extreme close-up, huge expression, bold saturated colors, punchy contrast.`,
    `${trimmed}. Wide shot with impossible scale, dynamic motion blur, cinematic lighting.`,
  ];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const episode = db.prepare('SELECT id FROM episodes WHERE id = ?').get(id) as { id?: number } | undefined;
  if (!episode?.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const concept = typeof body?.concept === 'string' ? body.concept : '';
  if (!concept.trim()) {
    return NextResponse.json({ error: 'Concept required' }, { status: 400 });
  }

  try {
    const [scriptPath, refs] = await Promise.all([locateScriptPath(), pickReferencePhotos()]);
    const outputDir = path.join(process.cwd(), 'public', 'thumbnails', `ep-${id}`);
    await fs.mkdir(outputDir, { recursive: true });

    const variants = buildVariants(concept);
    const commands = variants.map((variant, index) => {
      const outputPath = path.join(outputDir, `thumb-${index + 1}.png`);
      const prompt = escapeForDoubleQuotes(variant);
      const out = escapeForDoubleQuotes(outputPath);
      const refArgs = refs.map((ref) => `-i "${escapeForDoubleQuotes(ref)}"`).join(' ');
      return `uv run "${escapeForDoubleQuotes(scriptPath)}" --prompt "${prompt}" --filename "${out}" ${refArgs} --resolution 1K`;
    });

    await Promise.all(commands.map((cmd) => exec(cmd, { maxBuffer: 1024 * 1024 * 20 })));

    const urls = variants.map((_, index) => `/thumbnails/ep-${id}/thumb-${index + 1}.png`);
    return NextResponse.json({ urls });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Thumbnail generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
