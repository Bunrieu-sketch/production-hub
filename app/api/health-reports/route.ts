import { NextResponse } from 'next/server';
import { getLatestHealthReport, createHealthReport, getHealthReports } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';

  if (all) {
    const reports = getHealthReports(20);
    return NextResponse.json(reports);
  }

  const report = getLatestHealthReport();
  if (!report) {
    return NextResponse.json({ error: 'No health reports yet' }, { status: 404 });
  }
  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const data = await request.json();

  if (!data.report_text || typeof data.overall_score !== 'number') {
    return NextResponse.json(
      { error: 'report_text and overall_score are required' },
      { status: 400 }
    );
  }

  const report = createHealthReport({
    report_text: data.report_text,
    overall_score: Math.min(10, Math.max(0, Math.round(data.overall_score))),
  });

  return NextResponse.json(report, { status: 201 });
}
