import { getDb } from '@/lib/db';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺', CA: '🇨🇦', DE: '🇩🇪', NL: '🇳🇱', NZ: '🇳🇿',
  ZA: '🇿🇦', IN: '🇮🇳', PH: '🇵🇭', ID: '🇮🇩', MY: '🇲🇾', SG: '🇸🇬', JP: '🇯🇵',
  KR: '🇰🇷', TH: '🇹🇭', VN: '🇻🇳', KE: '🇰🇪', NG: '🇳🇬', BR: '🇧🇷', MX: '🇲🇽',
  FR: '🇫🇷', IE: '🇮🇪', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', HK: '🇭🇰',
  TW: '🇹🇼', AE: '🇦🇪', SA: '🇸🇦', PL: '🇵🇱',
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', AU: 'Australia', CA: 'Canada',
  DE: 'Germany', NL: 'Netherlands', NZ: 'New Zealand', ZA: 'South Africa',
  IN: 'India', PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia',
  SG: 'Singapore', JP: 'Japan', KR: 'South Korea', TH: 'Thailand',
  VN: 'Vietnam', KE: 'Kenya', NG: 'Nigeria', BR: 'Brazil', MX: 'Mexico',
  FR: 'France', IE: 'Ireland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', HK: 'Hong Kong', TW: 'Taiwan', AE: 'UAE', SA: 'Saudi Arabia', PL: 'Poland',
};

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function getAnalytics90d() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM youtube_analytics WHERE period_days = 90 ORDER BY fetched_at DESC LIMIT 1').get() as any;
  if (!row) return null;
  return {
    ...row,
    top_videos: JSON.parse(row.top_videos || '[]'),
    traffic_sources: JSON.parse(row.traffic_sources || '{}'),
    demographics: JSON.parse(row.demographics || '{}'),
    geography: JSON.parse(row.geography || '[]'),
  };
}

function getBrandPartners() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT DISTINCT brand_name FROM sponsors WHERE stage = 'published' ORDER BY deal_value_gross DESC LIMIT 12").all() as any[];
    return rows.map(r => r.brand_name);
  } catch {
    return [];
  }
}

function computeDemographics(demographics: Record<string, Record<string, number>>) {
  let totalMale = 0, totalFemale = 0;
  let maxPct = 0, primaryAge = '25-34';
  
  for (const [age, genders] of Object.entries(demographics)) {
    const male = genders.male ?? 0;
    const female = genders.female ?? 0;
    totalMale += male;
    totalFemale += female;
    const total = male + female;
    if (total > maxPct) {
      maxPct = total;
      primaryAge = age.replace('age', '').replace('-', '–').replace('65–', '65+');
    }
  }
  return { male: Math.round(totalMale), female: Math.round(totalFemale), primaryAge };
}

export default function MediaKitPreviewPage() {
  const data = getAnalytics90d();
  const brands = getBrandPartners();

  if (!data) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#9da5b4' }}>
        <h2>No analytics data available</h2>
        <p>Go to the Analytics dashboard and refresh data for the 90-day period first.</p>
      </div>
    );
  }

  const demo = computeDemographics(data.demographics);
  const geoRows = (data.geography || []).slice(0, 5);
  const geoTotal = (data.geography || []).reduce((s: number, r: any) => s + r.views, 0) || 1;
  const trafficBuckets = data.traffic_sources?.buckets || {};
  const trafficTotal = Object.values(trafficBuckets).reduce((s: number, v: any) => s + (v as number), 0) || 1;
  const trafficEntries = Object.entries(trafficBuckets)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);
  const topVideos = (data.top_videos || []).slice(0, 5);

  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px 64px', background: '#0d1117', color: '#e6edf3' }}>
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #0d1117 !important; }
          .mk-shell { background: #ffffff !important; color: #0d1117 !important; }
          .mk-card { border-color: #d0d7de !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          a { color: #0d1117 !important; }
        }
      `}</style>

      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <PrintButton />
        </div>

        <div className="mk-shell" style={{ background: '#0d1117', borderRadius: 24, border: '1px solid #1f242c', padding: '36px 40px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
          {/* Header */}
          <header style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 12, color: '#f0a500', textTransform: 'uppercase', letterSpacing: 3, fontWeight: 600 }}>Media Kit</div>
            <h1 style={{ fontSize: 42, letterSpacing: 2, marginTop: 12, fontWeight: 700 }}>Andrew Fraser</h1>
            <div style={{ color: '#f0a500', fontSize: 15, marginTop: 6 }}>@Andrew_Fraser · YouTube</div>
            <p style={{ color: '#9da5b4', marginTop: 10, fontSize: 14 }}>
              Data period: {data.period_start} → {data.period_end}
            </p>
          </header>

          {/* Stats Bar */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
            {[
              { label: 'VIEWS (90D)', value: formatCompact(data.views) },
              { label: 'WATCH TIME (HRS)', value: formatCompact(data.watch_time_hours) },
              { label: 'SUBS GAINED (90D)', value: formatCompact(data.subscribers) },
              { label: 'SUBSCRIBERS', value: formatCompact(data.realtime_subscribers) },
            ].map(item => (
              <div key={item.label} className="mk-card" style={{ borderRadius: 14, border: '1px solid #1f242c', padding: '20px 18px', background: '#121821', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f0a500' }}>{item.value}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#8b949e', letterSpacing: 1.5, marginTop: 8 }}>{item.label}</div>
              </div>
            ))}
          </section>

          {/* Content Pillars */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#f0a500', fontWeight: 600, marginBottom: 12 }}>Content Pillars</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['🍜 Extreme Food', '🗺️ Travel Documentaries', '🌏 Street Culture', '🏔️ Adventure Vlogs'].map(p => (
                <span key={p} className="mk-card" style={{ padding: '10px 18px', borderRadius: 999, border: '1px solid #2c3440', background: '#121821', fontSize: 13 }}>{p}</span>
              ))}
            </div>
          </section>

          {/* Demographics + Countries */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div className="mk-card" style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 22, background: '#121821' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#f0a500', letterSpacing: 1.5, fontWeight: 600 }}>Audience Demographics</div>
              <div style={{ fontSize: 13, color: '#9da5b4', marginTop: 10 }}>Primary Age Group</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{demo.primaryAge}</div>
              <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{demo.male}%</div>
                  <div style={{ fontSize: 12, color: '#8b949e' }}>Male</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{demo.female}%</div>
                  <div style={{ fontSize: 12, color: '#8b949e' }}>Female</div>
                </div>
              </div>
            </div>
            <div className="mk-card" style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 22, background: '#121821' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#f0a500', letterSpacing: 1.5, fontWeight: 600 }}>Top Countries</div>
              <div style={{ marginTop: 14 }}>
                {geoRows.map((r: any) => (
                  <div key={r.country} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1f27' }}>
                    <span>{COUNTRY_FLAGS[r.country] || '🌍'} {COUNTRY_NAMES[r.country] || r.country}</span>
                    <span style={{ color: '#f0a500', fontWeight: 600 }}>{((r.views / geoTotal) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Traffic Sources */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#f0a500', fontWeight: 600, marginBottom: 12 }}>Traffic Sources</div>
            <div className="mk-card" style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 22, background: '#121821' }}>
              {trafficEntries.map(([name, views]) => {
                const pct = ((views as number) / trafficTotal) * 100;
                return (
                  <div key={name} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span style={{ color: '#f0a500', fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#1a1f27' }}>
                      <div style={{ height: 6, borderRadius: 3, background: '#f0a500', width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Videos */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#f0a500', fontWeight: 600, marginBottom: 12 }}>Top Performing Videos (90 Days)</div>
            <div className="mk-card" style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 22, background: '#121821' }}>
              {topVideos.map((v: any, i: number) => (
                <div key={v.videoId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < topVideos.length - 1 ? '1px solid #1a1f27' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v.title}</div>
                    <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>
                      {v.publishedAt ? v.publishedAt.slice(0, 10) : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, textAlign: 'right', flexShrink: 0 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{formatCompact(v.views)}</div>
                      <div style={{ fontSize: 10, color: '#8b949e' }}>views</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{formatCompact(v.watchTimeHours)}</div>
                      <div style={{ fontSize: 10, color: '#8b949e' }}>hours</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Brand Partners */}
          {brands.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#f0a500', fontWeight: 600, marginBottom: 12 }}>Past Brand Partners</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {brands.map((b: string) => (
                  <span key={b} className="mk-card" style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid #2c3440', background: '#121821', fontSize: 12 }}>{b}</span>
                ))}
              </div>
            </section>
          )}

          {/* Sponsorship Options */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#f0a500', fontWeight: 600, marginBottom: 12 }}>Sponsorship Options</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { title: 'Dedicated Video', copy: 'Full story integration built around a single brand partner.' },
                { title: 'First 5 Minutes', copy: 'Premium placement and strong call-to-action in the opening.' },
                { title: 'Outro Integration', copy: 'Short CTA in the final minute with pinned comment support.' },
              ].map(o => (
                <div key={o.title} className="mk-card" style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 18, background: '#121821' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{o.title}</div>
                  <div style={{ fontSize: 12, color: '#8b949e', marginTop: 6, lineHeight: 1.5 }}>{o.copy}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section style={{ borderTop: '1px solid #1f242c', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Ready to collaborate?</div>
              <div style={{ color: '#f0a500', marginTop: 6 }}>andrew@fraser.vn</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }} className="no-print">
              <a href="https://youtube.com/@Andrew_Fraser" target="_blank" rel="noreferrer" style={{ background: '#f0a500', color: '#0d1117', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                View Channel
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
