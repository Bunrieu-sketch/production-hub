import { NextResponse } from 'next/server';
import { saveHealthReport, HealthCouncilReport } from '@/lib/health-council';

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<HealthCouncilReport>;

  if (!body || typeof body.date !== 'string' || typeof body.overall_score !== 'number' || !Array.isArray(body.areas)) {
    return NextResponse.json({ ok: false, error: 'Invalid report payload' }, { status: 400 });
  }

  const id = saveHealthReport(body as HealthCouncilReport);
  return NextResponse.json({ ok: true, id });
}
