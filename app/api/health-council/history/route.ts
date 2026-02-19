import { NextResponse } from 'next/server';
import { getHealthHistory } from '@/lib/health-council';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get('days') || 7);
  const days = Number.isFinite(daysParam) ? daysParam : 7;
  const history = getHealthHistory(days);
  return NextResponse.json({ history });
}
