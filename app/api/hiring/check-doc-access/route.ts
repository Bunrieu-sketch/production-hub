import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  try {
    // Try to fetch the document - Google Docs/Drive will return different status codes
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductionHub/1.0)',
      },
    });

    // Check if we got redirected to a login/error page
    const finalUrl = res.url;
    const accessible = res.ok && !finalUrl.includes('accounts.google.com') && !finalUrl.includes('ServiceLogin');

    return NextResponse.json({
      accessible,
      status: res.status,
      finalUrl,
    });
  } catch (err: any) {
    return NextResponse.json({
      accessible: false,
      error: err.message,
    });
  }
}
