'use client';

import { useEffect, useState } from 'react';
import { Plus, DollarSign, X, ChevronRight, FileDown } from 'lucide-react';

interface Sponsor {
  id: number; brand_name: string; stage: string; sub_status: string | null;
  deal_value_gross: number; deal_value_net: number; deal_type: string;
  contact_name: string; contact_email: string;
  agency_name: string; agency_contact: string;
  script_due: string; live_date: string; payment_due_date: string; payment_received_date: string;
  script_draft: string; script_status: string; brief_text: string; brief_link: string;
  has_tracking_link: number; has_pinned_comment: number; has_qr_code: number;
  tracking_link: string; promo_code: string;
  placement: string; integration_length_seconds: number;
  payment_terms_brand_days: number; payment_terms_agency_days: number;
  invoice_amount: number; invoice_date: string;
  notes: string; next_action: string; next_action_due: string;
  offer_date: string; contract_date: string; brief_due: string; brief_received_date: string;
  film_by: string; rough_cut_due: string; brand_review_due: string;
  exclusivity_window_days: number; exclusivity_category: string;
  episode_id: number | null;
  sponsor_source?: 'manual' | 'description' | 'pinned_comment';
  cpm_rate: number | null; cpm_cap: number | null; mvg: number | null;
  views_at_30_days: number;
  episode_title?: string | null;
  episode_view_count?: number | null;
  episode_view_count_updated_at?: string | null;
  episode_youtube_video_id?: string | null;
  episode_thumbnail_url?: string | null;
  episode_publish_date?: string | null;
  episode_target_publish_date?: string | null;
}

interface Alert {
  id: string; severity: 'red' | 'yellow'; message: string;
  sponsorId: number; brandName: string;
}

interface NewSponsorForm {
  brand_name: string;
  deal_type: string;
  deal_value_gross: string;
  stage: string;
  sub_status: string | null;
  contact_name: string;
  agency_name: string;
}

const STAGES = [
  { key: 'leads', label: 'Leads', color: '#8b949e' },
  { key: 'contracted', label: 'Contracted', color: 'var(--blue)' },
  { key: 'content', label: 'Content', color: 'var(--orange)' },
  { key: 'published', label: 'Published', color: 'var(--green)' },
  { key: 'invoiced', label: 'Invoiced', color: 'var(--blue)' },
  { key: 'paid', label: 'Paid', color: 'var(--green)' },
];

const LEAD_SUB_STATUSES = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'negotiation', label: 'Negotiation' },
];

const CONTENT_STEPS = [
  { key: 'brief_received', label: 'Brief Received' },
  { key: 'script_writing', label: 'Script Writing' },
  { key: 'script_submitted', label: 'Script Submitted' },
  { key: 'script_approved', label: 'Script Approved' },
  { key: 'filming', label: 'Filming' },
  { key: 'brand_review', label: 'Brand Review' },
];

const SCRIPT_STATUSES = ['not_started', 'drafting', 'submitted', 'revision_1', 'revision_2', 'revision_3', 'approved'];

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getContentStepIndex(subStatus: string | null) {
  const idx = CONTENT_STEPS.findIndex(step => step.key === subStatus);
  return idx >= 0 ? idx : 0;
}

function formatSubStatus(subStatus: string | null, stage: string) {
  if (!subStatus) return stage === 'content' ? CONTENT_STEPS[0].label : '—';
  const lead = LEAD_SUB_STATUSES.find(s => s.key === subStatus);
  if (lead) return lead.label;
  const content = CONTENT_STEPS.find(s => s.key === subStatus);
  if (content) return content.label;
  return subStatus.replace(/_/g, ' ');
}

function normalizeSubStatus(stage: string, current?: string | null) {
  if (stage === 'leads') {
    const leadKeys = LEAD_SUB_STATUSES.map(s => s.key);
    return leadKeys.includes(current ?? '') ? (current ?? 'inquiry') : 'inquiry';
  }
  if (stage === 'content') {
    const contentKeys = CONTENT_STEPS.map(s => s.key);
    return contentKeys.includes(current ?? '') ? (current ?? 'brief_received') : 'brief_received';
  }
  return null;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

const DAY_MS = 86400000;

function getPublishDate(sponsor: Sponsor) {
  const dateStr = sponsor.live_date || sponsor.episode_publish_date || sponsor.episode_target_publish_date;
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMoney(amount: number) {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function calcCpmAmount(views: number, rate: number, cap: number) {
  const capValue = cap > 0 ? cap : Number.POSITIVE_INFINITY;
  const gross = Math.min((views / 1000) * rate, capValue);
  const net = gross * 0.8;
  const hitCap = cap > 0 && (views / 1000) * rate >= cap;
  return { gross, net, hitCap };
}

function getCpmSnapshot(sponsor: Sponsor) {
  const rate = sponsor.cpm_rate || 0;
  const cap = sponsor.cpm_cap || 0;
  const liveViews = sponsor.episode_view_count || 0;
  const lockedViews = sponsor.views_at_30_days || 0;

  if (!sponsor.episode_id) {
    return {
      amount: 0,
      label: 'Pending link',
      color: 'var(--orange)',
      status: 'pending_link' as const,
      daysLeft: null,
      viewsUsed: 0,
      isLocked: false,
    };
  }

  const publishDate = getPublishDate(sponsor);
  if (!publishDate) {
    return {
      amount: 0,
      label: 'Pending publish date',
      color: 'var(--orange)',
      status: 'pending_link' as const,
      daysLeft: null,
      viewsUsed: liveViews,
      isLocked: false,
    };
  }

  const daysSince = Math.floor((Date.now() - publishDate.getTime()) / DAY_MS);
  const daysLeft = Math.max(0, 30 - daysSince);

  if (daysSince >= 30) {
    if (lockedViews > 0) {
      const { net } = calcCpmAmount(lockedViews, rate, cap);
      return {
        amount: net,
        label: `Final: ${formatMoney(net)} (${lockedViews.toLocaleString()} views)`,
        color: 'var(--green)',
        status: 'locked' as const,
        daysLeft: 0,
        viewsUsed: lockedViews,
        isLocked: true,
      };
    }
    const { net } = calcCpmAmount(liveViews, rate, cap);
    return {
      amount: net,
      label: `Final pending lock (${liveViews.toLocaleString()} views)`,
      color: 'var(--orange)',
      status: 'needs_lock' as const,
      daysLeft: 0,
      viewsUsed: liveViews,
      isLocked: false,
    };
  }

  const { net } = calcCpmAmount(liveViews, rate, cap);
  return {
    amount: net,
    label: `${formatMoney(net)} (${liveViews.toLocaleString()} views)`,
    color: 'var(--green)',
    status: 'pre_lock' as const,
    daysLeft,
    viewsUsed: liveViews,
    isLocked: false,
  };
}

// ── Compact CPM stats widget for kanban cards ──────────────────────────────
function CpmCardWidget({ sp }: { sp: Sponsor }) {
  const rate = sp.cpm_rate ?? 0;
  const cap  = sp.cpm_cap  ?? 0;
  const views = sp.views_at_30_days || sp.episode_view_count || 0;
  const publishDate = getPublishDate(sp);
  const days = publishDate ? Math.floor((Date.now() - publishDate.getTime()) / DAY_MS) : null;
  const isFinal = days !== null && days >= 30;

  if (!rate) return null;

  const grossEarnings  = (views / 1000) * rate;
  const cappedEarnings = cap > 0 ? Math.min(grossEarnings, cap) : grossEarnings;
  const hitCap = cap > 0 && grossEarnings >= cap;
  const pct    = cap > 0 ? Math.min((cappedEarnings / cap) * 100, 100) : 0;

  const fmtMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div style={{ marginTop: 5, fontSize: 10 }}>
      {/* Views · Earnings / Cap */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ color: 'var(--text-dim)' }}>
          {views > 0 ? `${(views / 1000).toFixed(1)}k views` : 'No views yet'}
        </span>
        <span style={{ fontWeight: 700, color: hitCap ? 'var(--green)' : isFinal ? 'var(--green)' : 'var(--orange)' }}>
          {views > 0 ? fmtMoney(cappedEarnings) : '—'}
          {cap > 0 ? ` / ${fmtMoney(cap)}` : ''}
          {hitCap ? ' 🔒' : ''}
        </span>
      </div>

      {/* Progress bar */}
      {cap > 0 && (
        <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', marginBottom: 3 }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: hitCap ? 'var(--green)' : isFinal ? 'var(--green)' : 'var(--orange)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* Days + final/accruing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-dim)' }}>
        <span>{days !== null ? `${days}d` : 'No publish date'}</span>
        {days !== null && (
          <span style={{
            padding: '0 4px', borderRadius: 3, fontWeight: 700, fontSize: 9,
            background: isFinal ? 'rgba(63,185,80,0.15)' : 'rgba(230,162,60,0.15)',
            color: isFinal ? 'var(--green)' : 'var(--orange)',
          }}>
            {isFinal ? 'FINAL' : 'ACCRUING'}
          </span>
        )}
      </div>
    </div>
  );
}

// Get display value for a sponsor (handles both flat rate and CPM)
function getDisplayValue(sponsor: Sponsor): { amount: number; label: string; color: string } {
  if (sponsor.deal_type === 'cpm') {
    const cpm = getCpmSnapshot(sponsor);
    return {
      amount: cpm.amount || 0,
      label: cpm.label,
      color: cpm.color
    };
  }
  return {
    amount: sponsor.deal_value_net || 0,
    label: `$${(sponsor.deal_value_net || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} net`,
    color: 'var(--green)'
  };
}

function ContentProgress({ subStatus }: { subStatus: string | null }) {
  const index = getContentStepIndex(subStatus);
  const label = CONTENT_STEPS[index]?.label || CONTENT_STEPS[0].label;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {CONTENT_STEPS.map((step, i) => (
          <span
            key={step.key}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: i === index ? 'var(--accent)' : 'var(--border)',
              boxShadow: i === index ? '0 0 0 2px rgba(163,113,247,0.25)' : 'none',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function calcPaymentBreakdown(sponsor: Sponsor) {
  const liveDate = sponsor.live_date;
  if (!liveDate) return null;
  const live = new Date(liveDate);
  const brandPays = new Date(live.getTime() + (sponsor.payment_terms_brand_days || 30) * 86400000);
  const youPaid = new Date(brandPays.getTime() + (sponsor.payment_terms_agency_days || 15) * 86400000);
  return { live, brandPays, youPaid };
}

type DetailTab = 'overview' | 'script' | 'checklist' | 'payment' | 'details';

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selected, setSelected] = useState<Sponsor | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState<NewSponsorForm>({
    brand_name: '',
    deal_type: 'flat_rate',
    deal_value_gross: '',
    stage: 'leads',
    sub_status: 'inquiry',
    contact_name: '',
    agency_name: '',
  });

  const load = () => {
    fetch('/api/sponsors').then(r => r.json()).then(setSponsors);
    fetch('/api/sponsors/alerts').then(r => r.json()).then(setAlerts);
  };
  useEffect(() => { load(); }, []);

  // Re-select updated sponsor after save
  const refreshSelected = (id: number) => {
    fetch(`/api/sponsors/${id}`).then(r => r.json()).then(data => {
      setSelected(data);
      setSponsors(prev => prev.map(s => s.id === id ? data : s));
    });
  };

  const handleDrop = async (stage: string) => {
    if (dragging === null) return;
    const sponsor = sponsors.find(s => s.id === dragging) || null;
    const nextSubStatus = normalizeSubStatus(stage, sponsor?.sub_status || null);
    await fetch(`/api/sponsors/${dragging}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, sub_status: nextSubStatus }),
    });
    setSponsors(prev => prev.map(s => s.id === dragging ? { ...s, stage, sub_status: nextSubStatus } : s));
    if (selected?.id === dragging) setSelected(prev => prev ? { ...prev, stage, sub_status: nextSubStatus } : prev);
    setDragging(null);
    setDragOver(null);
    fetch('/api/sponsors/alerts').then(r => r.json()).then(setAlerts);
  };

  const updateField = async (id: number, field: string, value: unknown) => {
    setSaving(true);
    await fetch(`/api/sponsors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(false);
    refreshSelected(id);
    fetch('/api/sponsors/alerts').then(r => r.json()).then(setAlerts);
  };

  const updateStage = async (id: number, stage: string) => {
    const sub_status = normalizeSubStatus(stage, selected?.sub_status || null);
    setSaving(true);
    await fetch(`/api/sponsors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, sub_status }),
    });
    setSaving(false);
    refreshSelected(id);
    fetch('/api/sponsors/alerts').then(r => r.json()).then(setAlerts);
  };

  const createSponsor = async () => {
    if (!newForm.brand_name) return;
    const gross = parseFloat(newForm.deal_value_gross) || 0;
    await fetch('/api/sponsors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newForm,
        deal_value_gross: gross,
        deal_value_net: gross * 0.8,
        sub_status: normalizeSubStatus(newForm.stage, newForm.sub_status),
      }),
    });
    setShowNew(false);
    setNewForm({
      brand_name: '',
      deal_type: 'flat_rate',
      deal_value_gross: '',
      stage: 'leads',
      sub_status: 'inquiry',
      contact_name: '',
      agency_name: '',
    });
    load();
  };

  const pipelineValue = sponsors.filter(s => s.stage !== 'paid').reduce((acc, s) => {
    const display = getDisplayValue(s);
    return acc + display.amount;
  }, 0);
  const paidYTD = sponsors.filter(s => s.stage === 'paid').reduce((acc, s) => {
    const display = getDisplayValue(s);
    return acc + display.amount;
  }, 0);
  const overdueCount = alerts.filter(a => a.severity === 'red').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Sponsors</h1>
          <div style={{ display: 'flex', gap: 20, marginTop: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Pipeline: <span style={{ color: 'var(--blue)', fontWeight: 600 }}>${pipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Paid YTD: <span style={{ color: 'var(--green)', fontWeight: 600 }}>${paidYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </span>
            {overdueCount > 0 && (
              <span style={{ fontSize: 12 }}>
                <span style={{
                  color: 'var(--red)', fontWeight: 700, background: 'rgba(248,81,73,0.1)',
                  padding: '1px 7px', borderRadius: 10,
                }}>
                  {overdueCount} overdue
                </span>
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/docs/sponsor-crm" className="btn btn-ghost" style={{ fontSize: 12 }}>
            📖 View Rules
          </a>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Sponsor
          </button>
        </div>
      </div>

      {/* Alerts bar */}
      {alerts.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: alert.severity === 'red' ? 'var(--red)' : 'var(--orange)', flexShrink: 0 }} />
              <span style={{ color: alert.severity === 'red' ? 'var(--red)' : 'var(--orange)', fontWeight: 500 }}>
                {alert.message}
              </span>
              <button
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                onClick={() => {
                  const sp = sponsors.find(s => s.id === alert.sponsorId);
                  if (sp) { setSelected(sp); setDetailTab('overview'); }
                }}
              >
                View <ChevronRight size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, flex: 1, paddingBottom: 16, overflow: 'hidden', minHeight: 0 }}>
        {STAGES.map(stage => {
          const stageSponsors = sponsors.filter(s => s.stage === stage.key);
          const isOver = dragOver === stage.key;
          const stageValue = stageSponsors.reduce((acc, s) => acc + getDisplayValue(s).amount, 0);
          return (
            <div
              key={stage.key}
              className="kanban-col"
              style={{
                minWidth: 0,
                background: isOver ? 'rgba(163,113,247,0.05)' : 'var(--card)',
                borderColor: isOver ? 'var(--accent)' : 'var(--border)',
                transition: 'border-color 0.15s',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage.key)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div className="status-dot" style={{ background: stage.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>{stage.label.toUpperCase()}</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, padding: '1px 5px', borderRadius: 8, background: 'var(--border)' }}>
                  {stageSponsors.length}
                </span>
              </div>
              {stageValue > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8 }}>
                  ${stageValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} net
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {stageSponsors.map(sp => (
                  <div
                    key={sp.id}
                    draggable
                    onDragStart={() => setDragging(sp.id)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => { setSelected(sp); setDetailTab('overview'); }}
                    style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '9px 10px', cursor: 'grab',
                      opacity: dragging === sp.id ? 0.5 : 1,
                      transition: 'opacity 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{sp.brand_name}</div>
                    {(sp.episode_id || sp.sponsor_source === 'description' || sp.sponsor_source === 'pinned_comment') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        {sp.episode_id && (
                          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                            Episode: <span style={{ color: 'var(--text)' }}>{sp.episode_title || 'Linked episode'}</span>
                          </div>
                        )}
                        {(sp.sponsor_source === 'description' || sp.sponsor_source === 'pinned_comment') && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 999,
                              background: 'rgba(88,166,255,0.15)',
                              color: 'var(--blue)',
                              border: '1px solid rgba(88,166,255,0.35)',
                            }}
                          >
                            Auto: {sp.sponsor_source === 'description' ? 'Description' : 'Pinned Comment'}
                          </span>
                        )}
                      </div>
                    )}
                    {sp.deal_type === 'cpm' ? (
                      <>
                        <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>CPM</div>
                        <CpmCardWidget sp={sp} />
                      </>
                    ) : (
                      <>
                        {(() => {
                          const display = getDisplayValue(sp);
                          return display.amount > 0 ? (
                            <div style={{ fontSize: 11, color: display.color, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <DollarSign size={9} /> {display.label}
                            </div>
                          ) : null;
                        })()}
                        {sp.deal_type !== 'flat_rate' && (
                          <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 3, fontWeight: 600 }}>
                            {sp.deal_type.toUpperCase().replace('_', ' ')}
                          </div>
                        )}
                      </>
                    )}
                    {stage.key === 'leads' && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                        <span style={{ padding: '2px 6px', borderRadius: 8, background: 'var(--border)', color: 'var(--text)' }}>
                          {formatSubStatus(sp.sub_status, stage.key)}
                        </span>
                      </div>
                    )}
                    {stage.key === 'content' && (
                      <ContentProgress subStatus={sp.sub_status} />
                    )}
                    {stage.key === 'published' && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                        {sp.live_date ? (() => {
                          const days = daysBetween(new Date(), new Date(sp.live_date));
                          if (days === 0) return 'Published today';
                          if (days > 0) return `Published ${days} day${days === 1 ? '' : 's'} ago`;
                          const ahead = Math.abs(days);
                          return `Publishes in ${ahead} day${ahead === 1 ? '' : 's'}`;
                        })() : 'Publish date TBD'}
                      </div>
                    )}
                    {stage.key === 'invoiced' && (
                      <div style={{ fontSize: 10, marginTop: 4, color: sp.payment_due_date ? (() => {
                        const days = daysBetween(new Date(sp.payment_due_date), new Date());
                        return days < 0 ? 'var(--red)' : 'var(--text-dim)';
                      })() : 'var(--text-dim)' }}>
                        {sp.payment_due_date ? (() => {
                          const days = daysBetween(new Date(sp.payment_due_date), new Date());
                          if (days === 0) return 'Due today';
                          if (days > 0) return `Due in ${days} day${days === 1 ? '' : 's'}`;
                          const overdue = Math.abs(days);
                          return `OVERDUE ${overdue} day${overdue === 1 ? '' : 's'}`;
                        })() : 'Due date TBD'}
                      </div>
                    )}
                    {stage.key === 'paid' && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                        {sp.payment_received_date ? `Paid ${formatFullDate(sp.payment_received_date)}` : 'Payment date TBD'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 480, background: 'var(--card)', borderLeft: '1px solid var(--border)', overflow: 'auto', zIndex: 101 }} onClick={e => e.stopPropagation()}>
            {/* Panel Header */}
            <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--border)', marginBottom: 0, position: 'sticky', top: 0, background: 'var(--card)', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600 }}>{selected.brand_name}</h2>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      color: STAGES.find(s => s.key === selected.stage)?.color || '#8b949e',
                      background: 'rgba(139,148,158,0.1)',
                    }}>
                      {STAGES.find(s => s.key === selected.stage)?.label || selected.stage}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--border)', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {selected.deal_type.replace('_', ' ').toUpperCase()}
                    </span>
                    {selected.deal_value_net > 0 && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(63,185,80,0.1)', color: 'var(--green)', fontWeight: 600 }}>
                        ${selected.deal_value_net.toLocaleString(undefined, { maximumFractionDigits: 0 })} net
                      </span>
                    )}
                    {saving && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Saving...</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <a
                    href={`/api/sponsors/${selected.id}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    <FileDown size={12} /> Invoice
                  </a>
                  <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setSelected(null)}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="tab-bar" style={{ borderBottom: 'none', marginBottom: 0 }}>
                {(['overview', 'script', 'checklist', 'payment', 'details'] as DetailTab[]).map(t => (
                  <button key={t} className={`tab ${detailTab === t ? 'active' : ''}`} onClick={() => setDetailTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {/* Overview Tab */}
              {detailTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Next Action — most important thing */}
                  {selected.next_action && (
                    <div style={{
                      background: selected.next_action_due && new Date(selected.next_action_due) < new Date() ? 'rgba(248,81,73,0.08)' : 'rgba(163,113,247,0.08)',
                      border: `1px solid ${selected.next_action_due && new Date(selected.next_action_due) < new Date() ? 'var(--red)' : 'var(--accent)'}`,
                      borderRadius: 8, padding: 14,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: selected.next_action_due && new Date(selected.next_action_due) < new Date() ? 'var(--red)' : 'var(--accent)', letterSpacing: '0.04em', marginBottom: 6 }}>
                        {selected.next_action_due && new Date(selected.next_action_due) < new Date() ? '⚠️ OVERDUE' : '⏭ NEXT ACTION'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{selected.next_action}</div>
                      {selected.next_action_due && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>Due: {formatFullDate(selected.next_action_due)}</div>
                      )}
                    </div>
                  )}

                  {/* Deal value + key info row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>DEAL VALUE</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                        {selected.deal_value_net > 0 ? `$${selected.deal_value_net.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {selected.deal_type === 'cpm' ? 'CPM' : 'net'}
                        {selected.mvg ? ` · ${(selected.mvg / 1000).toFixed(0)}k MVG` : ''}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>PLACEMENT</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{(selected.placement || 'TBD').replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{selected.integration_length_seconds || 60}s</div>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>SCRIPT</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: selected.script_status === 'approved' ? 'var(--green)' : selected.script_status === 'submitted' ? 'var(--blue)' : 'var(--orange)' }}>
                        {(selected.script_status || 'not started').replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  {/* CTA + Promo (if exists) */}
                  {(selected.promo_code || selected.tracking_link) && (
                    <div style={{
                      background: 'rgba(63,185,80,0.08)',
                      border: '1px solid rgba(63,185,80,0.3)',
                      borderRadius: 8, padding: 12,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 6, letterSpacing: '0.04em' }}>CTA &amp; PROMO</div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        {selected.promo_code && (
                          <div>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Code: </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{selected.promo_code}</span>
                          </div>
                        )}
                        {selected.tracking_link && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Link: <span style={{ color: 'var(--text)' }}>{selected.tracking_link.substring(0, 50)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Key Dates */}
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: 8 }}>KEY DATES</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Brief Due', value: selected.brief_due, field: 'brief_due' },
                        { label: 'Script Due', value: selected.script_due, field: 'script_due' },
                        { label: 'Film By', value: selected.film_by, field: 'film_by' },
                        { label: 'Live Date', value: selected.live_date, field: 'live_date' },
                      ].map(d => {
                        const isOverdue = d.value && new Date(d.value) < new Date();
                        return (
                          <div key={d.field} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.label}</span>
                            <input
                              type="date"
                              defaultValue={d.value || ''}
                              onBlur={e => updateField(selected.id, d.field, e.target.value || null)}
                              style={{ fontSize: 12, fontWeight: 600, color: isOverdue ? 'var(--red)' : 'var(--text)', background: 'transparent', border: 'none', textAlign: 'right', width: 120, cursor: 'pointer' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage + Progress controls */}
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Stage</label>
                      <select value={selected.stage} onChange={e => updateStage(selected.id, e.target.value)}>
                        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                    {(selected.stage === 'leads' || selected.stage === 'content') && (
                      <div className="form-group">
                        <label className="form-label">Progress</label>
                        <select
                          value={normalizeSubStatus(selected.stage, selected.sub_status) || ''}
                          onChange={e => updateField(selected.id, 'sub_status', e.target.value)}
                        >
                          {(selected.stage === 'leads' ? LEAD_SUB_STATUSES : CONTENT_STEPS).map(step => (
                            <option key={step.key} value={step.key}>{step.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Brief summary (if exists) */}
                  {selected.brief_text && (
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: 6 }}>BRIEF SUMMARY</div>
                      <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                        {selected.brief_text}
                      </div>
                    </div>
                  )}

                  {/* Next action editor */}
                  <div className="form-group">
                    <label className="form-label">Next Action</label>
                    <input defaultValue={selected.next_action || ''} onBlur={e => updateField(selected.id, 'next_action', e.target.value)} placeholder="What needs to happen next?" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Action Due</label>
                    <input type="date" defaultValue={selected.next_action_due || ''} onBlur={e => updateField(selected.id, 'next_action_due', e.target.value || null)} />
                  </div>

                  {/* Notes */}
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea rows={3} defaultValue={selected.notes || ''} onBlur={e => updateField(selected.id, 'notes', e.target.value)} placeholder="Notes..." />
                  </div>
                </div>
              )}

              {/* Details Tab (admin/contact info) */}
              {detailTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="grid-2">
                    {[
                      { label: 'Offer Date', field: 'offer_date', value: selected.offer_date, type: 'date' },
                      { label: 'Contract Date', field: 'contract_date', value: selected.contract_date, type: 'date' },
                      { label: 'Brief Due', field: 'brief_due', value: selected.brief_due, type: 'date' },
                      { label: 'Brief Received', field: 'brief_received_date', value: selected.brief_received_date, type: 'date' },
                      { label: 'Script Due', field: 'script_due', value: selected.script_due, type: 'date' },
                      { label: 'Film By', field: 'film_by', value: selected.film_by, type: 'date' },
                      { label: 'Rough Cut Due', field: 'rough_cut_due', value: selected.rough_cut_due, type: 'date' },
                      { label: 'Brand Review Due', field: 'brand_review_due', value: selected.brand_review_due, type: 'date' },
                      { label: 'Live Date', field: 'live_date', value: selected.live_date, type: 'date' },
                    ].map(({ label, field, value, type }) => (
                      <div key={field} className="form-group">
                        <label className="form-label">{label}</label>
                        <input type={type} defaultValue={value || ''} onBlur={e => updateField(selected.id, field, e.target.value || null)} />
                      </div>
                    ))}
                  </div>

                  <div className="grid-2">
                    {[
                      { label: 'Contact', field: 'contact_name', value: selected.contact_name },
                      { label: 'Contact Email', field: 'contact_email', value: selected.contact_email },
                      { label: 'Agency', field: 'agency_name', value: selected.agency_name },
                      { label: 'Agency Contact', field: 'agency_contact', value: selected.agency_contact },
                    ].map(({ label, field, value }) => (
                      <div key={field} className="form-group">
                        <label className="form-label">{label}</label>
                        <input defaultValue={value || ''} onBlur={e => updateField(selected.id, field, e.target.value)} placeholder={label} />
                      </div>
                    ))}
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Placement</label>
                      <select defaultValue={selected.placement} onChange={e => updateField(selected.id, 'placement', e.target.value)}>
                        {['first_5_min', 'first_2_min', 'mid_roll', 'end', 'full_video'].map(p => (
                          <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Integration (sec)</label>
                      <input type="number" defaultValue={selected.integration_length_seconds || 60} onBlur={e => updateField(selected.id, 'integration_length_seconds', parseInt(e.target.value))} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Deal Value (Gross)</label>
                      <input type="number" defaultValue={selected.deal_value_gross || ''} onBlur={e => updateField(selected.id, 'deal_value_gross', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Deal Value (Net)</label>
                      <input type="number" defaultValue={selected.deal_value_net || ''} onBlur={e => updateField(selected.id, 'deal_value_net', parseFloat(e.target.value))} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">MVG (Min Views)</label>
                      <input type="number" defaultValue={selected.mvg || ''} onBlur={e => updateField(selected.id, 'mvg', parseInt(e.target.value) || null)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Exclusivity (days)</label>
                      <input type="number" defaultValue={selected.exclusivity_window_days || ''} onBlur={e => updateField(selected.id, 'exclusivity_window_days', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>

                  {selected.exclusivity_category && (
                    <div className="form-group">
                      <label className="form-label">Exclusivity Category</label>
                      <input defaultValue={selected.exclusivity_category || ''} onBlur={e => updateField(selected.id, 'exclusivity_category', e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              {/* Script Tab */}
              {detailTab === 'script' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Script Status</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {SCRIPT_STATUSES.map(status => (
                        <button
                          key={status}
                          className={`btn ${selected.script_status === status ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => updateField(selected.id, 'script_status', status)}
                        >
                          {status.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CTA + Promo Code highlight box */}
                  {(selected.promo_code || selected.tracking_link) && (
                    <div style={{
                      background: 'rgba(63,185,80,0.08)',
                      border: '1px solid rgba(63,185,80,0.3)',
                      borderRadius: 8, padding: 14,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 8, letterSpacing: '0.04em' }}>CTA &amp; PROMO</div>
                      {selected.promo_code && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Promo Code</span>
                          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{selected.promo_code}</span>
                        </div>
                      )}
                      {selected.tracking_link && (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                          <span>Link: </span><span style={{ color: 'var(--text)' }}>{selected.tracking_link}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Script preview (read-only view) */}
                  {selected.script_draft && (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: 16,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>SCRIPT</span>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: 10 }}
                          onClick={() => {
                            const el = document.getElementById('script-edit-area');
                            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                          }}
                        >
                          Edit
                        </button>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                        {selected.script_draft}
                      </div>
                    </div>
                  )}

                  {/* Editable script (hidden by default if script exists) */}
                  <div id="script-edit-area" style={{ display: selected.script_draft ? 'none' : 'block' }}>
                    <div className="form-group">
                      <label className="form-label">Script Draft</label>
                      <textarea rows={16} defaultValue={selected.script_draft || ''} onBlur={e => updateField(selected.id, 'script_draft', e.target.value)} placeholder="Write script here..." style={{ fontFamily: 'inherit', lineHeight: 1.6 }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brief Text</label>
                    <textarea rows={4} defaultValue={selected.brief_text || ''} onBlur={e => updateField(selected.id, 'brief_text', e.target.value)} placeholder="Paste brief here..." />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brief Link</label>
                    <input defaultValue={selected.brief_link || ''} onBlur={e => updateField(selected.id, 'brief_link', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              )}

              {/* Checklist Tab */}
              {detailTab === 'checklist' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Tracking link included', field: 'has_tracking_link', value: selected.has_tracking_link },
                      { label: 'Pinned comment posted', field: 'has_pinned_comment', value: selected.has_pinned_comment },
                      { label: 'QR code included', field: 'has_qr_code', value: selected.has_qr_code },
                    ].map(item => (
                      <label key={item.field} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <input
                          type="checkbox"
                          checked={!!item.value}
                          onChange={e => updateField(selected.id, item.field, e.target.checked ? 1 : 0)}
                          style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                        {item.value ? (
                          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>DONE</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>PENDING</span>
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tracking Link</label>
                    <input defaultValue={selected.tracking_link || ''} onBlur={e => updateField(selected.id, 'tracking_link', e.target.value)} placeholder="https://..." />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Promo Code</label>
                    <input defaultValue={selected.promo_code || ''} onBlur={e => updateField(selected.id, 'promo_code', e.target.value)} placeholder="ANDREW20" />
                  </div>
                </div>
              )}

              {/* Payment Tab */}
              {detailTab === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Payment breakdown */}
                  {(() => {
                    const breakdown = calcPaymentBreakdown(selected);
                    if (!breakdown) return (
                      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-dim)' }}>
                        Set a live date to calculate payment timeline.
                      </div>
                    );
                    const now = new Date();
                    const isOverduePayment = breakdown.youPaid < now && !selected.payment_received_date;
                    return (
                      <div style={{
                        background: isOverduePayment ? 'rgba(248,81,73,0.08)' : 'rgba(63,185,80,0.05)',
                        border: `1px solid ${isOverduePayment ? 'var(--red)' : 'var(--border)'}`,
                        borderRadius: 8, padding: 16,
                      }}>
                        <div className="section-label" style={{ marginBottom: 12 }}>Payment Timeline</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { label: `Published`, date: breakdown.live, color: 'var(--text)' },
                            { label: `Brand pays agency (${selected.payment_terms_brand_days}d)`, date: breakdown.brandPays, color: 'var(--blue)' },
                            { label: `Agency pays you (+${selected.payment_terms_agency_days}d)`, date: breakdown.youPaid, color: isOverduePayment ? 'var(--red)' : 'var(--green)' },
                          ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{item.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>
                                {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          ))}
                        </div>
                        {isOverduePayment && (
                          <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(248,81,73,0.1)', borderRadius: 6, fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>
                            Payment overdue — follow up now
                          </div>
                        )}
                        {selected.payment_received_date && (
                          <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(63,185,80,0.1)', borderRadius: 6, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                            Paid on {formatDate(selected.payment_received_date)}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* CPM Deal Calculator */}
                  {selected.deal_type === 'cpm' && (
                    <div style={{
                      background: 'rgba(163,113,247,0.05)',
                      border: '1px solid var(--accent)',
                      borderRadius: 8, padding: 16,
                    }}>
                      <div className="section-label" style={{ marginBottom: 12, color: 'var(--accent)' }}>CPM Deal Calculator</div>
                      <div className="grid-2" style={{ marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">CPM Rate ($)</label>
                          <input type="number" step="0.01" defaultValue={selected.cpm_rate || ''} onBlur={e => updateField(selected.id, 'cpm_rate', parseFloat(e.target.value))} placeholder="e.g. 17.50" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">CPM Cap (Gross $)</label>
                          <input type="number" defaultValue={selected.cpm_cap || ''} onBlur={e => updateField(selected.id, 'cpm_cap', parseFloat(e.target.value))} placeholder="e.g. 7000" />
                        </div>
                      </div>
                      <div className="grid-2" style={{ marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Live Views (Episode)</label>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {(selected.episode_view_count || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {selected.episode_view_count_updated_at
                              ? `Updated ${formatFullDate(selected.episode_view_count_updated_at)}`
                              : 'Update pending'}
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Views at 30 Days (Locked)</label>
                          <input type="number" defaultValue={selected.views_at_30_days || ''} onBlur={e => updateField(selected.id, 'views_at_30_days', parseInt(e.target.value) || 0)} placeholder="e.g. 250000" />
                        </div>
                      </div>

                      {(() => {
                        const cpmSnapshot = getCpmSnapshot(selected);
                        const liveViews = selected.episode_view_count || 0;
                        const cpmRate = selected.cpm_rate || 0;
                        const cpmCap = selected.cpm_cap || 0;
                        const liveCalc = calcCpmAmount(liveViews, cpmRate, cpmCap);
                        const lockedViews = selected.views_at_30_days || 0;
                        const lockedCalc = calcCpmAmount(lockedViews, cpmRate, cpmCap);
                        const canLock = !!selected.episode_id && liveViews > 0 && lockedViews === 0;
                        return (
                          <div style={{ background: 'var(--bg)', borderRadius: 6, padding: 12, border: '1px solid var(--border)' }}>
                            {/* Status row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {(() => {
                                  const pd = getPublishDate(selected);
                                  const d = pd ? Math.floor((Date.now() - pd.getTime()) / DAY_MS) : null;
                                  const fin = d !== null && d >= 30;
                                  return (
                                    <>
                                      {d !== null && (
                                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Day {d}</span>
                                      )}
                                      <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                                        background: fin ? 'rgba(63,185,80,0.15)' : 'rgba(230,162,60,0.15)',
                                        color: fin ? 'var(--green)' : 'var(--orange)',
                                      }}>
                                        {fin ? '✓ FINAL' : cpmSnapshot.daysLeft !== null ? `ACCRUING · ${cpmSnapshot.daysLeft}d left` : 'No publish date'}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: 11 }}
                                disabled={!canLock}
                                onClick={() => updateField(selected.id, 'views_at_30_days', liveViews)}
                              >
                                Lock Views
                              </button>
                            </div>

                            {/* Progress bar toward cap */}
                            {cpmCap > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                {(() => {
                                  const gross = lockedViews > 0 ? lockedCalc.gross : liveCalc.gross;
                                  const pct = Math.min((gross / cpmCap) * 100, 100);
                                  const hitCap = lockedViews > 0 ? lockedCalc.hitCap : liveCalc.hitCap;
                                  return (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                                        <span>Cap progress</span>
                                        <span style={{ fontWeight: 600, color: hitCap ? 'var(--green)' : 'var(--text)' }}>
                                          {pct.toFixed(0)}%{hitCap ? ' 🔒 Capped' : ''}
                                        </span>
                                      </div>
                                      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                                        <div style={{
                                          height: '100%',
                                          width: `${pct}%`,
                                          background: hitCap ? 'var(--green)' : 'var(--orange)',
                                          borderRadius: 3,
                                          transition: 'width 0.4s ease',
                                        }} />
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Earnings lines */}
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                              Live: {liveViews.toLocaleString()} views → {formatMoney(liveCalc.gross)} gross · {formatMoney(liveCalc.net)} net
                              {liveCalc.hitCap && <span style={{ color: 'var(--orange)', marginLeft: 6 }}>(capped)</span>}
                            </div>
                            {lockedViews > 0 ? (
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                                ✓ Final: {lockedViews.toLocaleString()} views → {formatMoney(lockedCalc.gross)} gross · {formatMoney(lockedCalc.net)} net
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                Lock views to confirm final amount
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Brand Pays (days)</label>
                      <input type="number" defaultValue={selected.payment_terms_brand_days || 30} onBlur={e => updateField(selected.id, 'payment_terms_brand_days', parseInt(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Agency Pays (days)</label>
                      <input type="number" defaultValue={selected.payment_terms_agency_days || 15} onBlur={e => updateField(selected.id, 'payment_terms_agency_days', parseInt(e.target.value))} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Invoice Amount</label>
                      <input type="number" defaultValue={selected.invoice_amount || ''} onBlur={e => updateField(selected.id, 'invoice_amount', parseFloat(e.target.value))} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Invoice Date</label>
                      <input type="date" defaultValue={selected.invoice_date || ''} onBlur={e => updateField(selected.id, 'invoice_date', e.target.value || null)} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Payment Due</label>
                      <input type="date" defaultValue={selected.payment_due_date || ''} onBlur={e => updateField(selected.id, 'payment_due_date', e.target.value || null)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Received</label>
                      <input type="date" defaultValue={selected.payment_received_date || ''} onBlur={e => updateField(selected.id, 'payment_received_date', e.target.value || null)} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Deal Value (Gross)</label>
                      <input type="number" defaultValue={selected.deal_value_gross || ''} onBlur={e => updateField(selected.id, 'deal_value_gross', parseFloat(e.target.value))} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Deal Value (Net)</label>
                      <input type="number" defaultValue={selected.deal_value_net || ''} onBlur={e => updateField(selected.id, 'deal_value_net', parseFloat(e.target.value))} placeholder="0" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Sponsor Modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New Sponsor</h2>
            <div className="form-group">
              <label className="form-label">Brand Name *</label>
              <input value={newForm.brand_name} onChange={e => setNewForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="Brand name" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Deal Type</label>
                <select value={newForm.deal_type} onChange={e => setNewForm(f => ({ ...f, deal_type: e.target.value }))}>
                  <option value="flat_rate">Flat Rate</option>
                  <option value="cpm">CPM</option>
                  <option value="full_video">Full Video</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stage</label>
                <select
                  value={newForm.stage}
                  onChange={e => {
                    const stage = e.target.value;
                    setNewForm(f => ({ ...f, stage, sub_status: normalizeSubStatus(stage, f.sub_status) }));
                  }}
                >
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Deal Value (Gross)</label>
                <input type="number" value={newForm.deal_value_gross} onChange={e => setNewForm(f => ({ ...f, deal_value_gross: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input value={newForm.contact_name} onChange={e => setNewForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Contact name" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Agency</label>
              <input value={newForm.agency_name} onChange={e => setNewForm(f => ({ ...f, agency_name: e.target.value }))} placeholder="Agency name (optional)" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createSponsor}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
