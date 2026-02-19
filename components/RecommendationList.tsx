interface Recommendation {
  number: number;
  severity: 'warning' | 'critical';
  text: string;
}

interface RecommendationListProps {
  recommendations: Recommendation[];
}

const SEVERITY_COLOR: Record<Recommendation['severity'], string> = {
  warning: '#eab308',
  critical: '#ef4444',
};

export function RecommendationList({ recommendations }: RecommendationListProps) {
  const sorted = [...recommendations].sort((a, b) => {
    if (a.severity === b.severity) return a.number - b.number;
    return a.severity === 'critical' ? -1 : 1;
  });

  if (!sorted.length) {
    return <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No recommendations</div>;
  }

  return (
    <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((rec) => (
        <li key={rec.number} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              padding: '2px 8px',
              borderRadius: 999,
              border: `1px solid ${SEVERITY_COLOR[rec.severity]}`,
              color: SEVERITY_COLOR[rec.severity],
              marginTop: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {rec.severity}
          </span>
          <span style={{ fontSize: 13 }}>{rec.text}</span>
        </li>
      ))}
    </ol>
  );
}
