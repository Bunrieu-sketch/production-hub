interface HealthTrendProps {
  history: Array<{ date: string; overall_score: number }>;
  maxScore?: number;
}

export function HealthTrend({ history, maxScore = 9 }: HealthTrendProps) {
  const maxHeight = 80;
  const safeHistory = history.length ? history : [];

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      {safeHistory.map((item) => {
        const height = Math.max(8, (item.overall_score / maxScore) * maxHeight);
        return (
          <div key={item.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 20,
                height,
                background: 'var(--accent)',
                borderRadius: 6,
                opacity: 0.85,
              }}
              title={`${item.date}: ${item.overall_score}/${maxScore}`}
            />
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        );
      })}
      {!safeHistory.length && (
        <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No trend data yet</div>
      )}
    </div>
  );
}
