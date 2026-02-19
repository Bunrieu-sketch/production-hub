'use client';

import { useState } from 'react';

interface HealthAreaCardProps {
  icon: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  details: string[];
  agent: string;
  model: string;
}

const STATUS_LABELS: Record<HealthAreaCardProps['status'], string> = {
  healthy: '🟢 Healthy',
  warning: '🟡 Warning',
  critical: '🔴 Critical',
};

const STATUS_COLORS: Record<HealthAreaCardProps['status'], string> = {
  healthy: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
};

export function HealthAreaCard({
  icon,
  name,
  status,
  summary,
  details,
  agent,
  model,
}: HealthAreaCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          cursor: 'pointer',
          color: 'inherit',
        }}
        aria-expanded={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ fontSize: 14 }}>{name}</span>
          </div>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              color: STATUS_COLORS[status],
              border: `1px solid ${STATUS_COLORS[status]}`,
              whiteSpace: 'nowrap',
            }}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
      </button>

      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{summary}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
        <span>{agent}</span>
        <span>{model}</span>
      </div>

      {open && details.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text)' }}>
          {details.map((detail, idx) => (
            <li key={`${detail}-${idx}`} style={{ marginBottom: 4 }}>
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
