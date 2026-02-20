'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, User, Clapperboard } from 'lucide-react';

type EpisodeDetail = {
  id: number;
  title: string;
  stage: string;
  episode_type: string;
  series_id: number;
  series_title: string;
  editor_name: string;
  shoot_date: string;
  publish_date: string;
  actual_publish_date: string;
  hook: string;
  outline: string;
  notes: string;
};

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EpisodeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);

  useEffect(() => {
    fetch(`/api/episodes/${id}`)
      .then((r) => r.json())
      .then((data: EpisodeDetail) => setEpisode(data));
  }, [id]);

  if (!episode) {
    return <div style={{ color: 'var(--text-dim)', padding: 24 }}>Loading episode...</div>;
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button className="btn btn-ghost" onClick={() => router.push('/production/episodes')} style={{ padding: '6px 8px' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{episode.title}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            {episode.series_title || 'Untitled Series'}
          </div>
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          background: 'var(--card)',
          borderRadius: 12,
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{episode.stage}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{episode.episode_type}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Editor</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={12} /> {episode.editor_name || 'Unassigned'}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Series</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clapperboard size={12} /> {episode.series_title || '—'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shoot Date</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} /> {formatDate(episode.shoot_date)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target Publish</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} /> {formatDate(episode.publish_date)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actual Publish</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} /> {formatDate(episode.actual_publish_date)}
            </div>
          </div>
        </div>

        {episode.hook && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hook</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{episode.hook}</div>
          </div>
        )}

        {episode.outline && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outline</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{episode.outline}</div>
          </div>
        )}

        {episode.notes && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{episode.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
