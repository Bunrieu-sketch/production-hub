import { getDb } from '@/lib/db';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

/* ── helpers ─────────────────────────────────────────────────── */

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺', CA: '🇨🇦', DE: '🇩🇪', NL: '🇳🇱', NZ: '🇳🇿',
  ZA: '🇿🇦', IN: '🇮🇳', PH: '🇵🇭', ID: '🇮🇩', MY: '🇲🇾', SG: '🇸🇬', JP: '🇯🇵',
  KR: '🇰🇷', TH: '🇹🇭', VN: '🇻🇳', KE: '🇰🇪', NG: '🇳🇬', BR: '🇧🇷', MX: '🇲🇽',
  FR: '🇫🇷', IE: '🇮🇪', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', HK: '🇭🇰',
  IT: '🇮🇹', ES: '🇪🇸', PL: '🇵🇱', PT: '🇵🇹', RO: '🇷🇴', CZ: '🇨🇿', AT: '🇦🇹',
  CH: '🇨🇭', BE: '🇧🇪', TW: '🇹🇼', AE: '🇦🇪', SA: '🇸🇦',
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', AU: 'Australia', CA: 'Canada',
  DE: 'Germany', NL: 'Netherlands', NZ: 'New Zealand', ZA: 'South Africa',
  IN: 'India', PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia',
  SG: 'Singapore', JP: 'Japan', KR: 'South Korea', TH: 'Thailand',
  VN: 'Vietnam', KE: 'Kenya', NG: 'Nigeria', BR: 'Brazil',
  MX: 'Mexico', FR: 'France', IE: 'Ireland', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', HK: 'Hong Kong',
  IT: 'Italy', ES: 'Spain', PL: 'Poland', PT: 'Portugal',
  RO: 'Romania', CZ: 'Czech Republic', AT: 'Austria', CH: 'Switzerland',
  BE: 'Belgium', TW: 'Taiwan', AE: 'UAE', SA: 'Saudi Arabia',
};

const TRAFFIC_LABELS: Record<string, string> = {
  browse: 'Browse Features',
  suggested: 'Suggested Videos',
  search: 'YouTube Search',
  external: 'External',
  channelPages: 'Channel Pages',
  others: 'Other',
  shorts: 'Shorts Feed',
  notifications: 'Notifications',
};

type TopVideo = { videoId: string; title: string; views: number; watchTimeHours: number };
type GeoRow = { country: string; views: number };
type DemoRow = Record<string, Record<string, number>>;
type TrafficData = { totals?: number; percentages?: Record<string, number> };

/* ── data fetching ──────────────────────────────────────────── */

function getAnalytics90d() {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM youtube_analytics WHERE period_days = 90 ORDER BY fetched_at DESC LIMIT 1'
  ).get() as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    views: row.views as number,
    watchTimeHours: row.watch_time_hours as number,
    subscribersGained: row.subscribers as number,
    currentSubscribers: row.realtime_subscribers as number,
    topVideos: JSON.parse((row.top_videos as string) || '[]') as TopVideo[],
    trafficSources: JSON.parse((row.traffic_sources as string) || '{}') as TrafficData,
    demographics: JSON.parse((row.demographics as string) || '{}') as DemoRow,
    geography: JSON.parse((row.geography as string) || '[]') as GeoRow[],
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
  };
}

function getBrandPartners(): string[] {
  const db = getDb();
  try {
    return (db.prepare(
      "SELECT DISTINCT brand_name FROM sponsors WHERE stage = 'published' ORDER BY deal_value_gross DESC LIMIT 12"
    ).all() as { brand_name: string }[]).map(r => r.brand_name);
  } catch {
    return [];
  }
}

/* ── styles ─────────────────────────────────────────────────── */

const gold = '#f0a500';
const bg = '#0d1117';
const card = '#161b22';
const border = '#30363d';
const textPrimary = '#e6edf3';
const textDim = '#8b949e';

const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5,
  color: gold, marginBottom: 16,
};

const cardStyle: React.CSSProperties = {
  background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 24,
};

/* ── page ───────────────────────────────────────────────────── */

export default function MediaKitPreview() {
  const analytics = getAnalytics90d();
  const brandPartners = getBrandPartners();

  if (!analytics) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: textDim }}>
        <h2>No analytics data available</h2>
        <p>Run a 90-day analytics refresh from the dashboard first.</p>
      </div>
    );
  }

  // Demographics: sum male/female across all age brackets
  let totalMale = 0, totalFemale = 0;
  let topAgeBracket = '', topAgePct = 0;
  for (const [bracket, data] of Object.entries(analytics.demographics)) {
    const male = data.male || 0;
    const female = data.female || 0;
    totalMale += male;
    totalFemale += female;
    const total = male + female + (data.genderUserSpecified || 0);
    if (total > topAgePct) {
      topAgePct = total;
      topAgeBracket = bracket.replace('age', '');
    }
  }
  const genderTotal = totalMale + totalFemale || 1;

  // Traffic sources
  const trafficEntries = Object.entries(analytics.trafficSources.percentages || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Top 5 countries
  const topCountries = analytics.geography.slice(0, 5);
  const totalGeoViews = analytics.geography.reduce((s, g) => s + g.views, 0) || 1;

  // Top 5 videos
  const topVideos = analytics.topVideos.slice(0, 5);

  const stats = [
    { label: 'Views (90d)', value: formatCompact(analytics.views) },
    { label: 'Watch Time (hrs)', value: formatCompact(Math.round(analytics.watchTimeHours)) },
    { label: 'Subs Gained (90d)', value: formatCompact(analytics.subscribersGained) },
    { label: 'Subscribers', value: formatCompact(analytics.currentSubscribers) },
  ];

  const pillars = ['Extreme Food', 'Travel Documentaries', 'Street Culture', 'Adventure Vlogs'];

  const sponsorshipOptions = [
    { title: 'Dedicated Video', desc: 'Full video built around your brand story', price: 'From $15,000' },
    { title: 'Integrated Segment', desc: '60-90s native integration within a video', price: 'From $6,000' },
    { title: 'Series Sponsorship', desc: 'Title sponsor across a multi-episode series', price: 'Custom' },
    { title: 'Product Placement', desc: 'Organic product use during filming', price: 'From $3,000' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          Media Kit
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: textPrimary, margin: '0 0 8px' }}>
          Andrew Fraser
        </h1>
        <p style={{ fontSize: 18, color: textDim, margin: 0 }}>
          <a href="https://youtube.com/@Andrew_Fraser" style={{ color: textDim, textDecoration: 'none' }}>
            @Andrew_Fraser
          </a>
        </p>
        <p style={{ fontSize: 14, color: textDim, marginTop: 4 }}>
          Data period: {analytics.periodStart} → {analytics.periodEnd}
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: gold }}>{s.value}</div>
            <div style={{ fontSize: 12, color: textDim, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content Pillars */}
      <div style={{ marginBottom: 40 }}>
        <div style={sectionTitle}>Content Pillars</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {pillars.map(p => (
            <div key={p} style={{ ...cardStyle, textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{p}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audience: Demographics + Geography side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
        {/* Demographics */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Audience Demographics</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: textDim, marginBottom: 4 }}>Primary Age Group</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: textPrimary }}>{topAgeBracket}</div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#58a6ff' }}>
                {Math.round(totalMale / genderTotal * 100)}%
              </div>
              <div style={{ fontSize: 12, color: textDim }}>Male</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f778ba' }}>
                {Math.round(totalFemale / genderTotal * 100)}%
              </div>
              <div style={{ fontSize: 12, color: textDim }}>Female</div>
            </div>
          </div>
        </div>

        {/* Geography */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Top Countries</div>
          {topCountries.map(g => {
            const pct = (g.views / totalGeoViews * 100).toFixed(1);
            return (
              <div key={g.country} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${border}` }}>
                <span style={{ fontSize: 14, color: textPrimary }}>
                  {COUNTRY_FLAGS[g.country] || '🏳️'} {COUNTRY_NAMES[g.country] || g.country}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: gold }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Traffic Sources */}
      <div style={{ marginBottom: 40 }}>
        <div style={sectionTitle}>Traffic Sources</div>
        <div style={cardStyle}>
          {trafficEntries.map(([key, pct]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: textPrimary }}>{TRAFFIC_LABELS[key] || key}</span>
                <span style={{ color: gold, fontWeight: 600 }}>{(pct * 100).toFixed(1)}%</span>
              </div>
              <div style={{ background: border, borderRadius: 4, height: 6 }}>
                <div style={{ background: gold, borderRadius: 4, height: 6, width: `${Math.min(pct * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Videos */}
      <div style={{ marginBottom: 40 }}>
        <div style={sectionTitle}>Top Videos (90 Days)</div>
        <div style={cardStyle}>
          {topVideos.map((v, i) => (
            <div key={v.videoId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < topVideos.length - 1 ? `1px solid ${border}` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: gold, marginLeft: 16, whiteSpace: 'nowrap' }}>
                {formatCompact(v.views)} views
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sponsorship Options */}
      <div style={{ marginBottom: 40 }}>
        <div style={sectionTitle}>Sponsorship Options</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {sponsorshipOptions.map(o => (
            <div key={o.title} style={cardStyle}>
              <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>{o.title}</div>
              <div style={{ fontSize: 13, color: textDim, marginBottom: 12 }}>{o.desc}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: gold }}>{o.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Partners */}
      {brandPartners.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={sectionTitle}>Past Brand Partners</div>
          <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {brandPartners.map(b => (
              <span key={b} style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${border}`, fontSize: 13, color: textPrimary, fontWeight: 500 }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={sectionTitle}>Get in Touch</div>
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 600, color: textPrimary, marginBottom: 8 }}>
            andrew@fraser.vn
          </div>
          <div style={{ fontSize: 14, color: textDim }}>
            <a href="https://youtube.com/@Andrew_Fraser" style={{ color: gold, textDecoration: 'none' }}>
              youtube.com/@Andrew_Fraser
            </a>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div style={{ textAlign: 'center', marginBottom: 40 }} className="no-print">
        <PrintButton />
      </div>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
