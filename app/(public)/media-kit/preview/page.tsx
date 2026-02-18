import { getMediaKitConfig, getMediaKitStats } from '@/lib/db';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

const parseJsonArray = (value: string, fallback: string[]) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseJsonObject = (value: string, fallback: { male: number; female: number }) => {
  try {
    const parsed = JSON.parse(value) as { male?: number; female?: number };
    return {
      male: Number(parsed?.male ?? fallback.male),
      female: Number(parsed?.female ?? fallback.female),
    };
  } catch {
    return fallback;
  }
};

const formatCompact = (value: number) => {
  if (value >= 1_000_000) {
    const v = value / 1_000_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}M+`;
  }
  if (value >= 1_000) {
    const v = value / 1_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}K+`;
  }
  return `${value}`;
};

export default function MediaKitPreviewPage() {
  const config = getMediaKitConfig();
  const stats = getMediaKitStats();

  const contentPillars = parseJsonArray(config.content_pillars, []);
  const topGeos = parseJsonArray(config.audience_top_geos, []);
  const gender = parseJsonObject(config.audience_gender_split, { male: 0, female: 0 });
  const topBrands = stats.top_brands;

  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px 64px', background: '#0d1117', color: '#e6edf3' }}>
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #0d1117 !important; }
          .media-kit-shell { background: #ffffff !important; color: #0d1117 !important; }
          .media-kit-card { border-color: #d0d7de !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          a { color: #0d1117 !important; text-decoration: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <PrintButton />
        </div>

        <div
          className="media-kit-shell"
          style={{
            background: '#0d1117',
            borderRadius: 24,
            border: '1px solid #1f242c',
            padding: '36px 40px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: '#f0a500', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                Media Kit
              </div>
              <h1 style={{ fontSize: 32, letterSpacing: 2, marginTop: 10 }}>{config.channel_name.toUpperCase()}</h1>
              <div style={{ marginTop: 8, color: '#f0a500', fontSize: 14 }}>
                {config.youtube_handle} · YouTube
              </div>
              <p style={{ marginTop: 12, color: '#9da5b4', maxWidth: 520, lineHeight: 1.5 }}>
                {config.niche_description}
              </p>
            </div>
            <div style={{ textAlign: 'right', color: '#9da5b4', fontSize: 12 }}>
              <div style={{ color: '#f0a500', fontWeight: 600 }}>Posting Frequency</div>
              <div style={{ marginTop: 6 }}>{config.posting_frequency}</div>
            </div>
          </header>

          <div style={{ height: 1, background: '#1f242c', margin: '28px 0' }} />

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            {[
              { label: 'Subscribers', value: formatCompact(config.subscriber_count) },
              { label: 'Avg Views', value: formatCompact(config.avg_views_per_video) },
              { label: 'Videos / Month', value: config.posting_frequency },
              { label: 'Engagement', value: `${config.avg_engagement_rate}%` },
            ].map(item => (
              <div
                key={item.label}
                className="media-kit-card"
                style={{
                  borderRadius: 14,
                  border: '1px solid #1f242c',
                  padding: '16px 18px',
                  background: '#121821',
                }}
              >
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#8b949e', letterSpacing: 1 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{item.value}</div>
              </div>
            ))}
          </section>

          <section style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8b949e' }}>
              Content Pillars
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {contentPillars.map(pillar => (
                <span
                  key={pillar}
                  className="media-kit-card"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid #2c3440',
                    background: '#121821',
                    fontSize: 12,
                  }}
                >
                  {pillar}
                </span>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
            <div className="media-kit-card" style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 18, background: '#121821' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#8b949e', letterSpacing: 1.2 }}>
                Audience
              </div>
              <div style={{ fontSize: 14, marginTop: 10 }}>Age: {config.audience_age_range}</div>
              <div style={{ fontSize: 14, marginTop: 6 }}>
                Gender: {gender.male}% Male / {gender.female}% Female
              </div>
            </div>
            <div className="media-kit-card" style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 18, background: '#121821' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#8b949e', letterSpacing: 1.2 }}>
                Top Markets
              </div>
              <div style={{ fontSize: 14, marginTop: 10 }}>{topGeos.join(' · ')}</div>
            </div>
          </section>

          <section style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8b949e' }}>
              Past Brand Partners
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {topBrands.length ? (
                topBrands.map(brand => (
                  <span
                    key={brand}
                    className="media-kit-card"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: '1px solid #2c3440',
                      background: '#121821',
                      fontSize: 12,
                    }}
                  >
                    {brand}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 13, color: '#8b949e' }}>No published sponsors yet.</span>
              )}
            </div>
          </section>

          <section style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8b949e' }}>
              Sponsorship Options
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 12 }}>
              {[
                { title: 'Dedicated Video', copy: 'Full story integration built around a single brand partner.' },
                { title: 'First 5 Minutes', copy: 'Premium placement and strong call-to-action in the opening.' },
                { title: 'Outro Integration', copy: 'Short CTA in the final minute with pinned comment support.' },
              ].map(option => (
                <div
                  key={option.title}
                  className="media-kit-card"
                  style={{ border: '1px solid #1f242c', borderRadius: 16, padding: 18, background: '#121821' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{option.title}</div>
                  <div style={{ fontSize: 12, color: '#8b949e', marginTop: 6, lineHeight: 1.4 }}>{option.copy}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 32, borderTop: '1px solid #1f242c', paddingTop: 24, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Ready to collaborate?</div>
              <div style={{ color: '#f0a500', marginTop: 6 }}>{config.contact_email}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href={config.channel_url}
                className="no-print"
                style={{
                  background: '#121821',
                  color: '#e6edf3',
                  border: '1px solid #2c3440',
                  borderRadius: 999,
                  padding: '10px 16px',
                  fontSize: 12,
                  textDecoration: 'none',
                }}
                target="_blank"
                rel="noreferrer"
              >
                Watch Latest Video
              </a>
              <a
                href={config.channel_url}
                className="no-print"
                style={{
                  background: '#f0a500',
                  color: '#0d1117',
                  borderRadius: 999,
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
                target="_blank"
                rel="noreferrer"
              >
                View Channel
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
