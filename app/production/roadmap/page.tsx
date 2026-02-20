'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  CustomMarker,
  type TimelineGroupBase,
  type TimelineItemBase,
} from 'react-calendar-timeline';
import 'react-calendar-timeline/dist/style.css';
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
  edits: Array<{
    episodeId: number;
    title: string;
    start: string;
    end: string;
    editorSlot: number;
    index: number;
    episodeType: string;
  }>;
  publishes: Array<{
    episodeId: number;
    title: string;
    start: string;
    end: string;
    index: number;
    publishDate: string;
    episodeType: string;
  }>;
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

type PhaseKey = 'preprod' | 'shoot' | 'editA' | 'editB' | 'publish';

type ItemLinkMap = Map<string, string>;

type RoadmapGroup = TimelineGroupBase & {
  trackId: number;
  phase: PhaseKey;
};

const PHASE_COLORS: Record<PhaseKey, string> = {
  preprod: '#F6C453',
  shoot: '#F59E0B',
  editA: '#8B5CF6',
  editB: '#C4B5FD',
  publish: '#34D399',
};

function toUtcMs(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).getTime();
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function endExclusiveMs(dateStr: string) {
  return toUtcMs(addDays(dateStr, 1));
}

function shortLabel(label: string, max = 22) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

/** Extract the "subject" from a long episode title for compact display.
 *  e.g., "Hunting Python in the Indonesian Jungle" -> "Python"
 *        "I Hunted Red Deer in the Scottish Highlands" -> "Red Deer"
 *        "Spider Fighting: The Philippines' Underground..." -> "Spider Fighting"
 */
function shortSubject(title: string): string {
  // If it has a colon, use the part before it
  if (title.includes(':')) {
    const before = title.split(':')[0].trim();
    // Remove common prefixes
    return before
      .replace(/^(I\s+)?(Visited|Rode|Made|Hunted)\s+/i, '')
      .replace(/^The\s+/i, '')
      .trim()
      .slice(0, 20);
  }
  // Remove common filler words and try to get the subject
  const cleaned = title
    .replace(/^(I\s+)?(Visited|Rode|Made|Hunted)\s+/i, '')
    .replace(/^The\s+/i, '')
    .replace(/\s+(in|on|of|from|with|the|and)\s+.*/i, '')
    .trim();
  return cleaned.length > 20 ? cleaned.slice(0, 19) + '…' : cleaned;
}

export default function RoadmapPage() {
  const router = useRouter();
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
  const [today, setToday] = useState(() => Date.now());

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

  useEffect(() => {
    const interval = setInterval(() => setToday(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

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

  const timeBounds = useMemo(() => {
    if (!data?.weeks?.length) return null;
    const fullStart = toUtcMs(data.weeks[0].start);
    const fullEnd = endExclusiveMs(data.weeks[data.weeks.length - 1].end);
    // Default view: ~4 months from start (not full year) for readability
    const fourMonths = fullStart + (120 * 24 * 60 * 60 * 1000);
    const visibleEnd = Math.min(fourMonths, fullEnd);
    return { start: fullStart, end: fullEnd, visibleEnd };
  }, [data]);

  const groups = useMemo<RoadmapGroup[]>(() => {
    if (!data) return [];

    const buildTitle = (trackLabel: string, phaseLabel: string, isFirst: boolean) => (
      <div className="roadmap-group-title">
        <div className="roadmap-group-phase">
          {isFirst ? `${trackLabel} · ${phaseLabel}` : phaseLabel}
        </div>
      </div>
    );

    return data.tracks.flatMap((track) => {
      const trackLabel = track.label;
      return [
        {
          id: `track-${track.id}-preprod`,
          title: buildTitle(trackLabel, 'Pre-Production', true),
          trackId: track.id,
          phase: 'preprod' as PhaseKey,
          stackItems: true,
        },
        {
          id: `track-${track.id}-shoot`,
          title: buildTitle(trackLabel, 'Shooting', false),
          trackId: track.id,
          phase: 'shoot' as PhaseKey,
          stackItems: true,
        },
        {
          id: `track-${track.id}-editA`,
          title: buildTitle(trackLabel, `Editing — ${editorNames[0] || 'Editor A'}`, false),
          trackId: track.id,
          phase: 'editA' as PhaseKey,
          stackItems: true,
        },
        {
          id: `track-${track.id}-editB`,
          title: buildTitle(trackLabel, `Editing — ${editorNames[1] || 'Editor B'}`, false),
          trackId: track.id,
          phase: 'editB' as PhaseKey,
          stackItems: true,
        },
        {
          id: `track-${track.id}-publish`,
          title: buildTitle(trackLabel, 'Publishing', false),
          trackId: track.id,
          phase: 'publish' as PhaseKey,
          stackItems: true,
        },
      ];
    });
  }, [data, editorNames]);

  const { items, itemLinks } = useMemo(() => {
    if (!data) return { items: [] as Array<TimelineItemBase<number>>, itemLinks: new Map<string, string>() };

    const timelineItems: Array<TimelineItemBase<number>> = [];
    const links: ItemLinkMap = new Map();

    const makeItem = (params: {
      id: string;
      group: string;
      label: string;
      start: string;
      end: string;
      phase: PhaseKey;
      seriesColor?: string;
      href?: string;
    }) => {
      const { id, group, label, start, end, phase, seriesColor, href } = params;
      const background = PHASE_COLORS[phase];
      timelineItems.push({
        id,
        group,
        title: label,
        start_time: toUtcMs(start),
        end_time: endExclusiveMs(end),
        canMove: false,
        canResize: false,
        canChangeGroup: false,
        itemProps: {
          className: `roadmap-item phase-${phase}`,
          title: label,
          style: {
            backgroundColor: background,
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderLeftColor: seriesColor || 'rgba(0, 0, 0, 0.2)',
            borderLeftWidth: 3,
            borderLeftStyle: 'solid',
          },
        },
      });

      if (href) links.set(id, href);
    };

    data.tracks.forEach((track) => {
      const trackSeries = data.series
        .filter((s) => s.track === track.id)
        .sort((a, b) => a.preprod.start.localeCompare(b.preprod.start));

      trackSeries.forEach((series) => {
        const producer = producerNames[series.producerIndex] || producerNames[0] || 'Producer';

        // Use short series name for bar labels
        const seriesShort = series.title
          .replace(/\s*[—–-]\s*.+$/, '')  // "Indonesia — Sumba & Surrounds" -> "Indonesia"
          .replace(/\s*&\s*.+$/, '')       // strip trailing "& ..."
          .trim();

        makeItem({
          id: `preprod-${series.id}`,
          group: `track-${track.id}-preprod`,
          label: `${seriesShort} (${producer})`,
          start: series.preprod.start,
          end: series.preprod.end,
          phase: 'preprod',
          seriesColor: series.color,
        });

        makeItem({
          id: `shoot-${series.id}`,
          group: `track-${track.id}-shoot`,
          label: `${seriesShort} (Andrew)`,
          start: series.shoot.start,
          end: series.shoot.end,
          phase: 'shoot',
          seriesColor: series.color,
        });

        series.edits.forEach((edit) => {
          const label = edit.episodeType === 'filler'
            ? `TBD EP${edit.index + 1}`
            : shortSubject(edit.title);
          const groupId = edit.editorSlot === 0 ? `track-${track.id}-editA` : `track-${track.id}-editB`;
          const phase = edit.editorSlot === 0 ? 'editA' : 'editB';

          makeItem({
            id: `edit-${series.id}-${edit.episodeId}-${edit.editorSlot}`,
            group: groupId,
            label,
            start: edit.start,
            end: edit.end,
            phase,
            seriesColor: series.color,
            href: `/production/episodes/${edit.episodeId}`,
          });
        });

        series.publishes.forEach((pub) => {
          makeItem({
            id: `publish-${series.id}-${pub.episodeId}`,
            group: `track-${track.id}-publish`,
            label: `EP${pub.index + 1}`,
            start: pub.start,
            end: pub.end,
            phase: 'publish',
            seriesColor: series.color,
            href: `/production/episodes/${pub.episodeId}`,
          });
        });
      });
    });

    return { items: timelineItems, itemLinks: links };
  }, [data, producerNames]);

  const handleItemClick = useCallback(
    (itemId: number | string) => {
      const href = itemLinks.get(String(itemId));
      if (href) router.push(href);
    },
    [itemLinks, router]
  );

  const lineHeight = viewMode === 'month' ? 36 : 44;
  const itemHeightRatio = viewMode === 'month' ? 0.7 : 0.8;

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

      {!data || !timeBounds ? (
        <div className="roadmap-muted">No roadmap data available yet.</div>
      ) : (
        <div className="roadmap-scroll">
          <Timeline
            className="roadmap-timeline"
            groups={groups}
            items={items}
            defaultTimeStart={new Date(timeBounds.start)}
            defaultTimeEnd={new Date(timeBounds.visibleEnd)}
            sidebarWidth={280}
            rightSidebarWidth={0}
            lineHeight={lineHeight}
            itemHeightRatio={itemHeightRatio}
            stackItems
            canMove={false}
            canResize={false}
            canChangeGroup={false}
            itemTouchSendsClick
            onItemClick={handleItemClick}
          >
            <TimelineHeaders className="roadmap-headers" calendarHeaderClassName="roadmap-calendar-header">
              <SidebarHeader>
                {({ getRootProps }) => (
                  <div {...getRootProps()} className="roadmap-sidebar-header">
                    Track / Phase
                  </div>
                )}
              </SidebarHeader>
              <DateHeader unit="month" labelFormat="MMM" />
              <DateHeader unit="week" labelFormat="MMM D" />
            </TimelineHeaders>
            <TimelineMarkers>
              <CustomMarker date={today}>
                {({ styles }) => (
                  <div style={styles} className="roadmap-today-marker" />
                )}
              </CustomMarker>
            </TimelineMarkers>
          </Timeline>
        </div>
      )}
    </div>
  );
}
