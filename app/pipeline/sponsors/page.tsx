'use client';

import { useEffect, useState } from 'react';
import { Plus, DollarSign, Calendar, AlertCircle, X, ChevronRight } from 'lucide-react';

interface Sponsor {
  id: number; brand_name: string; stage: string;
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
  offer_date: string; contract_date: string; episode_id: number | null;
  cpm_rate: number | null; cpm_cap: number | null; mvg: number | null;
}

interface Alert {
  id: string; severity: 'red' | 'yellow'; message: string;
  sponsorId: number; brandName: string;
}

const STAGES = [
  { key: 'inquiry', label: 'Inquiry', color: '#8b949e' },
  { key: 'negotiation', label: 'Negotiation', color: 'var(--blue)' },
  { key: 'contract', label: 'Contract', color: 'var(--blue)' },
  { key: 'brief_received', label: 'Brief Received', color: 'var(--accent)' },
  { key: 'script_writing', label: 'Script Writing', color: 'var(--orange)' },
  { key: 'script_submitted', label: 'Script Submitted', color: 'var(--orange)' },
  { key: 'script_approved', label: 'Script Approved', color: 'var(--green)' },
  { key: 'filming', label: 'Filming', color: 'var(--accent)' },
  { key: 'brand_review', label: 'Brand Review', color: 'var(--orange)' },
  { key: 'live', label: 'Live', color: 'var(--green)' },
  { key: 'invoiced', label: 'Invoiced', color: 'var(--blue)' },
  { key: 'paid', label: 'Paid', color: 'var(--green)' },
];

const SCRIPT_STATUSES = ['not_started', 'drafting', 'submitted', 'revision_1', 'revision_2', 'revision_3', 'approved'];

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(d: string) {
  return d && new Date(d) < new Date();
}

function calcPaymentBreakdown(sponsor: Sponsor) {
  const liveDate = sponsor.live_date;
  if (!liveDate) return null;
  const live = new Date(liveDate);
  const brandPays = new Date(live.getTime() + (sponsor.payment_terms_brand_days || 30) * 86400000);
  const youPaid = new Date(brandPays.getTime() + (sponsor.payment_terms_agency_days || 15) * 86400000);
  return { live, brandPays, youPaid };
}

type DetailTab = 'overview' | 'script' | 'checklist' | 'payment';

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selected, setSelected] = useState<Sponsor | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({ brand_name: '', deal_type: 'flat_rate', deal_value_gross: '', stage: 'inquiry', contact_name: '', agency_name: '' });

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
    await fetch(`/api/sponsors/${dragging}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    setSponsors(prev => prev.map(s => s.id === dragging ? { ...s, stage } : s));
    if (selected?.id === dragging) setSelected(prev => prev ? { ...prev, stage } : prev);
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

  const createSponsor = async () => {
    if (!newForm.brand_name) return;
    const gross = parseFloat(newForm.deal_value_gross) || 0;
    await fetch('/api/sponsors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, deal_value_gross: gross, deal_value_net: gross * 0.8 }),
    });
    setShowNew(false);
    setNewForm({ brand_name: '', deal_type: 'flat_rate', deal_value_gross: '', stage: 'inquiry', contact_name: '', agency_name: '' });
    load();
  };

  const pipelineValue = sponsors.filter(s => s.stage !== 'paid').reduce((acc, s) => acc + (s.deal_value_net || 0), 0);
  const paidYTD = sponsors.filter(s => s.stage === 'paid').reduce((acc, s) => acc + (s.deal_value_net || 0), 0);
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
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={14} /> New Sponsor
        </button>
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
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1, paddingBottom: 16 }}>
        {STAGES.map(stage => {
          const stageSponsors = sponsors.filter(s => s.stage === stage.key);
          const isOver = dragOver === stage.key;
          const stageValue = stageSponsors.reduce((acc, s) => acc + (s.deal_value_net || 0), 0);
          return (
            <div
              key={stage.key}
              className="kanban-col"
              style={{
                minWidth: 190, maxWidth: 215, flex: '0 0 200px',
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
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{sp.brand_name}</div>
                    {sp.deal_value_net > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <DollarSign size={9} /> ${sp.deal_value_net.toLocaleString(undefined, { maximumFractionDigits: 0 })} net
                      </div>
                    )}
                    {sp.deal_type !== 'flat_rate' && (
                      <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 3, fontWeight: 600 }}>
                        {sp.deal_type.toUpperCase().replace('_', ' ')}
                      </div>
                    )}
                    {sp.script_due && (
                      <div style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, color: isOverdue(sp.script_due) ? 'var(--red)' : 'var(--text-dim)' }}>
                        {isOverdue(sp.script_due) && <AlertCircle size={9} />}
                        <Calendar size={9} /> Script: {formatDate(sp.script_due)}
                      </div>
                    )}
                    {sp.payment_due_date && !sp.payment_received_date && (
                      <div style={{ fontSize: 10, color: isOverdue(sp.payment_due_date) ? 'var(--red)' : 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        {isOverdue(sp.payment_due_date) && <AlertCircle size={9} />}
                        <DollarSign size={9} /> Pay: {formatDate(sp.payment_due_date)}
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
                <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setSelected(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="tab-bar" style={{ borderBottom: 'none', marginBottom: 0 }}>
                {(['overview', 'script', 'checklist', 'payment'] as DetailTab[]).map(t => (
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
                  <div className="grid-2">
                    {[
                      { label: 'Offer Date', field: 'offer_date', value: selected.offer_date, type: 'date' },
                      { label: 'Contract Date', field: 'contract_date', value: selected.contract_date, type: 'date' },
                      { label: 'Script Due', field: 'script_due', value: selected.script_due, type: 'date' },
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

                  <div className="form-group">
                    <label className="form-label">Move Stage</label>
                    <select value={selected.stage} onChange={e => updateField(selected.id, 'stage', e.target.value).then(() => refreshSelected(selected.id))}>
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Next Action</label>
                    <input defaultValue={selected.next_action || ''} onBlur={e => updateField(selected.id, 'next_action', e.target.value)} placeholder="What needs to happen next?" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Action Due</label>
                    <input type="date" defaultValue={selected.next_action_due || ''} onBlur={e => updateField(selected.id, 'next_action_due', e.target.value || null)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea rows={4} defaultValue={selected.notes || ''} onBlur={e => updateField(selected.id, 'notes', e.target.value)} placeholder="Notes..." />
                  </div>
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

                  <div className="form-group">
                    <label className="form-label">Brief Text</label>
                    <textarea rows={4} defaultValue={selected.brief_text || ''} onBlur={e => updateField(selected.id, 'brief_text', e.target.value)} placeholder="Paste brief here..." />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brief Link</label>
                    <input defaultValue={selected.brief_link || ''} onBlur={e => updateField(selected.id, 'brief_link', e.target.value)} placeholder="https://..." />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Script Draft</label>
                    <textarea rows={12} defaultValue={selected.script_draft || ''} onBlur={e => updateField(selected.id, 'script_draft', e.target.value)} placeholder="Write script here..." style={{ fontFamily: 'inherit', lineHeight: 1.6 }} />
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
                <select value={newForm.stage} onChange={e => setNewForm(f => ({ ...f, stage: e.target.value }))}>
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
