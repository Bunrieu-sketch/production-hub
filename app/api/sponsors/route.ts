import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');

  let query = 'SELECT * FROM sponsors WHERE 1=1';
  const params: string[] = [];
  if (stage) { query += ' AND stage = ?'; params.push(stage); }
  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const {
    brand_name, deal_type, deal_value_gross, deal_value_net, stage,
    contact_name, contact_email, agency_name, agency_contact,
    offer_date, script_due, live_date, placement,
    integration_length_seconds, notes, brief_text,
    payment_terms_brand_days, payment_terms_agency_days,
    cpm_rate, cpm_cap, mvg,
  } = body;

  const gross = deal_value_gross || 0;
  const net = deal_value_net || gross * 0.8;

  const result = db.prepare(`
    INSERT INTO sponsors (
      brand_name, deal_type, deal_value_gross, deal_value_net, stage,
      contact_name, contact_email, agency_name, agency_contact,
      offer_date, script_due, live_date, placement,
      integration_length_seconds, notes, brief_text,
      payment_terms_brand_days, payment_terms_agency_days,
      cpm_rate, cpm_cap, mvg
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    brand_name, deal_type || 'flat_rate', gross, net, stage || 'inquiry',
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
