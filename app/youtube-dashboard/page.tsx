'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function DashboardEmbed() {
  const searchParams = useSearchParams();
  const path = searchParams.get('path') || '/sponsors-v2';
  const src = `http://localhost:5050${path}?embedded=1`;

  return (
    <div className="embed-container">
      <iframe
        src={src}
        className="embed-frame"
        title="YouTube Dashboard"
      />
    </div>
  );
}

export default function YouTubeDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#7d8590' }}>Loading...</div>}>
      <DashboardEmbed />
    </Suspense>
  );
}
