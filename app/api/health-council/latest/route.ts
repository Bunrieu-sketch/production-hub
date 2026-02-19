import { NextResponse } from 'next/server';
import { getLatestHealthReport } from '@/lib/health-council';

export async function GET() {
  const result = getLatestHealthReport();
  if (!result) {
    return NextResponse.json({ report: null, previousScore: null });
  }
  return NextResponse.json(result);
}
