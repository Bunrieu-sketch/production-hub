'use client';

import { useState, useEffect, useCallback } from 'react';

interface HealthReport {
  id: number;
  report_text: string;
  overall_score: number;
  created_at: string;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? '#3fb950' :
    score >= 6 ? '#d29922' :
    '#f85149';
  const bg =
    score >= 8 ? '#0d1117' :
    score >= 6 ? '#0d1117' :
    '#0d1117';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: color + '22',
      border: `1px solid ${color}55`,
      color,
      borderRadius: 8,
      padding: '4px 12px',
      fontWeight: 700,
      fontSize: 20,
    }}>
      {score >= 8 ? '🟢' : score >= 6 ? '🟡' : '🔴'} {score}/10
    </span>
  );
}

function formatReportToHtml(text: string): string {
  // Convert plain text report to styled HTML
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/🔴/g, '<span class="sev-critical">🔴</span>')
    .replace(/🟡/g, '<span class="sev-warning">🟡</span>')
    .replace(/🟢/g, '<span class="sev-info">🟢</span>')
    .replace(/^(⏰|📝|🧪|💬|📦|💾|🎯|⚙️|🗄️) (.+)$/gm, '<div class="area-header">$1 $2</div>')
    .replace(/^(─+)$/gm, '<hr class="report-divider" />')
    .replace(/\n/g, '<br/>');
}

export default function CouncilsPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [history, setHistory] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch('/api/health-reports');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setSelectedId(data.id);
      } else if (res.status === 404) {
        setReport(null);
      }
    } catch {
      setError('Failed to load health report');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/health-reports?all=true');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchHistory();
  }, [fetchLatest, fetchHistory]);

  const selectReport = (r: HealthReport) => {
    setReport(r);
    setSelectedId(r.id);
    setShowHistory(false);
  };

  const displayReport = selectedId ? history.find(r => r.id === selectedId) || report : report;

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .area-header {
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.05em;
          color: #7d8590;
          margin-top: 16px;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .report-divider {
          border: none;
          border-top: 1px solid #21262d;
          margin: 12px 0;
        }
        .sev-critical { color: #f85149; }
        .sev-warning { color: #d29922; }
        .sev-info { color: #3fb950; }
        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid #21262d;
          margin-bottom: 8px;
          background: #0d1117;
          transition: border-color 0.15s;
        }
        .history-item:hover, .history-item.active {
          border-color: #388bfd;
        }
        .run-btn {
          background: #388bfd;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: '8px 18px';
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          opacity: 1;
        }
        .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#e6edf3', margin: 0 }}>
            🏛️ Platform Health Council
          </h1>
          <p style={{ color: '#7d8590', margin: '6px 0 0', fontSize: 14 }}>
            Automated workspace health analysis — 9 areas reviewed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: '#21262d',
              color: '#e6edf3',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            📋 History ({history.length})
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div style={{
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: 10,
          padding: 16,
          marginBottom: 24,
        }}>
          <h3 style={{ color: '#e6edf3', margin: '0 0 12px', fontSize: 14 }}>Report History</h3>
          {history.map(r => (
            <div
              key={r.id}
              className={`history-item ${selectedId === r.id ? 'active' : ''}`}
              onClick={() => selectReport(r)}
            >
              <ScoreBadge score={r.overall_score} />
              <span style={{ color: '#7d8590', fontSize: 13 }}>
                {new Date(r.created_at).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Saigon',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div style={{ color: '#7d8590', textAlign: 'center', padding: 60 }}>
          Loading health report...
        </div>
      ) : error ? (
        <div style={{
          background: '#f8514922',
          border: '1px solid #f8514944',
          borderRadius: 10,
          padding: 20,
          color: '#f85149',
        }}>
          {error}
        </div>
      ) : !displayReport ? (
        <div style={{
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏛️</div>
          <h2 style={{ color: '#e6edf3', margin: '0 0 8px' }}>No reports yet</h2>
          <p style={{ color: '#7d8590', margin: '0 0 24px' }}>
            Run the health council to generate your first report.
          </p>
          <code style={{
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 6,
            padding: '8px 16px',
            color: '#79c0ff',
            fontSize: 13,
            display: 'inline-block',
          }}>
            node /Users/montymac/.openclaw/workspace/platform-health-council/health-council.js
          </code>
        </div>
      ) : (
        <div>
          {/* Score card */}
          <div style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: '#7d8590', fontSize: 12, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Overall Health Score
              </div>
              <ScoreBadge score={displayReport.overall_score} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#7d8590', fontSize: 12 }}>Generated</div>
              <div style={{ color: '#e6edf3', fontSize: 13, marginTop: 2 }}>
                {new Date(displayReport.created_at).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Saigon',
                })}
              </div>
            </div>
          </div>

          {/* Report text */}
          <div style={{
            background: '#0d1117',
            border: '1px solid #21262d',
            borderRadius: 12,
            padding: '24px 28px',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.7,
            color: '#c9d1d9',
            whiteSpace: 'pre-wrap',
          }}>
            <div dangerouslySetInnerHTML={{ __html: formatReportToHtml(displayReport.report_text) }} />
          </div>
        </div>
      )}

      {/* Footer info */}
      <div style={{
        marginTop: 24,
        padding: '12px 16px',
        background: '#161b22',
        border: '1px solid #21262d',
        borderRadius: 8,
        color: '#7d8590',
        fontSize: 12,
      }}>
        💡 <strong style={{ color: '#e6edf3' }}>To run a new analysis:</strong>{' '}
        <code style={{ background: '#0d1117', padding: '2px 6px', borderRadius: 4, color: '#79c0ff' }}>
          node ~/.openclaw/workspace/platform-health-council/health-council.js
        </code>
        {' '}— reports are automatically saved here.
      </div>
    </div>
  );
}
