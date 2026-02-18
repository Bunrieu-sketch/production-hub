'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      className="no-print"
      onClick={() => window.print()}
      style={{
        background: '#f0a500',
        color: '#0d1117',
        border: 'none',
        borderRadius: 999,
        padding: '10px 18px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Printer size={14} /> Print / Save as PDF
    </button>
  );
}
