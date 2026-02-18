/**
 * One-time migration from production-hub.db and content-pipeline dashboard.db
 * into mission-control.db.
 *
 * Run via: npx tsx lib/migrate-production.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const MC_DB = path.join(__dirname, '..', 'mission-control.db');
const PROD_HUB_DB = path.resolve(__dirname, '../../production-hub/production-hub.db');
const PIPELINE_DB = path.resolve(__dirname, '../../content-pipeline/dashboard.db');

function openIfExists(p: string): Database.Database | null {
  // Check data sub-folder first (production-hub stores in data/)
  const alt = path.join(path.dirname(p), 'data', path.basename(p));
  if (fs.existsSync(alt)) {
    console.log(`  Opening ${alt}`);
    return new Database(alt, { readonly: true });
  }
  if (fs.existsSync(p)) {
    console.log(`  Opening ${p}`);
    return new Database(p, { readonly: true });
  }
  console.warn(`  Not found: ${p} (skipping)`);
  return null;
}

// ── Init the MC schema ────────────────────────────────────────────────────────
// Just import getDb so schema is created before we write data
import { getDb } from './db';
const mc = getDb();

// ── Helpers ───────────────────────────────────────────────────────────────────
function tableExists(db: Database.Database, name: string): boolean {
  const row = db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`).get(name) as { 1: number } | undefined;
  return !!row;
}

function migrateProdHub() {
  const src = openIfExists(PROD_HUB_DB);
  if (!src) return;

  try {
    // People
    if (tableExists(src, 'people')) {
      const people = src.prepare('SELECT * FROM people').all() as Array<Record<string, unknown>>;
      const insertPerson = mc.prepare(`
        INSERT OR IGNORE INTO people (id, name, role, email, phone, rate_per_day, currency, location, instagram, notes, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let count = 0;
      const txn = mc.transaction(() => {
        for (const p of people) {
          insertPerson.run(p.id, p.name, p.role, p.email || '', p.phone || '', p.rate_per_day || 0, p.currency || 'USD', p.location || '', p.instagram || '', p.notes || '', p.active ?? 1, p.created_at);
          count++;
        }
      });
      txn();
      console.log(`  Migrated ${count} people`);
    }

    // Series
    if (tableExists(src, 'series')) {
      const series = src.prepare('SELECT * FROM series').all() as Array<Record<string, unknown>>;
      const insertSeries = mc.prepare(`
        INSERT OR IGNORE INTO series (id, title, location, status, target_shoot_start, target_shoot_end, actual_shoot_start, actual_shoot_end, fixer_id, producer_id, camera_id, budget_target, budget_actual, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let count = 0;
      const txn = mc.transaction(() => {
        for (const s of series) {
          insertSeries.run(s.id, s.title, s.location || '', s.status || 'ideation', s.target_shoot_start, s.target_shoot_end, s.actual_shoot_start, s.actual_shoot_end, s.fixer_id || null, s.producer_id || null, s.camera_id || null, s.budget_target || 0, s.budget_actual || 0, s.notes || '', s.created_at, s.updated_at);
          count++;
        }
      });
      txn();
      console.log(`  Migrated ${count} series`);
    }

    // Episodes
    if (tableExists(src, 'episodes')) {
      const episodes = src.prepare('SELECT * FROM episodes').all() as Array<Record<string, unknown>>;
      const insertEp = mc.prepare(`
        INSERT OR IGNORE INTO episodes (id, series_id, title, stage, sort_order, episode_type, shoot_date, rough_cut_due, publish_date, actual_publish_date, editor_id, youtube_video_id, youtube_url, view_count, thumbnail_concept, hook, outline, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let count = 0;
      const txn = mc.transaction(() => {
        for (const e of episodes) {
          insertEp.run(e.id, e.series_id, e.title, e.stage || 'idea', e.sort_order || 0, e.episode_type || 'cornerstone', e.shoot_date, e.rough_cut_due, e.publish_date, e.actual_publish_date, e.editor_id || null, e.youtube_video_id || '', e.youtube_url || '', e.view_count || 0, e.thumbnail_concept || '', e.hook || '', e.outline || '', e.notes || '', e.created_at, e.updated_at);
          count++;
        }
      });
      txn();
      console.log(`  Migrated ${count} episodes`);
    }

    // Milestones
    if (tableExists(src, 'milestones')) {
      const milestones = src.prepare('SELECT * FROM milestones').all() as Array<Record<string, unknown>>;
      const insertMs = mc.prepare(`
        INSERT OR IGNORE INTO milestones (id, series_id, week_number, title, due_date, completed, completed_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let count = 0;
      const txn = mc.transaction(() => {
        for (const m of milestones) {
          insertMs.run(m.id, m.series_id, m.week_number, m.title, m.due_date, m.completed || 0, m.completed_at, m.notes || '');
          count++;
        }
      });
      txn();
      console.log(`  Migrated ${count} milestones`);
    }

    // Travel
    if (tableExists(src, 'travel')) {
      const travel = src.prepare('SELECT * FROM travel').all() as Array<Record<string, unknown>>;
      const insertTravel = mc.prepare(`
        INSERT OR IGNORE INTO travel (id, series_id, type, title, details, date_start, date_end, cost, currency, booked, confirmation_number, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let count = 0;
      const txn = mc.transaction(() => {
        for (const t of travel) {
          insertTravel.run(t.id, t.series_id, t.type, t.title, t.details || '', t.date_start, t.date_end, t.cost || 0, t.currency || 'USD', t.booked || 0, t.confirmation_number || '', t.notes || '', t.created_at);
          count++;
        }
      });
      txn();
      console.log(`  Migrated ${count} travel items`);
    }

    // Sponsors from production-hub
    if (tableExists(src, 'sponsors')) {
      const sponsors = src.prepare('SELECT * FROM sponsors').all() as Array<Record<string, unknown>>;
      const insertSponsor = mc.prepare(`
        INSERT OR IGNORE INTO sponsors (
          brand_name, deal_type, deal_value_gross, deal_value_net, stage,
          contact_name, contact_email, agency_name,
          offer_date, contract_date, brief_due, script_due, film_by,
          brand_review_due, live_date, invoice_date, payment_due_date, payment_received_date,
          placement, integration_length_seconds, brief_text, script_draft,
          requires_product, product_ordered_date, product_ship_to, product_received,
          notes, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `);
      let count = 0;
      const txn = mc.transaction(() => {
        for (const s of sponsors) {
          const gross = (s.deal_value as number) || 0;
          insertSponsor.run(
            s.brand_name, s.deal_type || 'flat_rate', gross, gross * 0.8, s.stage || 'inquiry',
            s.contact_name || '', s.contact_email || '', s.agency_name || '',
            s.offer_date, s.contract_date, s.brief_due, s.script_due, s.film_by,
            s.brand_review_due, s.live_date, s.invoice_date, s.payment_due_date, s.payment_received_date,
            s.placement || 'first_5_min', s.integration_length_seconds || 60,
            s.brief_text || '', s.script_draft || '',
            s.requires_product || 0, s.product_ordered_date, s.product_ship_to || '', s.product_received || 0,
            s.notes || '', s.created_at, s.updated_at
          );
          count++;
        }
      });
      txn();
      console.log(`  Migrated ${count} sponsors from production-hub`);
    }

  } finally {
    src.close();
  }
}

function migratePipeline() {
  const src = openIfExists(PIPELINE_DB);
  if (!src) return;

  try {
    // sponsors_v2 table from content-pipeline
    const tables = ['sponsors_v2', 'sponsors'];
    for (const tbl of tables) {
      if (!tableExists(src, tbl)) continue;

      const rows = src.prepare(`SELECT * FROM ${tbl}`).all() as Array<Record<string, unknown>>;
      if (!rows.length) continue;

      const insertSponsor = mc.prepare(`
        INSERT OR IGNORE INTO sponsors (
          brand_name, deal_type, deal_value_gross, deal_value_net, stage,
          contact_name, contact_email, agency_name,
          offer_date, contract_date, script_due, live_date,
          invoice_date, payment_due_date, payment_received_date,
          payment_terms_brand_days, payment_terms_agency_days, invoice_amount,
          placement, integration_length_seconds, brief_text, brief_link,
          script_draft, script_status,
          has_tracking_link, has_pinned_comment, has_qr_code,
          tracking_link, promo_code,
          youtube_video_id, youtube_video_title, views_at_30_days,
          cpm_rate, cpm_cap, mvg,
          notes, next_action, next_action_due,
          created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `);
      let count = 0;
      const txn = mc.transaction(() => {
        for (const s of rows) {
          const gross = (s.deal_value_gross as number) || 0;
          const net = (s.deal_value_net as number) || gross * 0.8;

          // Map old stage names to new if needed
          let stage = (s.stage as string) || 'inquiry';
          const stageMap: Record<string, string> = {
            offer_received: 'inquiry',
            qualified: 'negotiation',
            contract_signed: 'contract',
            brief_script: 'brief_received',
            published: 'live',
            make_good: 'live',
          };
          if (stageMap[stage]) stage = stageMap[stage];

          insertSponsor.run(
            s.brand_name, s.deal_type || 'flat_rate', gross, net, stage,
            s.agency_contact || '', s.agency_email || '', '',
            s.offer_date, s.contract_date,
            s.script_due_date || s.script_due, s.publish_date || s.live_date,
            s.invoice_date, s.payment_due_date, s.payment_received_date,
            s.payment_terms_brand_days || 30, s.payment_terms_agency_days || 15,
            s.invoice_amount || 0,
            s.placement || 'first_5_min', s.integration_length_seconds || 60,
            s.brief_text || '', s.brief_link || '',
            s.script_draft || '', s.script_status || 'not_started',
            s.has_tracking_link || 0, s.has_pinned_comment || 0, s.has_qr_code || 0,
            s.tracking_link || '', s.promo_code || '',
            s.youtube_video_id || '', s.youtube_video_title || '', s.views_at_30_days || 0,
            s.cpm_rate || null, s.cpm_cap || null, s.mvg || null,
            s.notes || '', s.next_action || '', s.next_action_due || null,
            s.created_at, s.updated_at
          );
          count++;
        }
      });
      txn();
      console.log(`  Migrated ${count} sponsors from ${tbl} (content-pipeline)`);
      break; // only process one table
    }
  } finally {
    src.close();
  }
}

console.log('Starting migration...');
console.log('\n[1] Production Hub:');
migrateProdHub();
console.log('\n[2] Content Pipeline:');
migratePipeline();
console.log('\nMigration complete.');
