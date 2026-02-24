'use client';

import { Users, Mail, Film, Star, MessageSquare, Video, UserCheck, XCircle, Bot, User, Briefcase } from 'lucide-react';

export default function JuniorEditorFlowPage() {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #2f9e44 0%, #1971c2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Film size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Junior Editor Hiring Flow</h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
              Portfolio-based screening — no trial task
            </p>
          </div>
        </div>
      </div>

      {/* Key Differences */}
      <section style={{ marginBottom: 32, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>
          Key Differences vs Content Ops Manager
        </h3>
        <ul style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
          <li><strong>No trial task</strong> — the portfolio IS the screening</li>
          <li><strong>Email-first</strong> — VietnamWorks candidates email in directly, no platform messaging needed</li>
          <li><strong>Dual source</strong> — VietnamWorks + OnlineJobs.ph both funnel into the same pipeline</li>
          <li><strong>Shorter pipeline</strong> — 5 stages instead of 6</li>
        </ul>
      </section>

      {/* Pipeline Stages */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)' }}>●</span> Pipeline Stages
        </h2>

        {/* Stage 1 */}
        <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#58a6ff25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={13} color="#58a6ff" />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 1: Application Received</h3>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#58a6ff18', color: '#58a6ff', fontWeight: 600 }}>
              applied
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <p><strong>Sources:</strong></p>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>VietnamWorks</strong> — candidate applies, email arrives at montythehandler@gmail.com</li>
              <li><strong>OnlineJobs.ph</strong> — Monty scrapes profile from OJP (name, rate, skills, experience)</li>
            </ul>
            <p>Both sources funnel into the same pipeline. Candidate is added to the database.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#58a6ff', fontSize: 11, fontWeight: 600 }}>
              <Bot size={12} /> Automated — Monty handles this
            </div>
          </div>
        </div>

        {/* Stage 2 */}
        <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#d2992225', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={13} color="#d29922" />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 2: Portfolio Requested</h3>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#d2992218', color: '#d29922', fontWeight: 600 }}>
              contacted
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <p>Monty replies by email asking for their portfolio, reel, or any video work they can share.</p>
            <p><strong>If no response after 48hrs:</strong> One follow-up email asking for any work samples — even a single video they&apos;ve edited.</p>
            <p><strong>Still no response:</strong> Move to rejected.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#58a6ff', fontSize: 11, fontWeight: 600 }}>
              <Bot size={12} /> Automated — Monty handles outreach + follow-ups
            </div>
          </div>
        </div>

        {/* Stage 3 */}
        <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#2f9e4425', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={13} color="#2f9e44" />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 3: Portfolio Review</h3>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#2f9e4418', color: '#2f9e44', fontWeight: 600 }}>
              evaluation
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <p><strong>Andrew grades the portfolio.</strong> Scoring:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Technical editing skill</strong> — /5</li>
              <li><strong>Creativity &amp; style</strong> — /5</li>
              <li><strong>Relevance to channel</strong> — /5</li>
            </ul>
            <p>Total: /15. Top scorers advance to interview.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d29922', fontSize: 11, fontWeight: 600 }}>
              <User size={12} /> Manual — Andrew reviews
            </div>
          </div>
        </div>

        {/* Stage 4 */}
        <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#d2992225', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={13} color="#d29922" />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 4: Interview</h3>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#d2992218', color: '#d29922', fontWeight: 600 }}>
              interview
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <p>20-30 min Google Meet with Andrew. Focus on:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li>Editing workflow &amp; process</li>
              <li>Software proficiency (Premiere, DaVinci, CapCut, etc.)</li>
              <li>Availability &amp; rate</li>
              <li>Personality &amp; communication style</li>
            </ul>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d29922', fontSize: 11, fontWeight: 600 }}>
              <User size={12} /> Manual — Andrew interviews
            </div>
          </div>
        </div>

        {/* Stage 5 */}
        <div style={{ marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#3fb95025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={13} color="#3fb950" />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Stage 5: Hired</h3>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#3fb95018', color: '#3fb950', fontWeight: 600 }}>
              hired
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <p>1-week paid trial with real editing tasks from the channel. Daily check-ins.</p>
          </div>
        </div>
      </section>

      {/* Email Templates */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--blue)' }}>●</span> Email Templates
        </h2>

        <div style={{ marginBottom: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Initial Portfolio Request</h3>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`Hey [First Name],

Thanks for applying for the Junior Editor role. I checked out your profile and your background looks interesting.

Do you have a portfolio, showreel, or any video work you could share? Even a single video you've edited would be great — I just want to get a feel for your editing style.

You can send links or files to this email.

Cheers,
Monty
Team & Operations
Andrew Fraser | YouTube
montythehandler@gmail.com`}
          </div>
        </div>

        <div style={{ marginBottom: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Follow-up (48hrs, no response)</h3>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, background: 'var(--bg)', borderRadius: 8, padding: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`Hey [First Name],

Just following up on the Junior Editor role. Do you have any work you could share? It doesn't need to be a full portfolio — even a video you've worked on or a YouTube link would be fine.

Let me know either way.

Cheers,
Monty`}
          </div>
        </div>
      </section>

      {/* Back link */}
      <div style={{ textAlign: 'center', paddingTop: 16 }}>
        <a href="/hiring" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
          ← Back to Hiring Board
        </a>
      </div>
    </div>
  );
}
