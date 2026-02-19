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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare(`
    SELECT
      sponsors.*,
      episodes.title as episode_title,
      episodes.view_count as episode_view_count,
      episodes.view_count_updated_at as episode_view_count_updated_at,
      episodes.youtube_video_id as episode_youtube_video_id,
      episodes.thumbnail_url as episode_thumbnail_url,
      episodes.actual_publish_date as episode_publish_date,
      episodes.publish_date as episode_target_publish_date
    FROM sponsors
    LEFT JOIN episodes ON sponsors.episode_id = episodes.id
    WHERE sponsors.id = ?
  `).get(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const hasStage = 'stage' in body;
  const hasSubStatus = 'sub_status' in body;

  if (hasStage || hasSubStatus) {
    const current = db.prepare('SELECT stage, sub_status FROM sponsors WHERE id = ?').get(id) as { stage?: string; sub_status?: string | null } | undefined;
    const stage = hasStage ? body.stage : current?.stage || 'leads';
    if (hasSubStatus) {
      body.sub_status = normalizeSubStatus(stage, body.sub_status);
    } else if (hasStage) {
      body.sub_status = normalizeSubStatus(stage, current?.sub_status);
    }
  }

  const fields = [
    'brand_name', 'deal_type', 'deal_value_gross', 'deal_value_net',
    'cpm_rate', 'cpm_cap', 'mvg', 'stage', 'sub_status',
    'contact_name', 'contact_email', 'agency_name', 'agency_contact',
    'offer_date', 'contract_date', 'brief_due', 'brief_received_date',
    'script_due', 'film_by', 'rough_cut_due', 'brand_review_due',
    'live_date', 'invoice_date', 'payment_due_date', 'payment_received_date',
    'payment_terms_brand_days', 'payment_terms_agency_days', 'invoice_amount',
    'placement', 'integration_length_seconds', 'brief_text', 'brief_link',
    'script_draft', 'script_status',
    'has_tracking_link', 'has_pinned_comment', 'has_qr_code',
    'tracking_link', 'promo_code',
    'youtube_video_id', 'youtube_video_title', 'views_at_30_days',
    'cpm_screenshot_taken', 'cpm_invoice_generated',
    'mvg_met', 'make_good_required', 'make_good_video_id',
    'exclusivity_window_days', 'exclusivity_category',
    'requires_product', 'product_ordered_date', 'product_ship_to', 'product_received',
    'episode_id', 'notes', 'next_action', 'next_action_due',
  ];

  const updates: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (f in body) { updates.push(`${f} = ?`); values.push(body[f]); }
  }
  if (!updates.length) return NextResponse.json({ error: 'No fields' }, { status: 400 });

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE sponsors SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare(`
    SELECT
      sponsors.*,
      episodes.title as episode_title,
      episodes.view_count as episode_view_count,
      episodes.view_count_updated_at as episode_view_count_updated_at,
      episodes.youtube_video_id as episode_youtube_video_id,
      episodes.thumbnail_url as episode_thumbnail_url,
      episodes.actual_publish_date as episode_publish_date,
      episodes.publish_date as episode_target_publish_date
    FROM sponsors
    LEFT JOIN episodes ON sponsors.episode_id = episodes.id
    WHERE sponsors.id = ?
  `).get(id);
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM sponsors WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
