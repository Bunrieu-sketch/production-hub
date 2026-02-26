import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

const DB_PATH = process.env.DB_PATH || `${process.env.HOME}/.openclaw/workspace/production-hub/production-hub.db`;
const BOOKING_LINK = 'https://calendar.app.google/4bSX3LMkYXo8XV6N9';
const FROM_ACCOUNT = 'montythehandler@gmail.com';
const CC_ADDRESS = 'andrew@fraser.vn';

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

function buildEmailBody(name: string, roleType: string): string {
  const firstName = getFirstName(name);
  if (roleType === 'editor') {
    return `Hi ${firstName},

We quite liked the look of your work and we'd like to move forward with an interview.

Could you please book a 15-minute time slot with Andrew here:
${BOOKING_LINK}

Thanks,
Monty`;
  } else {
    return `Hi ${firstName},

We've reviewed your trial task and we'd like to move forward to interview.

Book a 15-minute slot with Andrew here:
${BOOKING_LINK}

Monty`;
  }
}

function getSubject(roleType: string): string {
  if (roleType === 'editor') {
    return 'Junior Video Editor (YouTube) — Interview';
  }
  return 'Content Operations Manager (YouTube) — Interview';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = new Database(DB_PATH);

  try {
    const applicant = db.prepare(`
      SELECT a.*, p.role_type 
      FROM applicants a 
      JOIN job_positions p ON a.position_id = p.id 
      WHERE a.id = ?
    `).get(Number(id)) as any;

    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    if (!applicant.email) {
      return NextResponse.json({ error: 'No email address on file for this applicant' }, { status: 400 });
    }

    // Check if already invited
    if (applicant.notes?.includes('interview_invited')) {
      return NextResponse.json({ error: 'Interview invite already sent', alreadySent: true }, { status: 400 });
    }

    const subject = getSubject(applicant.role_type);
    const body = buildEmailBody(applicant.name, applicant.role_type);

    // Write body to temp file
    const tmpFile = join(tmpdir(), `invite-${id}-${Date.now()}.txt`);
    writeFileSync(tmpFile, body, 'utf8');

    try {
      await execAsync(
        `gog gmail send --account "${FROM_ACCOUNT}" --to "${applicant.email}" --cc "${CC_ADDRESS}" --subject "${subject}" --body-file "${tmpFile}"`
      );
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }

    // Update DB notes
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE applicants 
      SET notes = COALESCE(notes, '') || char(10) || 'interview_invited ${today}'
      WHERE id = ?
    `).run(Number(id));

    return NextResponse.json({ 
      ok: true, 
      message: `Interview invite sent to ${applicant.email}` 
    });

  } catch (err: any) {
    console.error('send-invite error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send invite' }, { status: 500 });
  } finally {
    db.close();
  }
}
