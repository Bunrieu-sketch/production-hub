import { getDb } from '@/lib/db';
import { PrintButton } from './PrintButton';
import { ScaleWrapper } from './ScaleWrapper';

export const dynamic = 'force-dynamic';

/* ─── Constants ─── */
const SLIDE = { width: 1440, height: 810 } as const;
const C = {
  navy: '#1a2a3a', navyDark: '#0f1f2f', cream: '#f5f0e8', gold: '#f4c430',
  textLight: '#e6edf3', textMuted: '#8b949e', teal: '#264653', purple: '#a855c7',
  white: '#ffffff',
} as const;

const COUNTRY_FLAGS: Record<string, string> = {
  US:'🇺🇸',GB:'🇬🇧',AU:'🇦🇺',CA:'🇨🇦',DE:'🇩🇪',NL:'🇳🇱',NZ:'🇳🇿',ZA:'🇿🇦',IN:'🇮🇳',
  PH:'🇵🇭',ID:'🇮🇩',MY:'🇲🇾',SG:'🇸🇬',JP:'🇯🇵',KR:'🇰🇷',TH:'🇹🇭',VN:'🇻🇳',KE:'🇰🇪',
  NG:'🇳🇬',BR:'🇧🇷',MX:'🇲🇽',FR:'🇫🇷',IE:'🇮🇪',SE:'🇸🇪',NO:'🇳🇴',DK:'🇩🇰',FI:'🇫🇮',
  HK:'🇭🇰',TW:'🇹🇼',AE:'🇦🇪',SA:'🇸🇦',PL:'🇵🇱',
};
const COUNTRY_NAMES: Record<string, string> = {
  US:'United States',GB:'United Kingdom',AU:'Australia',CA:'Canada',DE:'Germany',
  NL:'Netherlands',NZ:'New Zealand',ZA:'South Africa',IN:'India',PH:'Philippines',
  ID:'Indonesia',MY:'Malaysia',SG:'Singapore',JP:'Japan',KR:'South Korea',TH:'Thailand',
  VN:'Vietnam',KE:'Kenya',NG:'Nigeria',BR:'Brazil',MX:'Mexico',FR:'France',IE:'Ireland',
  SE:'Sweden',NO:'Norway',DK:'Denmark',FI:'Finland',HK:'Hong Kong',TW:'Taiwan',AE:'UAE',
  SA:'Saudi Arabia',PL:'Poland',
};

/* ─── Helpers ─── */
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
function fmtNum(n: number) { return new Intl.NumberFormat('en-US').format(Math.round(n)); }

function slideStyle(extra?: React.CSSProperties): React.CSSProperties {
  return { width: SLIDE.width, height: SLIDE.height, position: 'relative', overflow: 'hidden', ...extra };
}

const label: React.CSSProperties = {
  textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11, fontWeight: 600,
};

const goldLine = <div style={{ width: 40, height: 3, background: C.gold, marginTop: 8, marginBottom: 16 }} />;

/* ─── Data ─── */
function getAnalytics() {
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

function getBrands() {
  try {
    const db = getDb();
    return (db.prepare("SELECT DISTINCT brand_name FROM sponsors WHERE stage = 'published' ORDER BY deal_value_gross DESC LIMIT 12").all() as any[]).map(r => r.brand_name);
  } catch { return []; }
}

function getEpisodes() {
  try {
    const db = getDb();
    return db.prepare("SELECT title, status, target_publish_date FROM episodes WHERE status != 'published' ORDER BY target_publish_date ASC LIMIT 12").all() as any[];
  } catch { return []; }
}

function computeDemo(demographics: Record<string, Record<string, number>>) {
  const ages: { age: string; male: number; female: number; total: number }[] = [];
  let totalMale = 0, totalFemale = 0;
  for (const [age, g] of Object.entries(demographics)) {
    const m = g.male ?? 0, f = g.female ?? 0;
    totalMale += m; totalFemale += f;
    const cleanAge = age.replace('age', '').replace('-', '–').replace('65–', '65+');
    ages.push({ age: cleanAge, male: m, female: f, total: m + f });
  }
  ages.sort((a, b) => {
    const na = parseInt(a.age), nb = parseInt(b.age);
    return na - nb;
  });
  return { ages, male: Math.round(totalMale), female: Math.round(totalFemale) };
}

/* ─── Logo component ─── */
function Logo({ size = 80 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: C.purple,
      border: `3px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, fontWeight: 700, color: C.white,
    }}>A</div>
  );
}

/* ─── Page ─── */
export default function MediaKitPreviewPage() {
  const data = getAnalytics();
  const brands = getBrands();
  const episodes = getEpisodes();

  if (!data) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: C.textMuted }}>
        <h2>No analytics data available</h2>
        <p>Refresh 90-day analytics data first.</p>
      </div>
    );
  }

  const demo = computeDemo(data.demographics);
  const geo = (data.geography || []) as { country: string; views: number; watchTimeMinutes: number }[];
  const geoTotal = geo.reduce((s, r) => s + r.views, 0) || 1;
  const usGeo = geo.find(r => r.country === 'US');
  const trafficBuckets = data.traffic_sources?.buckets || {};
  const trafficTotal = Object.values(trafficBuckets).reduce((s: number, v: any) => s + (v as number), 0) || 1;
  const trafficEntries = Object.entries(trafficBuckets).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 6);
  const avgWatchMin = data.views > 0 ? (data.watch_time_hours / data.views * 60) : 0;
  const topVideoViews = data.top_videos.length > 0 ? Math.max(...data.top_videos.map((v: any) => v.views)) : 0;

  return (
    <div style={{ padding: '24px 16px 64px' }}>
      <style>{`
        @page { size: landscape; margin: 0; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .slide { break-after: page; box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ textAlign: 'center', marginBottom: 24 }}>
        <PrintButton />
      </div>

      <ScaleWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>

          {/* ═══ SLIDE 1: COVER ═══ */}
          <div className="slide" style={slideStyle({ display: 'flex', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' })}>
            {/* Left sidebar */}
            <div style={{ width: '30%', background: C.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Logo size={90} />
              <div style={{ fontSize: 18, fontWeight: 700, color: C.textLight, marginTop: 20, letterSpacing: '0.05em' }}>ANDREW FRASER</div>
              <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginTop: 6, letterSpacing: '0.1em' }}>EXTREME TRAVEL</div>
              <div style={{ width: 40, height: 2, background: C.gold, margin: '16px 0' }} />
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.1em', textAlign: 'center' }}>DOCUMENTARY · ADVENTURE · CULTURE</div>
            </div>
            {/* Right content */}
            <div style={{ width: '70%', background: C.navyDark, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 70px' }}>
              <div style={{ ...label, color: C.gold, fontSize: 12, marginBottom: 16 }}>MEDIA KIT</div>
              <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, color: C.textLight }}>SPONSOR</div>
              <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, color: C.gold }}>PACKAGE.</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 20 }}>
                {data.period_start} → {data.period_end} · 90-Day Performance
              </div>
              {/* Bottom stats */}
              <div style={{ display: 'flex', gap: 40, marginTop: 'auto', paddingTop: 40 }}>
                {[
                  { l: 'SUBSCRIBERS', v: fmt(data.realtime_subscribers) },
                  { l: 'VIEWS', v: fmt(data.views) },
                  { l: 'AVG WATCH TIME', v: `${avgWatchMin.toFixed(1)} min` },
                  { l: 'ENGAGEMENT', v: '4.8%' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: C.textLight }}>{s.v}</div>
                    <div style={{ ...label, fontSize: 9, color: C.textMuted, marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ SLIDE 2: CHANNEL SNAPSHOT ═══ */}
          <div className="slide" style={slideStyle({ display: 'flex', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' })}>
            {/* Left sidebar */}
            <div style={{ width: '20%', background: C.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
              <Logo size={56} />
              <div style={{ fontSize: 24, fontWeight: 700, color: C.textLight, marginTop: 16 }}>{fmt(data.realtime_subscribers)}</div>
              <div style={{ ...label, fontSize: 9, color: C.textMuted, marginTop: 4 }}>SUBSCRIBERS</div>
              <div style={{ width: 30, height: 2, background: C.gold, margin: '24px 0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>GENDER SPLIT</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.textLight }}>{demo.male}%</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>Male</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.textLight, marginTop: 8 }}>{demo.female}%</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>Female</div>
              </div>
            </div>

            {/* Main content */}
            <div style={{ width: '55%', background: C.cream, padding: 36 }}>
              <div style={{ ...label, color: C.navy, fontSize: 13 }}>CHANNEL SNAPSHOT</div>
              {goldLine}

              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  { l: 'TOTAL VIEWS', v: fmt(data.views), c: '#3b82f6' },
                  { l: 'WATCH TIME (HRS)', v: fmt(data.watch_time_hours), c: '#10b981' },
                  { l: 'SUBS GAINED', v: fmt(data.subscribers), c: '#f59e0b' },
                  { l: 'TOP VIDEO VIEWS', v: fmt(topVideoViews), c: '#ef4444' },
                ].map(s => (
                  <div key={s.l} style={{ background: C.white, borderRadius: 8, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `5px solid ${s.c}` }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.navy }}>{s.v}</div>
                    <div style={{ ...label, fontSize: 9, color: C.textMuted, marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Traffic Sources */}
              <div style={{ ...label, fontSize: 10, color: C.navy, marginBottom: 8 }}>TRAFFIC SOURCES</div>
              <div style={{ background: C.white, borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {trafficEntries.map(([name, views]) => {
                  const pct = ((views as number) / trafficTotal) * 100;
                  return (
                    <div key={name} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: C.navy }}>{name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        <span style={{ color: C.textMuted, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: '#e5e7eb' }}>
                        <div style={{ height: 5, borderRadius: 3, background: C.gold, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Age Demographics */}
            <div style={{ width: '25%', background: C.white, padding: '36px 24px', borderLeft: `1px solid #e5e7eb` }}>
              <div style={{ ...label, fontSize: 10, color: C.navy }}>AGE DEMOGRAPHICS</div>
              {goldLine}
              {demo.ages.map(a => {
                const maxTotal = Math.max(...demo.ages.map(x => x.total));
                const barW = maxTotal > 0 ? (a.total / maxTotal) * 100 : 0;
                return (
                  <div key={a.age} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: C.navy }}>{a.age}</span>
                      <span style={{ color: C.textMuted }}>{a.total.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: '#f0f0f0' }}>
                      <div style={{ height: 8, borderRadius: 4, background: C.navy, width: `${barW}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ SLIDE 3: AUDIENCE GEOGRAPHY ═══ */}
          <div className="slide" style={slideStyle({ display: 'flex', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' })}>
            {/* Left: Featured US */}
            <div style={{ width: '25%', background: C.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 36 }}>
              <div style={{ ...label, color: C.gold, fontSize: 10, marginBottom: 12 }}>TOP MARKET</div>
              <div style={{ fontSize: 60 }}>{COUNTRY_FLAGS.US || '🇺🇸'}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textLight, marginTop: 12 }}>United States</div>
              <div style={{ width: 30, height: 2, background: C.gold, margin: '16px 0' }} />
              {usGeo && (
                <>
                  <div style={{ fontSize: 36, fontWeight: 700, color: C.gold }}>{((usGeo.views / geoTotal) * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>OF ALL VIEWS</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.textLight, marginTop: 16 }}>{fmt(usGeo.views)}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>VIEWS</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.textLight, marginTop: 12 }}>{(usGeo.watchTimeMinutes / 60).toFixed(0)}h</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>WATCH TIME</div>
                </>
              )}
            </div>

            {/* Right: Data table */}
            <div style={{ width: '75%', background: C.teal, padding: '36px 48px' }}>
              <div style={{ ...label, color: C.gold, fontSize: 13 }}>AUDIENCE GEOGRAPHY</div>
              {goldLine}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid rgba(255,255,255,0.15)` }}>
                    {['#', 'COUNTRY', 'VIEWS', 'SHARE', 'WATCH TIME'].map(h => (
                      <th key={h} style={{ ...label, fontSize: 9, color: C.gold, textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {geo.slice(0, 15).map((r, i) => (
                    <tr key={r.country} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={{ padding: '7px 6px', color: C.textMuted, fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: '7px 6px', color: C.textLight, fontWeight: 500 }}>
                        {COUNTRY_FLAGS[r.country] || '🌍'} {COUNTRY_NAMES[r.country] || r.country}
                      </td>
                      <td style={{ padding: '7px 6px', color: C.textLight }}>{fmtNum(r.views)}</td>
                      <td style={{ padding: '7px 6px', color: C.gold, fontWeight: 600 }}>{((r.views / geoTotal) * 100).toFixed(1)}%</td>
                      <td style={{ padding: '7px 6px', color: C.textLight }}>{fmtNum(Math.round(r.watchTimeMinutes / 60))}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ SLIDE 4: UPCOMING CONTENT SLATE ═══ */}
          <div className="slide" style={slideStyle({ background: C.cream, padding: 48, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' })}>
            <div style={{ ...label, color: C.navy, fontSize: 15 }}>UPCOMING CONTENT SLATE</div>
            {goldLine}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 8 }}>
              {(episodes.length > 0 ? episodes : Array.from({ length: 12 }, (_, i) => ({
                title: `Episode ${i + 1} — TBD`, status: ['idea', 'filming', 'editing'][i % 3], target_publish_date: null,
              }))).slice(0, 12).map((ep: any, i: number) => {
                const statusColors: Record<string, string> = { idea: C.navy, filming: '#06b6d4', editing: C.gold, draft: '#8b5cf6' };
                const borderColor = statusColors[ep.status] || C.navy;
                return (
                  <div key={i} style={{
                    background: C.white, borderRadius: 8, padding: '16px 14px', borderLeft: `5px solid ${borderColor}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, lineHeight: 1.4, minHeight: 34 }}>
                      {ep.title}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}>
                      {ep.target_publish_date || '—'}
                    </div>
                    <span style={{
                      display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 600,
                      ...label, padding: '3px 8px', borderRadius: 4,
                      background: borderColor, color: borderColor === C.gold ? C.navy : C.white,
                    }}>{(ep.status || 'IDEA').toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ SLIDE 5: PAST BRAND INTEGRATIONS ═══ */}
          <div className="slide" style={slideStyle({ background: C.cream, padding: 48, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' })}>
            <div style={{ ...label, color: C.navy, fontSize: 15 }}>PAST BRAND INTEGRATIONS</div>
            {goldLine}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 8 }}>
              {(brands.length > 0 ? brands : ['Brand A', 'Brand B', 'Brand C', 'Brand D']).slice(0, 4).map((b: string, i: number) => (
                <div key={i} style={{ background: C.white, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <div style={{
                    height: 160, background: `linear-gradient(135deg, #667eea, #764ba2)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 48, color: 'rgba(255,255,255,0.3)', fontWeight: 700,
                  }}>▶</div>
                  <div style={{ padding: '18px 16px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>{b}</div>
                    <span style={{
                      display: 'inline-block', marginTop: 8, fontSize: 9, ...label,
                      padding: '4px 10px', borderRadius: 4, background: C.gold, color: C.navy,
                    }}>INTEGRATION</span>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>
                      Branded content integration across travel documentary series.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ SLIDE 6: CONTACT ═══ */}
          <div className="slide" style={slideStyle({ display: 'flex', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' })}>
            {/* Left */}
            <div style={{ width: '70%', background: C.navy, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px' }}>
              <div style={{ ...label, color: C.gold, fontSize: 11, marginBottom: 20 }}>READY TO COLLABORATE?</div>
              <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, color: C.textLight }}>LET'S WORK</div>
              <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, color: C.gold }}>TOGETHER.</div>
              <div style={{ width: 60, height: 4, background: C.gold, marginTop: 24, marginBottom: 32 }} />
              <div style={{ fontSize: 16, color: C.textLight, marginBottom: 8 }}>
                ✉️ andrew@fraser.vn
              </div>
              <div style={{ fontSize: 16, color: C.textLight, marginBottom: 8 }}>
                🎬 youtube.com/@Andrew_Fraser
              </div>
              <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8 }}>
                {fmt(data.realtime_subscribers)} subscribers · {fmt(data.views)} views (90d)
              </div>
            </div>
            {/* Right */}
            <div style={{ width: '30%', background: C.navyDark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Logo size={80} />
              <div style={{ fontSize: 16, fontWeight: 700, color: C.textLight, marginTop: 20, letterSpacing: '0.05em' }}>ANDREW FRASER</div>
              <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginTop: 6, letterSpacing: '0.1em' }}>EXTREME TRAVEL</div>
              <div style={{ width: 30, height: 2, background: C.gold, margin: '20px 0' }} />
              <div style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
                Represented by<br />
                <span style={{ color: C.textLight, fontWeight: 600 }}>Andrew Fraser Media</span><br />
                Ho Chi Minh City, Vietnam
              </div>
            </div>
          </div>

        </div>
      </ScaleWrapper>
    </div>
  );
}
