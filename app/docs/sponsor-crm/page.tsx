'use client';

import { FileText, DollarSign, Clock, Mail, Zap, Database } from 'lucide-react';

export default function SponsorCrmPage() {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 10, 
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileText size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Sponsor CRM Rules</h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
              How the sponsorship pipeline works
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)' }}>●</span> Pipeline Stages
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { stage: 'Leads', desc: 'Initial inquiry or negotiation', color: '#8b949e' },
            { stage: 'Contracted', desc: 'Contract signed, awaiting brief', color: 'var(--blue)' },
            { stage: 'Content', desc: 'Brief → Script → Filming → Review', color: 'var(--orange)' },
            { stage: 'Published', desc: 'Video is live', color: 'var(--green)' },
            { stage: 'Invoiced', desc: 'Invoice sent, awaiting payment', color: 'var(--blue)' },
            { stage: 'Paid', desc: 'Complete ✓', color: 'var(--green)' },
          ].map(s => (
            <div key={s.stage} style={{ 
              background: 'var(--card)', border: '1px solid var(--border)', 
              borderRadius: 8, padding: 12,
              borderLeft: `3px solid ${s.color}`
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.stage}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Content Sub-Stages */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--orange)' }}>●</span> Content Sub-Stages
        </h2>
        <div style={{ 
          background: 'var(--card)', border: '1px solid var(--border)', 
          borderRadius: 8, padding: 16 
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Brief Received', 'Script Writing', 'Script Submitted', 'Script Approved', 'Filming', 'Brand Review'].map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ 
                  width: 20, height: 20, borderRadius: '50%', 
                  background: 'var(--border)', color: 'var(--text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600
                }}>{i + 1}</span>
                <span style={{ fontSize: 12 }}>{step}</span>
                {i < 5 && <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deal Types & CPM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} style={{ color: 'var(--green)' }} /> Deal Types
          </h2>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            {[
              { type: 'Flat Rate', desc: 'Fixed fee, paid after video goes live' },
              { type: 'CPM', desc: 'Paid per 1,000 views (usually capped)' },
              { type: 'Full Video', desc: 'Brand sponsors entire video (rare)' },
            ].map(d => (
              <div key={d.type} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>{d.type}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: 'var(--orange)' }} /> CPM Calculation
          </h2>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <pre style={{ 
              background: 'var(--bg)', padding: 12, borderRadius: 6, 
              fontSize: 11, margin: 0, overflow: 'auto',
              border: '1px solid var(--border)'
            }}>
{`gross = min(views ÷ 1000 × rate, cap)
net   = gross × 0.8  (20% agency)`}
            </pre>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
              Views locked at <strong>30 days</strong> post-publish for invoicing.
            </div>
          </div>
        </section>
      </div>

      {/* Payment Timeline */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} style={{ color: 'var(--blue)' }} /> Payment Timeline
        </h2>
        <div style={{ 
          background: 'var(--card)', border: '1px solid var(--border)', 
          borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 12
        }}>
          {[
            { label: 'Video Publishes', days: '0' },
            { label: 'Brand → Agency', days: '+30d' },
            { label: 'Agency → You', days: '+15d' },
            { label: 'Total', days: '~45d', highlight: true },
          ].map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: 14, fontWeight: 700, 
                  color: step.highlight ? 'var(--green)' : 'var(--text)'
                }}>{step.days}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{step.label}</div>
              </div>
              {i < 3 && <span style={{ color: 'var(--text-dim)' }}>→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Email Workflow */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={16} style={{ color: 'var(--accent)' }} /> Email Workflow
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong>1.</strong> Andrew forwards sponsor emails to <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>montythehandler@gmail.com</code>
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>2.</strong> Monty checks <strong>3× daily</strong> (7am, 1pm, 6pm)
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>3.</strong> Extracts: brand, stage, value, deadlines, deliverables
            </p>
            <p style={{ margin: 0 }}>
              <strong>4.</strong> Dashboard updated automatically
            </p>
          </div>
        </div>
      </section>

      {/* Auto-Detection */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} style={{ color: 'var(--green)' }} /> Video Auto-Detection
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong>Daily sync</strong> checks Andrew's YouTube channel (last 2 weeks)
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>Matching:</strong> Looks for brand name in <strong>description</strong> and <strong>pinned comment</strong>
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>View counts</strong> updated daily for all linked videos
            </p>
            <p style={{ margin: 0 }}>
              <strong>30-day lock</strong> triggers invoice-ready alert
            </p>
          </div>
        </div>
      </section>

      {/* Database */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={16} style={{ color: 'var(--text-dim)' }} /> Data Architecture
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <strong style={{ color: 'var(--text)' }}>Single source of truth:</strong> <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>production-hub.db</code>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>episodes</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Videos, view counts, YouTube IDs</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>sponsors</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Deals, linked to episodes via episode_id</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
