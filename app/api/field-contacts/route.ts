import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = new Set(['fixer', 'hotel', 'creator', 'talent', 'other']);
const ALLOWED_STAGES = new Set(['cold', 'contacted', 'responded', 'confirmed', 'passed']);

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get('destination');
  const type = searchParams.get('type');
  const stage = searchParams.get('stage');

  let query = 'SELECT * FROM field_contacts WHERE 1=1';
  const params: string[] = [];

  if (destination) {
    query += ' AND destination = ?';
    params.push(destination);
  }
  if (type && ALLOWED_TYPES.has(type)) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (stage && ALLOWED_STAGES.has(stage)) {
    query += ' AND stage = ?';
    params.push(stage);
  }

  query += ' ORDER BY updated_at DESC, created_at DESC';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const id = randomUUID();
  const name = String(body.name || '').trim();
  const destination = String(body.destination || '').trim();
  const type = ALLOWED_TYPES.has(body.type) ? body.type : 'other';
  const stage = ALLOWED_STAGES.has(body.stage) ? body.stage : 'cold';
  const priority = [1, 2, 3].includes(Number(body.priority)) ? Number(body.priority) : 2;

  if (!name || !destination) {
    return NextResponse.json({ error: 'Name and destination are required' }, { status: 400 });
  }

  db.prepare(`
    INSERT INTO field_contacts
      (id, name, destination, type, stage, wa, email, instagram, website, notes, source, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    destination,
    type,
    stage,
    body.wa || null,
    body.email || null,
    body.instagram || null,
    body.website || null,
    body.notes || null,
    body.source || null,
    priority
  );

  const row = db.prepare('SELECT * FROM field_contacts WHERE id = ?').get(id);
  return NextResponse.json(row, { status: 201 });
}
