import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'hiring-templates.json');
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw);

  return NextResponse.json(data);
}
