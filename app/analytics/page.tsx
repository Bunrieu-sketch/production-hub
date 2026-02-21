'use client';

import { useEffect, useMemo, useState } from 'react';

type TopVideoRow = {
  videoId: string;
  title: string;
  publishedAt: string | null;
  views: number;
  watchTimeHours: number;
  subscribers: number;
};

type GeoRow = {
  country: string;
  views: number;
  watchTimeMinutes: number;
};

type AnalyticsData = {
  id: number;
  fetched_at: string;
  period_start: string;
  period_end: string;
  period_days?: number;
  channel_id: string;
  channel_title: string;
  subscribers: number;
  views: number;
  watch_time_hours: number;
  top_videos: TopVideoRow[];
  traffic_sources: {
    totals?: number;
    percentages?: Record<string, number>;
    buckets?: Record<string, number>;
  };
  demographics: Record<string, Record<string, number>>;
  geography: GeoRow[];
  realtime_subscribers: number;
  realtime_views_48h: number;
};

const COUNTRY_NAMES: Record<string, string> = {
  US: '🇺🇸 United States', GB: '🇬🇧 United Kingdom', AU: '🇦🇺 Australia', CA: '🇨🇦 Canada',
  DE: '🇩🇪 Germany', NL: '🇳🇱 Netherlands', NZ: '🇳🇿 New Zealand', ZA: '🇿🇦 South Africa',
  IN: '🇮🇳 India', PH: '🇵🇭 Philippines', ID: '🇮🇩 Indonesia', MY: '🇲🇾 Malaysia',
  SG: '🇸🇬 Singapore', JP: '🇯🇵 Japan', KR: '🇰🇷 South Korea', TH: '🇹🇭 Thailand',
  VN: '🇻🇳 Vietnam', KE: '🇰🇪 Kenya', NG: '🇳🇬 Nigeria', BR: '🇧🇷 Brazil',
  MX: '🇲🇽 Mexico', FR: '🇫🇷 France', IE: '🇮🇪 Ireland', SE: '🇸🇪 Sweden',
  NO: '🇳🇴 Norway', DK: '🇩🇰 Denmark', FI: '🇫🇮 Finland', HK: '🇭🇰 Hong Kong',
  TW: '🇹🇼 Taiwan', AE: '🇦🇪 UAE', SA: '🇸🇦 Saudi Arabia',
};

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n || 0);
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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

type Period = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCached(p: Period) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/analytics?period=${p}`, { cache: 'no-store' });
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
      const res = await fetch(`/api/youtube/analytics?period=${period}`, { method: 'POST' });
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
    void loadCached(period);
  }, [period]);

  const periodLabel = period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days';

  const trafficRows = useMemo(() => {
    const b = data?.traffic_sources?.buckets;
    if (!b) return [] as Array<{ name: string; views: number; pct: number }>;
    const total = Object.values(b).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(b)
      .sort((a, b) => b[1] - a[1])
      .map(([name, views]) => ({ name, views, pct: views / total }));
  }, [data]);

  const demographicAges = useMemo(() => {
    const ages = Object.keys(data?.demographics || {});
    const order = ['age13-17', 'age18-24', 'age25-34', 'age35-44', 'age45-54', 'age55-64', 'age65-'];
    ages.sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.localeCompare(b);
    });
    return ages;
  }, [data]);

  const geoRows = data?.geography || [];
  const geoTotal = geoRows.reduce((s, r) => s + r.views, 0) || 1;

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

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: period === p ? 700 : 400,
                  background: period === p ? 'var(--accent)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRight: p !== '90d' ? '1px solid var(--border)' : 'none',
                }}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={() => loadCached(period)} disabled={loading || refreshing}>
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
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-dim)' }}>Loading…</div>
      ) : !data ? (
        <div style={{ color: 'var(--text-dim)' }}>No data for {periodLabel}. Click "Refresh Data" to fetch.</div>
      ) : (
        <>
          {/* Overview */}
          <div className="stats-bar" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <div className="stat-item">
              <div className="stat-value white">{formatNumber(data.views)}</div>
              <div className="stat-label">Views ({periodLabel})</div>
            </div>
            <div className="stat-item">
              <div className="stat-value purple">{formatNumber(Math.round(data.watch_time_hours))}</div>
              <div className="stat-label">Watch time (hours)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value green">{formatNumber(data.subscribers)}</div>
              <div className="stat-label">Subscribers gained</div>
            </div>
            <div className="stat-item">
              <div className="stat-value white">{formatNumber(data.realtime_subscribers)}</div>
              <div className="stat-label">Subscribers (current)</div>
            </div>
            <div className="stat-item">
              <div className="stat-value white">{formatNumber(data.realtime_views_48h)}</div>
              <div className="stat-label">Views (last 48h)</div>
            </div>
          </div>

          {/* Top videos */}
          <div className="card" style={{ background: 'var(--card)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Top Videos</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Sorted by views ({periodLabel})</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Title</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Publish date</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Views</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Watch time (h)</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Subs</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.top_videos || []).slice(0, 15).map((v) => (
                    <tr key={v.videoId}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                        {v.publishedAt ? v.publishedAt.slice(0, 10) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatNumber(v.views)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatNumber(Math.round(v.watchTimeHours))}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatNumber(v.subscribers)}</td>
                    </tr>
                  ))}
                  {(!data.top_videos || data.top_videos.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ padding: 12, color: 'var(--text-dim)' }}>No video data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Geography + Traffic Sources */}
          <div className="grid-2" style={{ alignItems: 'start', marginBottom: 16 }}>
            <div className="card" style={{ background: 'var(--card)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Top Countries</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Country</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Views</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>%</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Watch time (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {geoRows.map((r) => (
                    <tr key={r.country}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        {COUNTRY_NAMES[r.country] || r.country}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatNumber(r.views)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{((r.views / geoTotal) * 100).toFixed(1)}%</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatNumber(Math.round(r.watchTimeMinutes / 60))}</td>
                    </tr>
                  ))}
                  {!geoRows.length && (
                    <tr>
                      <td colSpan={4} style={{ padding: 12, color: 'var(--text-dim)' }}>No geography data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ background: 'var(--card)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Traffic Sources</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Source</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Views</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficRows.map((r) => (
                    <tr key={r.name}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{r.name}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatNumber(r.views)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatPct(r.pct)}</td>
                    </tr>
                  ))}
                  {!trafficRows.length && (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, color: 'var(--text-dim)' }}>No traffic source data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Demographics */}
          <div className="card" style={{ background: 'var(--card)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Audience Demographics</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
              Viewer percentage by age bracket and gender
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, maxWidth: 600 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Age</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Male</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Female</th>
                </tr>
              </thead>
              <tbody>
                {demographicAges.map((age) => {
                  const row = data.demographics[age] || {};
                  const male = row.male ?? row.MALE ?? 0;
                  const female = row.female ?? row.FEMALE ?? 0;
                  const label = age.replace('age', '').replace('-', '–').replace('65–', '65+');
                  return (
                    <tr key={age}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>{label}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{male.toFixed(1)}%</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{female.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                {!demographicAges.length && (
                  <tr>
                    <td colSpan={3} style={{ padding: 12, color: 'var(--text-dim)' }}>No demographics data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
