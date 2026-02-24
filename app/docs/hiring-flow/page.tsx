'use client';

import { Users, Mail, FileText, Zap, Clock, ClipboardCheck, Star, MessageSquare, Video, UserCheck, XCircle, Bot, User } from 'lucide-react';

export default function HiringFlowPage() {
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
            <Users size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Content Ops Manager Flow Rules</h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
              How the hiring pipeline works
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
            { stage: 'Applied', desc: 'Raw applications, database populated', color: 'var(--blue)' },
            { stage: 'Contacted', desc: 'Sent initial "interested in a trial?" message on OJP', color: 'var(--orange)' },
            { stage: 'Trial Sent', desc: 'Emailed the actual trial task brief', color: '#a371f7' },
            { stage: 'Evaluation', desc: 'Trial submitted, being scored', color: 'var(--blue)' },
            { stage: 'Interview', desc: 'Scheduled/completed Google Meet', color: 'var(--orange)' },
            { stage: 'Hired', desc: 'Paid trial week started', color: 'var(--green)' },
            { stage: 'Rejected', desc: 'Dropped at any stage', color: '#8b949e' },
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

      {/* Stage 1: Application Received */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardCheck size={16} style={{ color: 'var(--blue)' }} /> Stage 1: Application Received
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 8px' }}>
              Candidate applies on <strong>OnlineJobs.ph</strong>. We immediately scrape their profile and populate our database.
            </p>
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--text)' }}>Data captured:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Name', 'Location', 'Rate', 'Experience', 'Skills', 'Education', 'AP Score', 'Application Message'].map(item => (
                <span key={item} style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)',
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stage 2: Initial Outreach */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} style={{ color: 'var(--orange)' }} /> Stage 2: Initial Outreach
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
            Sent via OJP messaging to gauge interest before sending the trial.
          </div>
          <pre style={{
            background: 'var(--bg)', padding: 12, borderRadius: 6,
            fontSize: 11, margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap',
            border: '1px solid var(--border)', lineHeight: 1.7
          }}>
{`Hey [First Name],

Thanks for getting in touch about the Content Operations Manager role. I checked out your profile and your background looks interesting.

I've got a short trial task that takes about 30 minutes. It's a good way for both of us to figure out if this is the right fit.

If you're keen, send me an email at montythehandler@gmail.com (cc andrew@fraser.vn) and I'll send you the details.

Cheers,
Monty
Team & Operations
Andrew Fraser | YouTube
montythehandler@gmail.com`}
          </pre>
        </div>
      </section>

      {/* Stage 3: Trial Task Sent */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} style={{ color: '#a371f7' }} /> Stage 3: Trial Task Sent
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
            Sent via email with the trial task PDF attached.
          </div>
          <pre style={{
            background: 'var(--bg)', padding: 12, borderRadius: 6,
            fontSize: 11, margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap',
            border: '1px solid var(--border)', lineHeight: 1.7
          }}>
{`Subject: Content Operations Manager role (YouTube) — trial task

Hey [First Name],

Good to hear from you. I've attached the trial task as a PDF. Here's the channel so you can get a feel for what we do: https://www.youtube.com/@Andrew_Fraser

Should take about 30 minutes. I'm mainly looking at how you research and how you put things together. There's no right answer, just do it the way you'd naturally approach it.

48 hours would be ideal but let me know if you need more time.

Cheers,
Monty
Team & Operations
Andrew Fraser | YouTube
montythehandler@gmail.com`}
          </pre>

          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Trial Task (PDF Content)</div>
          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, lineHeight: 1.8, color: 'var(--text)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Pre-Production Trial Task</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Content Idea Discovery Task</div>

            <p>Hey,</p>
            <p>Thanks for applying — we&apos;re excited to learn more about you through this task.</p>
            <p>We want to see how you think about content. Specifically, can you find things that make people stop scrolling and go &quot;wait, what is that?&quot;</p>
            <p><strong>Your task is simple: find 4 content ideas that genuinely excite you.</strong> For each one, track down a real TikTok, Instagram post, or image that inspired it and share it with us.</p>
            <p>The only rule is that it has to clear at least one of these bars — it&apos;s otherworldly, has a serious wow factor, makes you want to show someone next to you, or it&apos;s something fascinating about food or culture that most people have never seen.</p>

            <p><strong>For each idea, tell us:</strong></p>
            <div style={{ paddingLeft: 12, marginBottom: 8 }}>
              <div>1. <strong>What is it?</strong> Just describe it simply — what are we looking at?</div>
              <div>2. <strong>Why would this stop someone mid-scroll?</strong> This is the big one. What&apos;s the hook? Why does it matter? Why would someone share it?</div>
              <div>3. <strong>The post or image</strong> that made you think of it — a link or screenshot is fine.</div>
            </div>

            <p>Generic travel content isn&apos;t what we&apos;re after. We want the hidden, the bizarre, the beautiful, the &quot;how does this even exist&quot; stuff.</p>
            <p>Drop everything into a Google Doc and send the link to montythehandler@gmail.com within two days.</p>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Bonus Points</div>
              <div style={{ paddingLeft: 8 }}>
                <div>• Ideas we&apos;ve never seen done on YouTube before</div>
                <div>• Ideas that genuinely get us excited — the kind that make us say &apos;we HAVE to film this&apos;</div>
                <div>• Ideas that clearly fit the style of the channel — otherworldly, extreme, at the intersection of food and culture</div>
                <div>• It&apos;s something incredibly unique that most people have never heard of — and there&apos;s a genuine story behind it</div>
              </div>
              <div style={{ marginTop: 8, fontStyle: 'italic', color: 'var(--text-dim)' }}>These aren&apos;t requirements, but they&apos;ll make your submission stand out.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stage 4: Evaluation */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={16} style={{ color: 'var(--blue)' }} /> Stage 4: Evaluation
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
            Score each submission 1-10. Score is visible on the kanban card.
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <div key={n} style={{
                  width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: n <= 7 ? 'var(--bg)' : 'var(--bg)', border: '1px solid var(--border)',
                  fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
                }}>{n}</div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>
              <span style={{ color: '#f85149' }}>1-3</span>{' / '}
              <span style={{ color: '#d29922' }}>4-6</span>{' / '}
              <span style={{ color: '#3fb950' }}>7-10</span>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Bonus Points</div>
          <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 16 }}>
            {[
              "Ideas we've never seen done on YouTube before",
              "Ideas that genuinely get us excited -- the kind that make us say 'we HAVE to film this'",
              "Ideas that clearly fit the style of the channel -- otherworldly, extreme, at the intersection of food and culture",
              "It's something incredibly unique that most people have never heard of -- and there's a genuine story behind it",
            ].map((b, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text)', marginBottom: 6, display: 'flex', gap: 6 }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
                <span>{b}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Follow-up Messages</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--orange)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>No submission received</div>
            <pre style={{
              background: 'var(--bg)', padding: 10, borderRadius: 6,
              fontSize: 11, margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap',
              border: '1px solid var(--border)', lineHeight: 1.6
            }}>
{`Hey [First Name], just checking in on the trial task. If you've been busy that's totally fine, I can push the deadline a few days. Let me know either way.`}
            </pre>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>After submission</div>
            <pre style={{
              background: 'var(--bg)', padding: 10, borderRadius: 6,
              fontSize: 11, margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap',
              border: '1px solid var(--border)', lineHeight: 1.6
            }}>
{`Hey [First Name], got your submission. Thanks for doing that. I'll go through everything over the next few days and get back to you.`}
            </pre>
          </div>
        </div>
      </section>

      {/* Stage 5: Interview */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Video size={16} style={{ color: 'var(--orange)' }} /> Stage 5: Interview
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 12 }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong>Google Meet</strong>, 20–30 min.
            </p>
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--text)' }}>Focus areas:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {['Personality', 'Channel Interest', 'Availability', 'Tech Setup', 'Questions They Ask'].map(item => (
                <span key={item} style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)',
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--orange)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sample invite</div>
          <pre style={{
            background: 'var(--bg)', padding: 12, borderRadius: 6,
            fontSize: 11, margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap',
            border: '1px solid var(--border)', lineHeight: 1.7
          }}>
{`Subject: Content Operations Manager role (YouTube) — quick video chat

Hey [First Name],

Your trial task was really good. I'd like to do a quick video call so we can talk a bit more about the role and I can get to know you better.

Would any of these times work for a 20-30 min Google Meet?
- [Time 1]
- [Time 2]
- [Time 3]

If not, just tell me what works for you and we'll sort something out.`}
          </pre>
        </div>
      </section>

      {/* Stage 6: Hired */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={16} style={{ color: 'var(--green)' }} /> Stage 6: Hired (Paid Trial Week)
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Offer message</div>
          <pre style={{
            background: 'var(--bg)', padding: 12, borderRadius: 6,
            fontSize: 11, margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap',
            border: '1px solid var(--border)', lineHeight: 1.7, marginBottom: 12
          }}>
{`Subject: Let's do a trial week

Hey [First Name],

Really enjoyed the call. I think this could work well.

1-week paid trial starting [Date]. I'll send tasks each morning and we'll do a quick check-in at the end of each day. Rate is [dollar/hr] as we discussed.

It's a two-way thing. If it works for both of us, we keep going. If not, no hard feelings.

If that sounds good, I'll send over the onboarding doc and we can get started.`}
          </pre>

          <div style={{ fontSize: 10, fontWeight: 600, color: '#f85149', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>If it doesn&apos;t work out</div>
          <pre style={{
            background: 'var(--bg)', padding: 12, borderRadius: 6,
            fontSize: 11, margin: 0, overflow: 'auto', whiteSpace: 'pre-wrap',
            border: '1px solid var(--border)', lineHeight: 1.7
          }}>
{`Hey [First Name], thanks for putting in the work this week. I've decided to go a different direction for this role, but I appreciate the effort. Wishing you well with everything.`}
          </pre>
        </div>
      </section>

      {/* Automation */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} style={{ color: 'var(--accent)' }} /> Automation (Unified Hiring Pipeline Job)
        </h2>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
            One automated job runs <strong style={{ color: 'var(--text)' }}>every 2 hours</strong> on <strong style={{ color: 'var(--text)' }}>Sonnet</strong>, 5 steps:
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong>1.</strong> <strong style={{ color: 'var(--blue)' }}>New OJP applicants</strong> — Checks OJP, adds to DB, sends outreach
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>2.</strong> <strong style={{ color: 'var(--orange)' }}>Email replies</strong> — Checks <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>montythehandler@gmail.com</code>, sends trial task PDF
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>3.</strong> <strong style={{ color: '#a371f7' }}>Trial submissions</strong> — Marks as evaluation, notifies Andrew
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong>4.</strong> <strong style={{ color: 'var(--orange)' }}>Overdue follow-ups</strong> — Sends one gentle follow-up after 48h
            </p>
            <p style={{ margin: 0 }}>
              <strong>5.</strong> <strong style={{ color: 'var(--green)' }}>Pipeline summary</strong> — Reports to Andrew
            </p>
          </div>
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 6,
            background: 'var(--bg)', border: '1px solid var(--border)',
            fontSize: 11, color: 'var(--text-dim)'
          }}>
            <strong style={{ color: 'var(--text)' }}>Email:</strong>{' '}
            <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>montythehandler@gmail.com</code>
            {' '}(candidates cc{' '}
            <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>andrew@fraser.vn</code>)
          </div>
        </div>
      </section>

      {/* Responsibilities Split */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} style={{ color: 'var(--text-dim)' }} /> Responsibilities
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Bot size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Monty (automated)</span>
            </div>
            {[
              'Populate DB from OJP',
              'Send OJP messages',
              'Monitor email inbox',
              'Send trial briefs',
              'Track deadlines',
              'Score submissions',
              'Update Kanban',
              'Notify Andrew',
            ].map(task => (
              <div key={task} style={{
                fontSize: 11, padding: '4px 0',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-dim)'
              }}>
                {task}
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <User size={14} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Andrew (human)</span>
            </div>
            {[
              'Review top trial submissions',
              'Interview on Google Meet',
              'Hire decision',
              'Run paid trial week',
              'Approve message templates',
            ].map(task => (
              <div key={task} style={{
                fontSize: 11, padding: '4px 0',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-dim)'
              }}>
                {task}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
