'use client';

import { useEffect, useMemo, useState } from 'react';

type TopVideoRow = {
  videoId: string;
  title: string;
  publishedAt: string | null;
  views: number;
  watchTimeHours: number;
  subscribers: number;
  revenue: number;
  impressions: number;
  ctr: number;
};

type AnalyticsData = {
  id: number;
  fetched_at: string;
  period_start: string;
  period_end: string;
  channel_id: string;
  channel_title: string;
  subscribers: number;
  views: number;
  watch_time_hours: number;
  estimated_revenue: number;
  top_videos: TopVideoRow[];
  traffic_sources: {
    totals?: number;
    percentages?: {
      browse?: number;
      suggested?: number;
      search?: number;
      external?: number;
      channelPages?: number;
      others?: number;
    };
    buckets?: Record<string, number>;
  };
  demographics: Record<string, Record<string, number>>;
  realtime_subscribers: number;
  realtime_views_48h: number;
};

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n || 0);
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function formatPct(n: number) {
  const pct = (n || 0) * 100;
  return `${pct.toFixed(1)}%`;
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCached() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/youtube/analytics', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load analytics');
      setData(json.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/youtube/analytics', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to refresh analytics');
      setData(json.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCached();
  }, []);

  const trafficRows = useMemo(() => {
    const p = data?.traffic_sources?.percentages;
    if (!p) return [] as Array<{ name: string; pct: number }>;
    return [
      { name: 'Browse features', pct: p.browse || 0 },
      { name: 'Suggested videos', pct: p.suggested || 0 },
      { name: 'YouTube search', pct: p.search || 0 },
      { name: 'External', pct: p.external || 0 },
      { name: 'Channel pages', pct: p.channelPages || 0 },
      { name: 'Others', pct: p.others || 0 },
    ];
  }, [data]);

  const demographicAges = useMemo(() => {
    const ages = Object.keys(data?.demographics || {});
    // keep some sensible ordering if present
    const order = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65-'];
    ages.sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return ages;
  }, [data]);

  return (
    <div style={{ maxWidth: 1200 }}>
      <div className="mc-header">
        <div>
          <h1>Analytics</h1>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>
            {data
              ? (
                <>
                  <span style={{ marginRight: 10 }}>
                    Channel: <span style={{ color: 'var(--text)' }}>{data.channel_title || data.channel_id}</span>
                  </span>
                  <span style={{ marginRight: 10 }}>
                    Period: <span style={{ color: 'var(--text)' }}>{data.period_start} → {data.period_end}</span>
                  </span>
                  <span>
                    Last updated: <span style={{ color: 'var(--text)' }}>{timeAgo(data.fetched_at)}</span>
                  </span>
                </>
              )
              : 'No cached analytics yet. Click Refresh Data to fetch.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={loadCached} disabled={loading || refreshing}>
            Reload
          </button>
          <button className="btn btn-primary" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)', background: 'rgba(248, 81, 73, 0.06)', marginBottom: 16 }}>
          <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Error</div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>{error}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            Note: YouTube Analytics API requires OAuth. If Refresh fails, set <code>YOUTUBE_ACCESS_TOKEN</code> in <code>.env.local</code>.
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-dim)' }}>Loading…</div>
      ) : (
        <>
          {/* Overview */}
          <div className="stats-bar" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <div className="stat-item">
              <div className="stat-value white">{formatNumber(data?.views || 0)}</div>
              <div className="stat-label">Views (7d)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value purple">{formatNumber(Math.round(data?.watch_time_hours || 0))}</div>
              <div className="stat-label">Watch time (hours)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value green">{formatNumber(data?.subscribers || 0)}</div>
              <div className="stat-label">Subscribers gained</div>
            </div>
            <div className="stat-item">
              <div className="stat-value white">{formatMoney(data?.estimated_revenue || 0)}</div>
              <div className="stat-label">Estimated revenue</div>
            </div>
            <div className="stat-item">
              <div className="stat-value white">{formatNumber(data?.realtime_subscribers || 0)}</div>
              <div className="stat-label">Subscribers (current)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value white">{formatNumber(data?.realtime_views_48h || 0)}</div>
              <div className="stat-label">Views (last 48h)</div>
            </div>
          </div>

          {/* Top videos */}
          <div className="card" style={{ background: 'var(--card)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Top Videos</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Sorted by views (period)</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Title</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Publish date</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Views</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Watch time (h)</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Subs</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Revenue</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Impr.</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.top_videos || []).slice(0, 15).map((v) => (
                    <tr key={v.videoId}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>{v.title}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                        {v.publishedAt ? v.publishedAt.slice(0, 10) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{formatNumber(v.views)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{formatNumber(Math.round(v.watchTimeHours))}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{formatNumber(v.subscribers)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{formatMoney(v.revenue)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{formatNumber(v.impressions)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{formatPct(v.ctr)}</td>
                    </tr>
                  ))}
                  {(!data?.top_videos || data.top_videos.length === 0) && (
                    <tr>
                      <td colSpan={8} style={{ padding: 12, color: 'var(--text-dim)' }}>No video data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Traffic sources + Demographics */}
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card" style={{ background: 'var(--card)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Traffic Sources</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Source</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficRows.map((r) => (
                    <tr key={r.name}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{r.name}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{formatPct(r.pct)}</td>
                    </tr>
                  ))}
                  {!trafficRows.length && (
                    <tr>
                      <td colSpan={2} style={{ padding: 12, color: 'var(--text-dim)' }}>No traffic source data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ background: 'var(--card)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Audience Demographics</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
                Viewer percentage by age bracket and gender
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Age</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Male</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Female</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Other/Unspec.</th>
                  </tr>
                </thead>
                <tbody>
                  {demographicAges.map((age) => {
                    const row = data?.demographics?.[age] || {};
                    const male = row.male ?? row.MALE ?? 0;
                    const female = row.female ?? row.FEMALE ?? 0;
                    const other = (row.user_specified ?? 0) + (row.unknown ?? 0) + (row.OTHER ?? 0) + (row.UNSPECIFIED ?? 0);
                    return (
                      <tr key={age}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{age}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{(male || 0).toFixed(1)}%</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{(female || 0).toFixed(1)}%</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{(other || 0).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  {!demographicAges.length && (
                    <tr>
                      <td colSpan={4} style={{ padding: 12, color: 'var(--text-dim)' }}>No demographics data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
