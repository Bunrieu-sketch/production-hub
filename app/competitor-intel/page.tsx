'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CompetitorEmbed() {
  const searchParams = useSearchParams();
  const path = searchParams.get('path') || '/';
  const src = `http://localhost:5052${path}${path.includes('?') ? '&' : '?'}embedded=1`;

  return (
    <div className="embed-container">
      <iframe
        src={src}
        className="embed-frame"
        title="Competitor Intel"
      />
    </div>
  );
}

export default function CompetitorIntelPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#7d8590' }}>Loading...</div>}>
      <CompetitorEmbed />
    </Suspense>
  );
}
