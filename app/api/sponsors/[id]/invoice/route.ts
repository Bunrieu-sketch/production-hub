import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Sponsor {
  id: number;
  brand_name: string;
  deal_type: string;
  deal_value_gross: number;
  deal_value_net: number;
  cpm_rate: number | null;
  cpm_cap: number | null;
  views_at_30_days: number;
  live_date: string | null;
  invoice_date: string | null;
  payment_due_date: string | null;
  invoice_amount: number;
  agency_contact: string;
  contact_name: string;
  contact_email: string;
  youtube_video_id: string;
  youtube_video_title: string;
  payment_terms_brand_days: number;
  payment_terms_agency_days: number;
  notes: string;
  promo_code: string;
}

function calcCpm(views: number, rate: number, cap: number): number {
  const raw = (views / 1000) * rate;
  return cap > 0 ? Math.min(raw, cap) : raw;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const s = db.prepare('SELECT * FROM sponsors WHERE id = ?').get(id) as Sponsor | undefined;
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const year = new Date().getFullYear();
  const invoiceNum = `SPO-${year}-${String(s.id).padStart(4, '0')}`;

  // Calculate line items
  const lines: { desc: string; amount: number }[] = [];
  let subtotal = 0;

  if (s.deal_type === 'cpm') {
    const rate = s.cpm_rate ?? 0;
    const cap = s.cpm_cap ?? 0;
    const views = s.views_at_30_days ?? 0;
    const days = daysSince(s.live_date);
    const isFinal = days !== null && days >= 30;

    if (views > 0 && rate > 0) {
      const cpmEarnings = calcCpm(views, rate, cap);
      const hitCap = cap > 0 && cpmEarnings >= cap;
      const status = isFinal ? 'Final (30-day window closed)' : `Provisional — ${views.toLocaleString()} views at day ${days ?? '?'}`;
      lines.push({
        desc: `CPM Sponsorship: ${views.toLocaleString()} views × $${rate}/1,000 = $${fmt(cpmEarnings)}${hitCap ? ' (cap reached)' : ''}<br><small style="color:#666">${status}</small>`,
        amount: cpmEarnings,
      });
      subtotal += cpmEarnings;
    } else if (s.invoice_amount > 0) {
      lines.push({ desc: 'CPM Sponsorship (amount per agreement)', amount: s.invoice_amount });
      subtotal += s.invoice_amount;
    }
  } else {
    // Flat rate or full video — use gross
    const amount = s.deal_value_gross > 0 ? s.deal_value_gross : s.invoice_amount;
    lines.push({ desc: 'YouTube Sponsorship Integration (flat fee)', amount });
    subtotal += amount;
  }

  const total = s.invoice_amount > 0 ? s.invoice_amount : subtotal;
  const issueDate = s.invoice_date ? fmtDate(s.invoice_date) : fmtDate(new Date().toISOString().split('T')[0]);
  const dueDate = s.payment_due_date ? fmtDate(s.payment_due_date) : '30 days from issue';
  const billedTo = s.agency_contact || s.contact_name || s.brand_name;
  const billedEmail = s.contact_email || '';
  const videoUrl = s.youtube_video_id ? `https://youtube.com/watch?v=${s.youtube_video_id}` : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNum}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      color: #1a1a1a;
      background: #f5f5f5;
      padding: 40px 20px;
    }
    .page {
      max-width: 760px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      padding: 56px 60px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 2px solid #eee;
    }
    .from-name { font-size: 22px; font-weight: 700; color: #111; }
    .from-sub  { font-size: 13px; color: #666; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-num { font-size: 20px; font-weight: 700; color: #111; }
    .invoice-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
    .invoice-date  { font-size: 13px; color: #555; margin-top: 6px; }

    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 40px;
    }
    .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; font-weight: 600; margin-bottom: 8px; }
    .party-name  { font-size: 15px; font-weight: 600; color: #111; }
    .party-sub   { font-size: 13px; color: #666; margin-top: 3px; }

    .video-ref {
      background: #f8f8f8;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 32px;
      font-size: 13px;
      color: #444;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .video-ref .vid-title { font-weight: 600; color: #111; }
    .video-ref a { color: #5a67d8; text-decoration: none; font-size: 12px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    thead tr { border-bottom: 2px solid #eee; }
    thead th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #999;
      font-weight: 600;
      padding: 0 0 10px;
      text-align: left;
    }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody td {
      padding: 16px 0;
      font-size: 13px;
      color: #333;
      vertical-align: top;
    }
    tbody td:last-child { text-align: right; font-weight: 600; color: #111; white-space: nowrap; }
    tbody td small { font-size: 11px; color: #888; }

    .totals {
      margin-top: 0;
      padding-top: 16px;
      border-top: 2px solid #eee;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #555;
    }
    .total-row.grand {
      font-size: 18px;
      font-weight: 700;
      color: #111;
      padding-top: 12px;
      margin-top: 6px;
      border-top: 1px solid #eee;
    }

    .terms {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #888;
      line-height: 1.6;
    }
    .terms strong { color: #555; }

    .footer {
      margin-top: 48px;
      text-align: center;
      font-size: 11px;
      color: #bbb;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .badge-final    { background: #dcfce7; color: #15803d; }
    .badge-accruing { background: #fef9c3; color: #a16207; }

    .print-btn {
      position: fixed;
      top: 24px;
      right: 24px;
      padding: 10px 22px;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-btn:hover { background: #333; }

    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border-radius: 0; padding: 40px; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>

  <div class="page">
    <div class="header">
      <div>
        <div class="from-name">Andrew Fraser</div>
        <div class="from-sub">montythehandler@gmail.com</div>
        <div class="from-sub">YouTube Creator</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-label">Invoice</div>
        <div class="invoice-num">${invoiceNum}</div>
        <div class="invoice-date"><strong>Issued:</strong> ${issueDate}</div>
        <div class="invoice-date"><strong>Due:</strong> ${dueDate}</div>
      </div>
    </div>

    <div class="parties">
      <div>
        <div class="party-label">Bill To</div>
        <div class="party-name">${billedTo}</div>
        ${billedEmail ? `<div class="party-sub">${billedEmail}</div>` : ''}
        <div class="party-sub">${s.brand_name}</div>
      </div>
      <div>
        <div class="party-label">From</div>
        <div class="party-name">Andrew Fraser</div>
        <div class="party-sub">montythehandler@gmail.com</div>
      </div>
    </div>

    ${videoUrl || s.youtube_video_title ? `
    <div class="video-ref">
      <div class="vid-title">📹 ${s.youtube_video_title || 'YouTube Sponsorship Integration'}</div>
      ${videoUrl ? `<a href="${videoUrl}" target="_blank">${videoUrl}</a>` : ''}
    </div>
    ` : ''}

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Amount (USD)</th>
        </tr>
      </thead>
      <tbody>
        ${lines.map(l => `
        <tr>
          <td>${l.desc}</td>
          <td>$${fmt(l.amount)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      ${lines.length > 1 ? `
      <div class="total-row">
        <span>Subtotal</span>
        <span>$${fmt(subtotal)}</span>
      </div>
      ` : ''}
      <div class="total-row grand">
        <span>Total Due</span>
        <span>$${fmt(total)}</span>
      </div>
    </div>

    <div class="terms">
      <strong>Payment Terms:</strong>
      ${s.payment_terms_brand_days ? `Brand pays agency within ${s.payment_terms_brand_days} days of publish. ` : ''}
      ${s.payment_terms_agency_days ? `Agency pays creator within ${s.payment_terms_agency_days} days thereafter.` : ''}
      ${s.promo_code ? `<br><strong>Promo Code:</strong> ${s.promo_code}` : ''}
      ${s.notes ? `<br><strong>Notes:</strong> ${s.notes}` : ''}
    </div>

    <div class="footer">
      Generated by Production Hub · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
