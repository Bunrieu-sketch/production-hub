'use client';

import { useEffect, useMemo, useState } from 'react';
import { HealthScoreCircle } from '@/components/HealthScoreCircle';
import { HealthAreaCard } from '@/components/HealthAreaCard';
import { HealthTrend } from '@/components/HealthTrend';
import { RecommendationList } from '@/components/RecommendationList';

interface HealthArea {
  id: string;
  name: string;
  icon: string;
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  details: string[];
  agent: string;
  model: string;
}

interface Recommendation {
  number: number;
  severity: 'warning' | 'critical';
  text: string;
}

interface HealthCouncilReport {
  date: string;
  overall_score: number;
  areas: HealthArea[];
  recommendations: Recommendation[];
  council: {
    moderator: string;
    members: { role: string; model: string }[];
  };
}

export default function HealthCouncilPage() {
  const [report, setReport] = useState<HealthCouncilReport | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ date: string; overall_score: number }>>([]);

  useEffect(() => {
    fetch('/api/health-council/latest')
      .then((res) => res.json())
      .then((data) => {
        setReport(data.report);
        setPreviousScore(data.previousScore);
      });

    fetch('/api/health-council/history?days=7')
      .then((res) => res.json())
      .then((data) => setHistory(data.history || []));
  }, []);

  const trend = useMemo(() => {
    if (report && typeof previousScore === 'number') {
      return report.overall_score - previousScore;
    }
    return null;
  }, [report, previousScore]);

  const trendLabel = useMemo(() => {
    if (trend === null) return 'No prior data';
    if (trend > 0) return `▲ +${trend}`;
    if (trend < 0) return `▼ ${trend}`;
    return '● 0';
  }, [trend]);

  const lastRun = report?.date
    ? new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="mc-layout">
      <div className="mc-main" style={{ gap: 20 }}>
        <div className="mc-header">
          <div>
            <h1>🏛️ Health Council</h1>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
              AI-powered infrastructure health audit
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <HealthScoreCircle score={report?.overall_score ?? 0} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Overall Score</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Last run: {lastRun}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Trend: <span style={{ color: trend && trend < 0 ? '#ef4444' : '#22c55e' }}>{trendLabel}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
            Based on 9 automated audits
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase' }}>
            Health Areas
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 10,
            }}
          >
            {(report?.areas || []).map((area) => (
              <HealthAreaCard
                key={area.id}
                icon={area.icon}
                name={area.name}
                status={area.status}
                summary={area.summary}
                details={area.details}
                agent={area.agent}
                model={area.model}
              />
            ))}
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Recommendations</div>
          <RecommendationList recommendations={report?.recommendations || []} />
        </div>

        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Council Members</div>
          <div style={{ fontSize: 12 }}>
            Reviewed by:{' '}
            {report?.council
              ? `${report.council.moderator} (moderator), ${report.council.members.map((m) => m.model).join(', ')}`
              : '—'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(report?.council?.members || []).map((member) => (
              <span
                key={`${member.role}-${member.model}`}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                }}
              >
                {member.role}: {member.model}
              </span>
            ))}
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>7-Day Trend</div>
          <HealthTrend history={history} />
        </div>
      </div>
    </div>
  );
}
