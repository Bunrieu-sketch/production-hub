import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const LEAD_SUB_STATUSES = ['inquiry', 'negotiation'];
const CONTENT_SUB_STATUSES = ['brief_received', 'script_writing', 'script_submitted', 'script_approved', 'filming', 'brand_review'];

function normalizeSubStatus(stage: string, subStatus?: string | null) {
  if (stage === 'leads') {
    return LEAD_SUB_STATUSES.includes(subStatus || '') ? subStatus : 'inquiry';
  }
  if (stage === 'content') {
    return CONTENT_SUB_STATUSES.includes(subStatus || '') ? subStatus : 'brief_received';
  }
  return null;
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');

  let query = `
    SELECT
      sponsors.*,
      episodes.view_count as episode_view_count,
      episodes.view_count_updated_at as episode_view_count_updated_at,
      episodes.youtube_video_id as episode_youtube_video_id,
      episodes.thumbnail_url as episode_thumbnail_url,
      episodes.actual_publish_date as episode_publish_date,
      episodes.publish_date as episode_target_publish_date
    FROM sponsors
    LEFT JOIN episodes ON sponsors.episode_id = episodes.id
    WHERE 1=1
  `;
  const params: string[] = [];
  if (stage) { query += ' AND sponsors.stage = ?'; params.push(stage); }
  query += ' ORDER BY sponsors.created_at DESC';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const {
    brand_name, deal_type, deal_value_gross, deal_value_net, stage, sub_status,
    contact_name, contact_email, agency_name, agency_contact,
    offer_date, script_due, live_date, placement,
    integration_length_seconds, notes, brief_text,
    payment_terms_brand_days, payment_terms_agency_days,
    cpm_rate, cpm_cap, mvg,
  } = body;

  const gross = deal_value_gross || 0;
  const net = deal_value_net || gross * 0.8;
  const nextStage = stage || 'leads';
  const nextSubStatus = normalizeSubStatus(nextStage, sub_status);

  const result = db.prepare(`
    INSERT INTO sponsors (
      brand_name, deal_type, deal_value_gross, deal_value_net, stage, sub_status,
      contact_name, contact_email, agency_name, agency_contact,
      offer_date, script_due, live_date, placement,
      integration_length_seconds, notes, brief_text,
      payment_terms_brand_days, payment_terms_agency_days,
      cpm_rate, cpm_cap, mvg
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    brand_name, deal_type || 'flat_rate', gross, net, nextStage, nextSubStatus,
    contact_name || '', contact_email || '', agency_name || '', agency_contact || '',
    offer_date || null, script_due || null, live_date || null,
    placement || 'first_5_min', integration_length_seconds || 60,
    notes || '', brief_text || '',
    payment_terms_brand_days ?? 30, payment_terms_agency_days ?? 15,
    cpm_rate || null, cpm_cap || null, mvg || null
  );

  const sponsor = db.prepare('SELECT * FROM sponsors WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(sponsor, { status: 201 });
}
