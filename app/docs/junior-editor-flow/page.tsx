'use client';

import { Users, Mail, Film, Star, Video, UserCheck, Bot, User, Briefcase } from 'lucide-react';

export default function JuniorEditorFlowPage() {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #2f9e44 0%, #1971c2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Junior Video Editor — Hiring Flow</h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Portfolio-based screening · No trial task</p>
          </div>
        </div>
      </div>

      {/* Key Differences */}
      <section style={{ marginBottom: 32, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>How This Differs from Content Ops</h3>
        <ul style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>
          <li><strong>No trial task</strong> — the submitted work IS the screening</li>
          <li><strong>VietnamWorks fast-track</strong> — VW applicants include work in their application and go straight to Portfolio Review</li>
          <li><strong>OJP applicants always get the email ask</strong> — no auto-advance on portfolio links in application</li>
          <li><strong>Shorter pipeline</strong> — 4 active stages</li>
        </ul>
      </section>

      {/* Stage 1 */}
      <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#58a6ff25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={13} color="#58a6ff" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 1 — Application Received</h3>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#58a6ff18', color: '#58a6ff', fontWeight: 600 }}>applied</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}>OJP: Scout scrapes profile (name, rate, experience). VietnamWorks: email notification arrives. Both added to DB.</p>
          <p style={{ margin: '0 0 8px' }}><strong>VietnamWorks fast-track:</strong> If the application includes video work, move straight to Portfolio Review.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#58a6ff', fontSize: 11, fontWeight: 600 }}><Bot size={12} /> Automated</div>
        </div>
      </div>

      {/* Stage 2 */}
      <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#d2992225', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={13} color="#d29922" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 2 — Portfolio Requested</h3>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#d2992218', color: '#d29922', fontWeight: 600 }}>contacted</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}><strong>OJP applicants only.</strong> Scout emails asking for their best piece of long-form or documentary work. Failing that, the short they think best reflects story in an edit.</p>
          <p style={{ margin: '0 0 8px' }}><strong>48h no reply:</strong> One follow-up. <strong>7 days total silence:</strong> Auto-rejected.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#58a6ff', fontSize: 11, fontWeight: 600 }}><Bot size={12} /> Automated</div>
        </div>

        <div style={{ marginTop: 12, background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.5, marginBottom: 6 }}>INITIAL OUTREACH</div>
{`Subject: Junior Video Editor (YouTube) — Work Samples

Hi [First Name],

Thanks for applying. We've got a lot of applications, so we'd really love to see your best piece of work.

Could you please send us a link to your best piece of long-form or documentary editing? If you don't have that, the short work you think best reflects your storytelling in an edit.

A link is fine — YouTube, Vimeo, Drive, whatever you have.

Thanks,
Monty`}
        </div>
        <div style={{ marginTop: 8, background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.5, marginBottom: 6 }}>FOLLOW-UP (48h no reply)</div>
{`Subject: Re: Junior Video Editor (YouTube) — Work Samples

Hey [First Name],

Just following up — do you have any editing work you could share?

Doesn't need to be a full reel. Even one video you've worked on is fine.

Monty`}
        </div>
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-dim)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>7 DAYS NO REPLY</span>
          {' '}— Silent auto-reject. No email sent. Moved to Rejected in the pipeline.
        </div>
      </div>

      {/* Stage 3 */}
      <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#a371f725', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={13} color="#a371f7" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 3 — Portfolio Review</h3>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#a371f718', color: '#a371f7', fontWeight: 600 }}>evaluation</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}>Click the card → opens to the grading tab. Shows <strong>Submitted Work</strong> and <strong>Initial Application</strong> links separately.</p>
          <p style={{ margin: '0 0 8px' }}>Score 1–10. <strong>≥ 4 → auto-promotes to Interview. &lt; 4 → auto-rejects.</strong></p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d29922', fontSize: 11, fontWeight: 600 }}><User size={12} /> Andrew grades</div>
        </div>
        <div style={{ marginTop: 12, background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.5, marginBottom: 6 }}>REJECTION (score &lt; 4)</div>
{`Subject: Junior Video Editor (YouTube) — Application Update

Hi [First Name],

Thanks for sending your work through. We've reviewed it and we're going to pass at this stage.

We'll keep your details on file.

Monty`}
        </div>
      </div>

      {/* Stage 4 */}
      <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#d2992225', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Video size={13} color="#d29922" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 4 — Interview</h3>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#d2992218', color: '#d29922', fontWeight: 600 }}>interview</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}>Candidate moves here after portfolio is approved. Open the card → Interview tab → hit <strong>Send Invite</strong> to fire the scheduling email (if not already sent).</p>
          <p style={{ margin: '0 0 8px' }}>15-min Google Meet with Andrew. After the call, record ratings + notes on the Interview tab. Drag to Hired or Rejected.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d29922', fontSize: 11, fontWeight: 600 }}><User size={12} /> Andrew interviews</div>
        </div>
        <div style={{ marginTop: 12, background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
{`Subject: Junior Video Editor (YouTube) — Interview

Hi [First Name],

We've reviewed your portfolio and we'd like to move forward to interview.

Book a 15-minute slot with Andrew here:
https://calendar.app.google/4bSX3LMkYXo8XV6N9

Monty`}
        </div>
      </div>

      {/* Stage 5 */}
      <div style={{ marginBottom: 32, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#3fb95025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={13} color="#3fb950" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 5 — Hired (Probation)</h3>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#3fb95018', color: '#3fb950', fontWeight: 600 }}>hired</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>Tracking only. Drag here when you've decided to hire. No automated actions — probation management is manual.</p>
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <a href="/hiring/editors" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Back to Editor Board</a>
      </div>
    </div>
  );
}
