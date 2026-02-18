import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Alert {
  id: string;
  severity: 'red' | 'yellow';
  message: string;
  sponsorId: number;
  brandName: string;
}

export async function GET() {
  const db = getDb();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const sponsors = db.prepare(`
    SELECT id, brand_name, stage, sub_status,
      script_due, live_date, invoice_date,
      payment_due_date, payment_received_date,
      payment_terms_brand_days, payment_terms_agency_days,
      deal_type, cpm_cap, views_at_30_days, live_date as published_date,
      next_action_due
    FROM sponsors
    WHERE stage NOT IN ('paid')
  `).all() as Array<{
    id: number;
    brand_name: string;
    stage: string;
    sub_status: string | null;
    script_due: string | null;
    live_date: string | null;
    invoice_date: string | null;
    payment_due_date: string | null;
    payment_received_date: string | null;
    payment_terms_brand_days: number;
    payment_terms_agency_days: number;
    deal_type: string;
    cpm_cap: number | null;
    views_at_30_days: number;
    published_date: string | null;
    next_action_due: string | null;
  }>;

  const alerts: Alert[] = [];

  for (const sp of sponsors) {
    // Payment overdue
    if (sp.payment_due_date && !sp.payment_received_date) {
      const due = new Date(sp.payment_due_date);
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (daysOverdue > 0) {
        alerts.push({
          id: `payment-overdue-${sp.id}`,
          severity: 'red',
          message: `${sp.brand_name} payment overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`,
          sponsorId: sp.id,
          brandName: sp.brand_name,
        });
      }
    }

    // Script due soon (within 3 days)
    if (sp.script_due && sp.stage === 'content' && ['brief_received', 'script_writing', 'script_submitted'].includes(sp.sub_status || '')) {
      const due = new Date(sp.script_due);
      const daysUntil = Math.floor((due.getTime() - today.getTime()) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 3) {
        alerts.push({
          id: `script-due-${sp.id}`,
          severity: 'yellow',
          message: `${sp.brand_name}: script due ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}`,
          sponsorId: sp.id,
          brandName: sp.brand_name,
        });
      } else if (daysUntil < 0) {
        alerts.push({
          id: `script-overdue-${sp.id}`,
          severity: 'red',
          message: `${sp.brand_name}: script overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'}`,
          sponsorId: sp.id,
          brandName: sp.brand_name,
        });
      }
    }

    // CPM 30-day period ending (within 5 days of 30 days after publish)
    if (sp.deal_type === 'cpm' && sp.published_date && sp.stage === 'published') {
      const publishDate = new Date(sp.published_date);
      const thirtyDayMark = new Date(publishDate.getTime() + 30 * 86400000);
      const daysUntil = Math.floor((thirtyDayMark.getTime() - today.getTime()) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 5) {
        alerts.push({
          id: `cpm-30day-${sp.id}`,
          severity: 'yellow',
          message: `${sp.brand_name}: 30-day CPM period ends ${thirtyDayMark.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — prepare invoice`,
          sponsorId: sp.id,
          brandName: sp.brand_name,
        });
      }
    }

    // Next action overdue
    if (sp.next_action_due && sp.next_action_due < todayStr) {
      const due = new Date(sp.next_action_due);
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (daysOverdue > 0 && daysOverdue <= 7) {
        alerts.push({
          id: `next-action-${sp.id}`,
          severity: 'yellow',
          message: `${sp.brand_name}: next action overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`,
          sponsorId: sp.id,
          brandName: sp.brand_name,
        });
      }
    }
  }

  // Sort: red first, then yellow
  alerts.sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === 'red' ? -1 : 1;
  });

  return NextResponse.json(alerts);
}
