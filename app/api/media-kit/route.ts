import { NextRequest, NextResponse } from 'next/server';
import { getMediaKitConfig, getMediaKitStats, updateMediaKitConfig } from '@/lib/db';

const JSON_FIELDS = new Set(['content_pillars', 'audience_gender_split', 'audience_top_geos']);
const INT_FIELDS = new Set(['subscriber_count', 'avg_views_per_video']);
const FLOAT_FIELDS = new Set(['avg_engagement_rate']);

function normalizeConfigInput(data: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (JSON_FIELDS.has(key)) {
      if (typeof value === 'string') {
        normalized[key] = value;
      } else {
        normalized[key] = JSON.stringify(value);
      }
      continue;
    }

    if (INT_FIELDS.has(key)) {
      normalized[key] = typeof value === 'number' ? Math.round(value) : Number(value);
      continue;
    }

    if (FLOAT_FIELDS.has(key)) {
      normalized[key] = typeof value === 'number' ? value : Number(value);
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

export async function GET() {
  const config = getMediaKitConfig();
  const stats = getMediaKitStats();
  return NextResponse.json({ config, stats });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const updated = updateMediaKitConfig(normalizeConfigInput(body));
  return NextResponse.json({ config: updated });
}
