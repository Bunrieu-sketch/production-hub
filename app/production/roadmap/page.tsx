'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import './roadmap.css';

type Week = {
  index: number;
  start: string;
  end: string;
  label: string;
  month: number;
  monthLabel: string;
};

type RoadmapSeries = {
  id: number;
  title: string;
  track: number;
  color: string;
  producerIndex: number;
  preprod: { start: string; end: string };
  shoot: { start: string; end: string };
  edits: Array<{ episodeId: number; title: string; start: string; end: string; editorSlot: number; index: number }>;
  publishes: Array<{ episodeId: number; title: string; start: string; end: string; index: number; publishDate: string }>;
  block: { start: string; end: string };
};

type RoadmapResponse = {
  weeks: Week[];
  tracks: Array<{ id: number; label: string }>;
  series: RoadmapSeries[];
  producerCount: number;
  year: number;
};

type Person = { id: number; name: string };

type Bar = {
  key: string;
  label: string;
  bg: string;
  border: string;
  href?: string;
  startIndex: number;
  endIndex: number;
  seriesColor?: string;
};

const PHASE_COLORS = {
  preprod: '#F6C453',
  shoot: '#F59E0B',
  editA: '#8B5CF6',
  editB: '#C4B5FD',
  publish: '#34D399',
} as const;

function toDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shortLabel(label: string, max = 24) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

export default function RoadmapPage() {
  const [data, setData] = useState<RoadmapResponse | null>(null);
  const [producerMode, setProducerMode] = useState<1 | 2>(1);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [producers, setProducers] = useState<Person[]>([]);
  const [editors, setEditors] = useState<Person[]>([]);
  const [producerDefault, setProducerDefault] = useState('');
  const [producerA, setProducerA] = useState('');
  const [producerB, setProducerB] = useState('');
  const [editorA, setEditorA] = useState('');
  const [editorB, setEditorB] = useState('');

  useEffect(() => {
    fetch('/api/people?role=producer')
      .then((r) => r.json())
      .then((rows: Person[]) => setProducers(rows || []));
    fetch('/api/people?role=editor')
      .then((r) => r.json())
      .then((rows: Person[]) => setEditors(rows || []));
  }, []);

  useEffect(() => {
    fetch(`/api/roadmap?producers=${producerMode}`)
      .then((r) => r.json())
      .then((payload: RoadmapResponse) => setData(payload));
  }, [producerMode]);

  useEffect(() => {
    if (!producerDefault && producers.length) setProducerDefault(String(producers[0].id));
    if (!producerA && producers.length) setProducerA(String(producers[0].id));
    if (!producerB && producers.length) {
      setProducerB(String(producers[Math.min(1, producers.length - 1)].id));
    }
  }, [producers, producerDefault, producerA, producerB]);

  useEffect(() => {
    if (!editorA && editors.length) setEditorA(String(editors[0].id));
    if (!editorB && editors.length) {
      setEditorB(String(editors[Math.min(1, editors.length - 1)].id));
    }
  }, [editors, editorA, editorB]);

  const producerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    producers.forEach((p) => map.set(String(p.id), p.name));
    return map;
  }, [producers]);

  const editorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    editors.forEach((e) => map.set(String(e.id), e.name));
    return map;
  }, [editors]);

  const producerNames = useMemo(() => {
    const defaultName = producerNameMap.get(producerDefault) || 'Producer';
    const aName = producerNameMap.get(producerA) || 'Producer A';
    const bName = producerNameMap.get(producerB) || 'Producer B';
    return producerMode === 1 ? [defaultName] : [aName, bName];
  }, [producerMode, producerDefault, producerA, producerB, producerNameMap]);

  const editorNames = useMemo(() => {
    const aName = editorNameMap.get(editorA) || 'Editor A';
    const bName = editorNameMap.get(editorB) || 'Editor B';
    return [aName, bName];
  }, [editorA, editorB, editorNameMap]);

  const weeks = data?.weeks || [];
  const weekCount = weeks.length;
  const baseWeekDate = weeks.length ? toDate(weeks[0].start).getTime() : 0;

  const dateToIndex = (dateStr: string) => {
    if (!weekCount) return 0;
    const diff = (toDate(dateStr).getTime() - baseWeekDate) / (1000 * 60 * 60 * 24);
    return clamp(Math.floor(diff / 7), 0, weekCount - 1);
  };

  const phaseColors = (phase: keyof typeof PHASE_COLORS) => {
    const bg = PHASE_COLORS[phase];
    return {
      bg,
      border: 'rgba(0, 0, 0, 0.12)',
    };
  };

  const monthSpans = useMemo(() => {
    if (!weeks.length) return [];
    const spans: Array<{ label: string; span: number }> = [];
    let current = weeks[0].monthLabel;
    let span = 0;
    for (const wk of weeks) {
      if (wk.monthLabel !== current) {
        spans.push({ label: current, span });
        current = wk.monthLabel;
        span = 1;
      } else {
        span += 1;
      }
    }
    spans.push({ label: current, span });
    return spans;
  }, [weeks]);

  const rows = useMemo(() => {
    if (!data) return [];
    const rowsAcc: Array<{
      key: string;
      trackId: number;
      trackLabel: string;
      phaseLabel: string;
      cells: Array<null>;
      bars: Bar[];
      showTrackLabel: boolean;
    }> = [];

    const buildBars = (
      entries: Array<{
        start: string;
        end: string;
        label: string;
        bg: string;
        border: string;
        href?: string;
        key: string;
        seriesColor?: string;
      }>,
    ) =>
      entries.map((entry) => ({
        ...entry,
        startIndex: dateToIndex(entry.start),
        endIndex: dateToIndex(entry.end),
      }));

    data.tracks.forEach((track) => {
      const trackSeries = data.series
        .filter((s) => s.track === track.id)
        .sort((a, b) => a.preprod.start.localeCompare(b.preprod.start));

      const preprodEntries = trackSeries.map((s) => {
        const producer = producerNames[s.producerIndex] || producerNames[0] || 'Producer';
        const colors = phaseColors('preprod');
        return {
          start: s.preprod.start,
          end: s.preprod.end,
          label: producer,
          key: `preprod-${s.id}`,
          seriesColor: s.color,
          ...colors,
        };
      });

      const shootEntries = trackSeries.map((s) => {
        const colors = phaseColors('shoot');
        return {
          start: s.shoot.start,
          end: s.shoot.end,
          label: 'Andrew',
          key: `shoot-${s.id}`,
          seriesColor: s.color,
          ...colors,
        };
      });

      const editorAEntries: Array<{
        start: string;
        end: string;
        label: string;
        bg: string;
        border: string;
        href?: string;
        key: string;
        seriesColor?: string;
      }> = [];
      const editorBEntries: Array<{
        start: string;
        end: string;
        label: string;
        bg: string;
        border: string;
        href?: string;
        key: string;
        seriesColor?: string;
      }> = [];
      const publishEntries: Array<{
        start: string;
        end: string;
        label: string;
        bg: string;
        border: string;
        href?: string;
        key: string;
        seriesColor?: string;
      }> = [];

      trackSeries.forEach((s) => {
        const publishColors = phaseColors('publish');

        s.edits.forEach((edit) => {
          const editColors = phaseColors(edit.editorSlot === 0 ? 'editA' : 'editB');
          const entry = {
            start: edit.start,
            end: edit.end,
            label: shortLabel(edit.title, 26),
            href: `/production/episodes/${edit.episodeId}`,
            key: `edit-${s.id}-${edit.episodeId}-${edit.editorSlot}`,
            seriesColor: s.color,
            ...editColors,
          };
          if (edit.editorSlot === 0) {
            editorAEntries.push(entry);
          } else {
            editorBEntries.push(entry);
          }
        });

        s.publishes.forEach((pub) => {
          publishEntries.push({
            start: pub.start,
            end: pub.end,
            label: `EP${pub.index + 1}`,
            href: `/production/episodes/${pub.episodeId}`,
            key: `publish-${s.id}-${pub.episodeId}`,
            seriesColor: s.color,
            ...publishColors,
          });
        });
      });

      rowsAcc.push({
        key: `track-${track.id}-preprod`,
        trackId: track.id,
        trackLabel: track.label,
        phaseLabel: 'Pre-Prod',
        cells: Array.from({ length: weekCount }).map(() => null),
        bars: buildBars(preprodEntries),
        showTrackLabel: true,
      });
      rowsAcc.push({
        key: `track-${track.id}-shoot`,
        trackId: track.id,
        trackLabel: track.label,
        phaseLabel: 'Shooting',
        cells: Array.from({ length: weekCount }).map(() => null),
        bars: buildBars(shootEntries),
        showTrackLabel: false,
      });
      rowsAcc.push({
        key: `track-${track.id}-editor-a`,
        trackId: track.id,
        trackLabel: track.label,
        phaseLabel: `Editor A · ${editorNames[0] || 'Editor A'}`,
        cells: Array.from({ length: weekCount }).map(() => null),
        bars: buildBars(editorAEntries),
        showTrackLabel: false,
      });
      rowsAcc.push({
        key: `track-${track.id}-editor-b`,
        trackId: track.id,
        trackLabel: track.label,
        phaseLabel: `Editor B · ${editorNames[1] || 'Editor B'}`,
        cells: Array.from({ length: weekCount }).map(() => null),
        bars: buildBars(editorBEntries),
        showTrackLabel: false,
      });
      rowsAcc.push({
        key: `track-${track.id}-publish`,
        trackId: track.id,
        trackLabel: track.label,
        phaseLabel: 'Publishing',
        cells: Array.from({ length: weekCount }).map(() => null),
        bars: buildBars(publishEntries),
        showTrackLabel: false,
      });
    });

    return rowsAcc;
  }, [data, weekCount, producerNames, editorNames]);

  const gridTemplateColumns = `var(--track-col, 110px) var(--phase-col, 150px) repeat(${weekCount}, var(--week-col, 44px))`;

  return (
    <div className="roadmap-page">
      <div className="roadmap-toolbar">
        <div>
          <div className="roadmap-title">Roadmap</div>
          {data && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
              {data.year} · {data.tracks.length} tracks · {data.series.length} series
            </div>
          )}
        </div>

        <div className="roadmap-controls">
          <div className="control-group">
            <label>Zoom</label>
            <div className="roadmap-toggle">
              {(['week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  className={`btn ${viewMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => setViewMode(mode)}
                >
                  {mode === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Producer Mode</label>
            <div className="roadmap-toggle">
              {[1, 2].map((mode) => (
                <button
                  key={mode}
                  className={`btn ${producerMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => setProducerMode(mode as 1 | 2)}
                >
                  {mode} Producer
                </button>
              ))}
            </div>
          </div>

          {producerMode === 1 ? (
            <div className="control-group">
              <label>Default Producer</label>
              <select value={producerDefault} onChange={(e) => setProducerDefault(e.target.value)}>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="control-group">
                <label>Producer A</label>
                <select value={producerA} onChange={(e) => setProducerA(e.target.value)}>
                  {producers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="control-group">
                <label>Producer B</label>
                <select value={producerB} onChange={(e) => setProducerB(e.target.value)}>
                  {producers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="control-group">
            <label>Editor A</label>
            <select value={editorA} onChange={(e) => setEditorA(e.target.value)}>
              {editors.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Editor B</label>
            <select value={editorB} onChange={(e) => setEditorB(e.target.value)}>
              {editors.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!data || !weeks.length ? (
        <div className="roadmap-muted">No roadmap data available yet.</div>
      ) : (
        <div
          className="roadmap-scroll"
          style={
            {
              '--week-col': viewMode === 'month' ? '18px' : '44px',
              '--row-height': viewMode === 'month' ? '22px' : '26px',
              '--track-col': '110px',
              '--phase-col': '150px',
            } as React.CSSProperties
          }
        >
          <div className="roadmap-grid">
            <div className="roadmap-row roadmap-header-row" style={{ gridTemplateColumns }}>
              <div className="roadmap-cell header roadmap-left roadmap-track-cell">Track</div>
              <div className="roadmap-cell header roadmap-left phase roadmap-phase-cell">Phase</div>
              {monthSpans.map((span, idx) => (
                <div
                  key={`${span.label}-${idx}`}
                  className="roadmap-cell header"
                  style={{ gridColumn: `span ${span.span}` }}
                >
                  {span.label}
                </div>
              ))}
            </div>

            {viewMode === 'week' && (
              <div className="roadmap-row roadmap-header-row" style={{ gridTemplateColumns }}>
                <div className="roadmap-cell header roadmap-left roadmap-track-cell"> </div>
                <div className="roadmap-cell header roadmap-left phase roadmap-phase-cell"> </div>
                {weeks.map((wk) => (
                  <div key={wk.index} className="roadmap-cell header week">
                    {new Date(`${wk.start}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>
            )}

            {rows.map((row) => (
              <div key={row.key} className="roadmap-row" style={{ gridTemplateColumns }}>
                <div className="roadmap-cell roadmap-left roadmap-track-cell">
                  {row.showTrackLabel ? row.trackLabel : ''}
                </div>
                <div className="roadmap-cell roadmap-left phase roadmap-phase-cell">
                  {row.phaseLabel}
                </div>
                {row.cells.map((_, index) => (
                  <div key={`cell-${row.key}-${index}`} className="roadmap-cell" />
                ))}
                {row.bars.map((bar) => {
                  const startCol = 3 + bar.startIndex;
                  const endCol = 3 + bar.endIndex + 1;
                  const barStyle: React.CSSProperties = {
                    gridColumn: `${startCol} / ${endCol}`,
                    backgroundColor: bar.bg,
                    borderColor: bar.border,
                    borderLeftColor: bar.seriesColor || bar.border,
                  };
                  if (bar.href) {
                    return (
                      <Link
                        key={bar.key}
                        href={bar.href}
                        className="roadmap-bar link"
                        style={barStyle}
                      >
                        {bar.label}
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={bar.key}
                      className="roadmap-bar"
                      style={barStyle}
                    >
                      {bar.label}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
