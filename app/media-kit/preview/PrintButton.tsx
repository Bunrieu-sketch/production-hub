'use client';

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
        padding: '10px 20px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      🖨️ Print / Save as PDF
    </button>
  );
}
