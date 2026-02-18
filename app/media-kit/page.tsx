'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Copy } from 'lucide-react';

interface MediaKitConfigApi {
  youtube_handle: string;
  channel_name: string;
  subscriber_count: number;
  avg_views_per_video: number;
  avg_engagement_rate: number;
  niche_description: string;
  content_pillars: string;
  audience_age_range: string;
  audience_gender_split: string;
  audience_top_geos: string;
  posting_frequency: string;
  channel_url: string;
  instagram_handle: string;
  tiktok_handle: string;
  contact_email: string;
  updated_at: string;
}

interface MediaKitStats {
  total_sponsors: number;
  total_revenue: number;
  avg_deal_value: number;
  top_brands: string[];
}

interface MediaKitForm {
  youtube_handle: string;
  channel_name: string;
  subscriber_count: number;
  avg_views_per_video: number;
  avg_engagement_rate: number;
  niche_description: string;
  content_pillars: string[];
  audience_age_range: string;
  audience_gender_split: { male: number; female: number };
  audience_top_geos: string[];
  posting_frequency: string;
  channel_url: string;
  instagram_handle: string;
  tiktok_handle: string;
  contact_email: string;
}

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

export default function MediaKitPage() {
  const [form, setForm] = useState<MediaKitForm | null>(null);
  const [stats, setStats] = useState<MediaKitStats | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pillarInput, setPillarInput] = useState('');
  const [geoInput, setGeoInput] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  const normalizeFromApi = (config: MediaKitConfigApi): MediaKitForm => ({
    youtube_handle: config.youtube_handle,
    channel_name: config.channel_name,
    subscriber_count: Number(config.subscriber_count),
    avg_views_per_video: Number(config.avg_views_per_video),
    avg_engagement_rate: Number(config.avg_engagement_rate),
    niche_description: config.niche_description,
    content_pillars: parseJsonArray(config.content_pillars, []),
    audience_age_range: config.audience_age_range,
    audience_gender_split: parseJsonObject(config.audience_gender_split, { male: 0, female: 0 }),
    audience_top_geos: parseJsonArray(config.audience_top_geos, []),
    posting_frequency: config.posting_frequency,
    channel_url: config.channel_url,
    instagram_handle: config.instagram_handle,
    tiktok_handle: config.tiktok_handle,
    contact_email: config.contact_email,
  });

  useEffect(() => {
    fetch('/api/media-kit')
      .then(res => res.json())
      .then(({ config, stats: statsPayload }) => {
        const normalized = normalizeFromApi(config as MediaKitConfigApi);
        setForm(normalized);
        setStats(statsPayload as MediaKitStats);
        setPillarInput(normalized.content_pillars.join(', '));
        setGeoInput(normalized.audience_top_geos.join(', '));
      });
  }, []);

  const savePartial = async (partial: Partial<MediaKitForm>) => {
    if (!form) return;
    setStatus('saving');

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (value === undefined) continue;
      if (key === 'content_pillars' || key === 'audience_top_geos' || key === 'audience_gender_split') {
        payload[key] = JSON.stringify(value);
      } else {
        payload[key] = value;
      }
    }

    try {
      const res = await fetch('/api/media-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const updated = normalizeFromApi(data.config as MediaKitConfigApi);
      setForm(updated);
      setPillarInput(updated.content_pillars.join(', '));
      setGeoInput(updated.audience_top_geos.join(', '));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1200);
    } catch {
      setStatus('error');
    }
  };

  const topBrands = useMemo(() => stats?.top_brands || [], [stats]);

  if (!form) {
    return <div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading media kit...</div>;
  }

  const handlePillarBlur = () => {
    const items = pillarInput
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    setForm(prev => prev ? { ...prev, content_pillars: items } : prev);
    savePartial({ content_pillars: items });
  };

  const handleGeoBlur = () => {
    const items = geoInput
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    setForm(prev => prev ? { ...prev, audience_top_geos: items } : prev);
    savePartial({ audience_top_geos: items });
  };

  const previewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/media-kit/preview`
    : '/media-kit/preview';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopyNotice('Copied preview link');
      setTimeout(() => setCopyNotice(''), 1500);
    } catch {
      setCopyNotice('Copy failed');
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Media Kit Generator</h1>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            Auto-saves on blur · {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save failed' : 'Ready'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => window.open('/media-kit/preview', '_blank')}>
            <ExternalLink size={14} /> Open Media Kit Preview
          </button>
          <button className="btn btn-primary" onClick={handleCopy}>
            <Copy size={14} /> Copy Preview Link
          </button>
        </div>
      </div>

      {copyNotice && (
        <div style={{ fontSize: 12, color: 'var(--accent)' }}>{copyNotice}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 12 }}>
            Live Preview
          </div>
          <div style={{ background: '#0d1117', borderRadius: 14, padding: 24, border: '1px solid #2a2f36' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{form.channel_name.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#f0a500', marginTop: 4 }}>{form.youtube_handle} · YouTube</div>
                <div style={{ fontSize: 12, color: '#9da5b4', marginTop: 8, maxWidth: 420 }}>
                  {form.niche_description}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#f0a500' }}>{form.posting_frequency}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Subscribers', value: formatCompact(form.subscriber_count) },
                { label: 'Avg Views', value: formatCompact(form.avg_views_per_video) },
                { label: 'Engagement', value: `${form.avg_engagement_rate}%` },
                { label: 'Videos/Month', value: form.posting_frequency },
              ].map(item => (
                <div key={item.label} style={{ background: '#121821', border: '1px solid #1f2630', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#8b949e' }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#8b949e', marginBottom: 6 }}>Content Pillars</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {form.content_pillars.map((pillar) => (
                  <span key={pillar} style={{ padding: '6px 10px', borderRadius: 999, background: '#1a2029', border: '1px solid #2c3440', fontSize: 11 }}>
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#121821', borderRadius: 10, padding: 12, border: '1px solid #1f2630' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#8b949e' }}>Audience</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Age: {form.audience_age_range}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Gender: {form.audience_gender_split.male}% Male / {form.audience_gender_split.female}% Female
                </div>
              </div>
              <div style={{ background: '#121821', borderRadius: 10, padding: 12, border: '1px solid #1f2630' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#8b949e' }}>Top Markets</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {form.audience_top_geos.join(' · ')}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#8b949e', marginBottom: 6 }}>Past Brand Partners</div>
              {topBrands.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {topBrands.map(brand => (
                    <span key={brand} style={{ padding: '6px 10px', borderRadius: 999, background: '#1a2029', border: '1px solid #2c3440', fontSize: 11 }}>
                      {brand}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#8b949e' }}>No published sponsors yet.</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Channel Stats</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Subscribers</label>
                  <input
                    type="number"
                    value={form.subscriber_count}
                    onChange={e => setForm({ ...form, subscriber_count: Number(e.target.value) })}
                    onBlur={() => savePartial({ subscriber_count: form.subscriber_count })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Avg Views</label>
                  <input
                    type="number"
                    value={form.avg_views_per_video}
                    onChange={e => setForm({ ...form, avg_views_per_video: Number(e.target.value) })}
                    onBlur={() => savePartial({ avg_views_per_video: form.avg_views_per_video })}
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Engagement %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.avg_engagement_rate}
                    onChange={e => setForm({ ...form, avg_engagement_rate: Number(e.target.value) })}
                    onBlur={() => savePartial({ avg_engagement_rate: form.avg_engagement_rate })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Posting Frequency</label>
                  <input
                    value={form.posting_frequency}
                    onChange={e => setForm({ ...form, posting_frequency: e.target.value })}
                    onBlur={() => savePartial({ posting_frequency: form.posting_frequency })}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>About</div>
              <div className="form-group">
                <label className="form-label">Channel Name</label>
                <input
                  value={form.channel_name}
                  onChange={e => setForm({ ...form, channel_name: e.target.value })}
                  onBlur={() => savePartial({ channel_name: form.channel_name })}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">YouTube Handle</label>
                  <input
                    value={form.youtube_handle}
                    onChange={e => setForm({ ...form, youtube_handle: e.target.value })}
                    onBlur={() => savePartial({ youtube_handle: form.youtube_handle })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Channel URL</label>
                  <input
                    value={form.channel_url}
                    onChange={e => setForm({ ...form, channel_url: e.target.value })}
                    onBlur={() => savePartial({ channel_url: form.channel_url })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Niche Description</label>
                <textarea
                  rows={3}
                  value={form.niche_description}
                  onChange={e => setForm({ ...form, niche_description: e.target.value })}
                  onBlur={() => savePartial({ niche_description: form.niche_description })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content Pillars</label>
                <input
                  value={pillarInput}
                  onChange={e => setPillarInput(e.target.value)}
                  onBlur={handlePillarBlur}
                  placeholder="Extreme Food, Travel Documentaries, Street Culture"
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.content_pillars.map(pillar => (
                    <span key={pillar} style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11 }}>
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Instagram Handle</label>
                  <input
                    value={form.instagram_handle}
                    onChange={e => setForm({ ...form, instagram_handle: e.target.value })}
                    onBlur={() => savePartial({ instagram_handle: form.instagram_handle })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    onBlur={() => savePartial({ contact_email: form.contact_email })}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Audience</div>
              <div className="form-group">
                <label className="form-label">Age Range</label>
                <input
                  value={form.audience_age_range}
                  onChange={e => setForm({ ...form, audience_age_range: e.target.value })}
                  onBlur={() => savePartial({ audience_age_range: form.audience_age_range })}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Male %</label>
                  <input
                    type="number"
                    value={form.audience_gender_split.male}
                    onChange={e => setForm({
                      ...form,
                      audience_gender_split: { ...form.audience_gender_split, male: Number(e.target.value) },
                    })}
                    onBlur={() => savePartial({ audience_gender_split: form.audience_gender_split })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Female %</label>
                  <input
                    type="number"
                    value={form.audience_gender_split.female}
                    onChange={e => setForm({
                      ...form,
                      audience_gender_split: { ...form.audience_gender_split, female: Number(e.target.value) },
                    })}
                    onBlur={() => savePartial({ audience_gender_split: form.audience_gender_split })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Top Geos</label>
                <input
                  value={geoInput}
                  onChange={e => setGeoInput(e.target.value)}
                  onBlur={handleGeoBlur}
                  placeholder="United States, United Kingdom, Australia"
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.audience_top_geos.map(geo => (
                    <span key={geo} style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11 }}>
                      {geo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
