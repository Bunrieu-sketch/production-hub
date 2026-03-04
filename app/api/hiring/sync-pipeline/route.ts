import { NextResponse } from 'next/server';
import { getDb, logActivity } from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

const FROM_ACCOUNT = 'montythehandler@gmail.com';
const CC_ADDRESS = 'andrew@fraser.vn';
const TELEGRAM_CHAT_ID = '8296081814';

const TRIAL_SUBMISSION_KEYWORDS = [
  'edit', 'cut', 'link', 'drive', 'attached', 'submission', 'done', 'finished', 'here',
];

interface ApplicantRow {
  id: number;
  name: string;
  portfolio_score: number;
  stage: string;
}

interface SecondRoundApplicant {
  id: number;
  name: string;
  email: string;
  stage: string;
  second_round_sub_stage: string | null;
  second_round_trial_sent_at: string | null;
  second_round_last_checkin_at: string | null;
  second_round_checkin_count: number;
  position_title: string;
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

async function sendTelegramNotification(message: string): Promise<void> {
  try {
    await execAsync(
      `openclaw message send --channel telegram -t ${TELEGRAM_CHAT_ID} -m ${JSON.stringify(message)}`
    );
  } catch (err) {
    console.error('Telegram notification failed:', err);
  }
}

async function checkForReply(email: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `gog gmail list "from:${email}" --max 5 --json --account "${FROM_ACCOUNT}"`,
      { timeout: 15000 }
    );
    const lowered = stdout.toLowerCase();
    return TRIAL_SUBMISSION_KEYWORDS.some(kw => lowered.includes(kw));
  } catch {
    return false;
  }
}

async function sendCheckinEmail(app: SecondRoundApplicant): Promise<void> {
  const firstName = getFirstName(app.name);
  const subject = `Re: ${app.position_title || 'Video Editor'} (YouTube) — Edit Task`;
  const body = `Hey ${firstName},\n\nJust checking in — how is the trial going? Any questions at all, feel free to ask.\n\nMonty`;

  const tmpFile = join(tmpdir(), `checkin-${app.id}-${Date.now()}.txt`);
  writeFileSync(tmpFile, body, 'utf8');

  try {
    await execAsync(
      `gog gmail send --account "${FROM_ACCOUNT}" --to "${app.email}" --cc "${CC_ADDRESS}" --subject "${subject}" --body-file "${tmpFile}"`
    );
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

export async function POST() {
  const db = getDb();

  // ── Existing: portfolio score auto-promote/reject ──────────────────
  const candidates = db.prepare(`
    SELECT a.id, a.name, a.portfolio_score, a.stage
    FROM applicants a
    WHERE a.portfolio_score > 0
      AND a.stage NOT IN ('interview', 'second_round', 'rejected', 'hired')
  `).all() as ApplicantRow[];

  const movedToInterview: string[] = [];
  const movedToRejected: string[] = [];

  const updateStage = db.prepare(`
    UPDATE applicants
    SET stage = ?, rejection_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const syncAll = db.transaction(() => {
    for (const app of candidates) {
      if (app.portfolio_score >= 4) {
        updateStage.run('interview', '', app.id);
        logActivity('applicant', app.id, 'stage_changed', `Pipeline sync: moved to interview (portfolio ${app.portfolio_score}/10)`);
        movedToInterview.push(app.name);
      } else {
        updateStage.run('rejected', `Portfolio score: ${app.portfolio_score}/10`, app.id);
        logActivity('applicant', app.id, 'stage_changed', `Pipeline sync: rejected (portfolio ${app.portfolio_score}/10)`);
        movedToRejected.push(app.name);
      }
    }
  });

  syncAll();

  // ── 3a. Trial submission detection ─────────────────────────────────
  const trialPending = db.prepare(`
    SELECT a.id, a.name, a.email, a.stage,
           a.second_round_sub_stage, a.second_round_trial_sent_at,
           a.second_round_last_checkin_at, a.second_round_checkin_count,
           jp.title as position_title
    FROM applicants a
    LEFT JOIN job_positions jp ON a.position_id = jp.id
    WHERE a.stage = 'second_round'
      AND a.second_round_sub_stage = 'trial_pending'
      AND a.email != ''
  `).all() as SecondRoundApplicant[];

  const trialSubmitted: string[] = [];
  const checkinsSent: string[] = [];
  const silentRejected: string[] = [];

  for (const app of trialPending) {
    // Check for trial submission reply
    const hasReply = await checkForReply(app.email);
    if (hasReply) {
      db.prepare(`
        UPDATE applicants
        SET second_round_sub_stage = 'trial_submitted', updated_at = datetime('now')
        WHERE id = ?
      `).run(app.id);
      logActivity('applicant', app.id, 'stage_changed', 'Trial submitted (detected from email)');
      trialSubmitted.push(app.name);

      await sendTelegramNotification(`[Scout] Trial submitted: ${app.name} — ready for your review`);
      continue;
    }

    // ── 3b. Follow-up check-ins for trial_pending ────────────────────
    const daysSinceTrialSent = daysSince(app.second_round_trial_sent_at);
    const daysSinceLastCheckin = daysSince(app.second_round_last_checkin_at);
    const checkinCount = app.second_round_checkin_count || 0;

    // Silent rejection: 3+ check-ins and > 20 days since trial sent
    if (checkinCount >= 3 && daysSinceTrialSent > 20) {
      db.prepare(`
        UPDATE applicants
        SET stage = 'rejected', rejection_reason = 'No trial submission after follow-ups', updated_at = datetime('now')
        WHERE id = ?
      `).run(app.id);
      logActivity('applicant', app.id, 'stage_changed', 'Silent reject: no trial after 3 follow-ups');
      silentRejected.push(app.name);
      continue;
    }

    // Check-in email: > 4 days since trial sent, > 5 days since last check-in, < 3 check-ins
    if (
      daysSinceTrialSent > 4 &&
      daysSinceLastCheckin > 5 &&
      checkinCount < 3
    ) {
      try {
        await sendCheckinEmail(app);
        db.prepare(`
          UPDATE applicants
          SET second_round_last_checkin_at = datetime('now'),
              second_round_checkin_count = second_round_checkin_count + 1,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(app.id);
        logActivity('applicant', app.id, 'checkin_sent', `Trial check-in #${checkinCount + 1} sent`);
        checkinsSent.push(app.name);
      } catch (err) {
        console.error(`Failed to send check-in to ${app.name}:`, err);
      }
    }
  }

  return NextResponse.json({
    moved_to_interview: movedToInterview,
    moved_to_rejected: movedToRejected,
    trial_submitted: trialSubmitted,
    checkins_sent: checkinsSent,
    silent_rejected: silentRejected,
  });
}
