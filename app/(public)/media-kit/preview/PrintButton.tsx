'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '12px 28px',
        fontSize: 15,
        fontWeight: 700,
        background: '#f0a500',
        color: '#0d1117',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        letterSpacing: 0.5,
      }}
    >
      🖨️ Print / Save as PDF
    </button>
  );
}
