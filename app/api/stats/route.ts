import { NextResponse } from 'next/server';
import { getStats, getActivity } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  if (type === 'activity') {
    const activity = getActivity();
    return NextResponse.json(activity);
  }
  
  const stats = getStats();
  return NextResponse.json(stats);
}
