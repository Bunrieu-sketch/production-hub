interface HealthScoreCircleProps {
  score: number;
  max?: number;
}

function scoreColor(score: number) {
  if (score >= 7) return '#22c55e';
  if (score >= 4) return '#eab308';
  return '#ef4444';
}

export function HealthScoreCircle({ score, max = 9 }: HealthScoreCircleProps) {
  const color = scoreColor(score);

  return (
    <div
      style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{score}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>/ {max}</div>
    </div>
  );
}
