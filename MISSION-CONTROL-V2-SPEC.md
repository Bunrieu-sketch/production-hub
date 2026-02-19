# Mission Control v2 — Build Spec

## Overview
Rebuild the Gantt chart, Calendar, and Sponsorship CRM views using established libraries, fed by real YouTube data scraped from @Andrew_Fraser's channel.

## Stack
- Next.js 15 / React 19 / better-sqlite3 (existing)
- **Frappe Gantt** (`frappe-gantt`) for timeline/Gantt
- **FullCalendar** (`@fullcalendar/core`, `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/list`) for calendar
- SQLite: `mission-control.db` (single source of truth)

## Current State
- 1 series ("Content Pipeline") with 10 episodes — data is wrong, everything lumped together
- Hand-rolled Gantt at `/production/timeline` and Calendar at `/production/calendar` — replace both
- Sponsors Kanban exists and works — enhance it with episode linking
- YouTube API key available: use env var `YOUTUBE_API_KEY`

---

## Phase 1: Schema Migration

### New table: `episode_phases`
```sql
CREATE TABLE episode_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK(phase IN ('preprod', 'shoot', 'post', 'publish')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'done')),
  confidence REAL DEFAULT 1.0,
  source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'inferred', 'youtube')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(episode_id, phase)
);
```

### Alter existing tables
```sql
-- Series: add country for geographic grouping
ALTER TABLE series ADD COLUMN country TEXT DEFAULT '';

-- Episodes: add fields for scraped data
ALTER TABLE episodes ADD COLUMN description TEXT DEFAULT '';
ALTER TABLE episodes ADD COLUMN duration_seconds INTEGER DEFAULT 0;
ALTER TABLE episodes ADD COLUMN like_count INTEGER DEFAULT 0;
ALTER TABLE episodes ADD COLUMN comment_count INTEGER DEFAULT 0;
ALTER TABLE episodes ADD COLUMN scraped_at TEXT;

-- Sponsors: ensure episode_id link works (already exists), add source tracking
ALTER TABLE sponsors ADD COLUMN sponsor_source TEXT DEFAULT 'manual' CHECK(sponsor_source IN ('manual', 'description', 'pinned_comment'));
ALTER TABLE sponsors ADD COLUMN detected_text TEXT DEFAULT '';
```

### Important: Don't drop existing data
Run migrations as ALTER TABLE / CREATE TABLE IF NOT EXISTS. Preserve all existing sponsor and episode data.

---

## Phase 2: YouTube Scrape Script

Create `scripts/scrape-youtube.ts` — a standalone Node.js script that:

1. **Fetches channel videos** via YouTube Data API v3:
   - `GET /youtube/v3/search?channelId={id}&type=video&order=date&maxResults=50` (paginate for 40+ videos)
   - `GET /youtube/v3/videos?id={ids}&part=snippet,contentDetails,statistics` (batch hydrate)
   
2. **For each video:**
   - Upsert into `episodes` table (match by `youtube_video_id`)
   - Store: title, description, publish_date, duration, view_count, like_count, comment_count, thumbnail_url, youtube_url
   
3. **Sponsor detection per video:**
   - Parse description for patterns: "sponsored by", "thanks to", "brought to you by", URLs with tracking params, "use code", "% off", promo codes
   - Fetch pinned comment via `GET /youtube/v3/commentThreads?videoId={id}&order=relevance&maxResults=5` — check for pinned
   - Parse pinned comment for same patterns
   - For detected sponsors: check if brand name matches existing `sponsors.brand_name` (fuzzy), if so link via `episode_id`. If unknown, log to console for manual review.

4. **Series inference:**
   - Sort all episodes by publish_date ascending
   - Extract location/country from title (keyword matching against common countries: China, Indonesia, Bangladesh, Hong Kong, Japan, India, Vietnam, Thailand, Philippines, etc.)
   - Group consecutive episodes with same country AND publish dates within 28 days of each other
   - Target 3-5 episodes per series
   - Name series: "{Country} Series" or based on title themes
   - Create series rows, assign episodes, mark as `source='inferred'`
   
5. **Phase estimation for each episode:**
   - `publish` phase: start=publish_date, end=publish_date
   - `post` phase: start=publish_date - 14 days, end=publish_date - 1 day
   - `shoot` phase: estimated from series shoot windows (if series has multiple episodes, assume shoot window covers them all, starting ~6 weeks before first episode publish date)
   - `preprod` phase: start=shoot_start - 14 days, end=shoot_start - 1 day
   - All inferred phases get `confidence=0.6, source='inferred'`

**Run with:** `npx tsx scripts/scrape-youtube.ts`

**Environment:** `YOUTUBE_API_KEY` must be set.

**Channel handle:** `@Andrew_Fraser` — resolve to channel ID first via the API.

---

## Phase 3: Gantt Chart (Frappe Gantt)

### Install
```bash
npm install frappe-gantt
```

### API Endpoint: `GET /api/gantt`
Returns data shaped for Frappe Gantt:
```json
[
  {
    "id": "series-1",
    "name": "China Series",
    "start": "2025-12-01",
    "end": "2026-02-14",
    "progress": 100,
    "custom_class": "bar-series"
  },
  {
    "id": "ep-4-shoot",
    "name": "  Rat Meat Industry (Shoot)",
    "start": "2026-01-10",
    "end": "2026-01-15",
    "progress": 100,
    "dependencies": "",
    "custom_class": "bar-shoot"
  }
]
```

Query logic:
- Each series = one summary bar (min start to max end of its episodes' phases)
- Each episode's phases = individual task bars
- Color by phase type: preprod=blue, shoot=purple, post=yellow, publish=green
- Series bars styled differently (bold/wider)

### Component: Replace `/production/timeline/page.tsx`
- Dynamic import Frappe Gantt with `ssr: false`
- Fetch from `/api/gantt`
- Support zoom: Day / Week / Month (Frappe has this built-in)
- Click on task → show episode detail panel
- Style to match existing dark theme (CSS overrides for Frappe's SVG)
- Filter by series / status

---

## Phase 4: Calendar (FullCalendar)

### Install
```bash
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction
```

### API Endpoint: `GET /api/calendar?start=&end=`
Returns FullCalendar event objects:
```json
[
  { "id": "pub-4", "title": "Publish: Rat Meat", "start": "2026-01-24", "color": "#3fb950", "extendedProps": { "type": "publish", "episodeId": 4 } },
  { "id": "shoot-series-1", "title": "Shoot: China Series", "start": "2025-12-15", "end": "2026-01-10", "color": "#a371f7", "allDay": true },
  { "id": "sponsor-14", "title": "📌 FarmKind live", "start": "2026-02-01", "color": "#58a6ff" }
]
```

Event sources:
- Episode phases (from `episode_phases` table)
- Sponsor deadlines (script_due, live_date, payment_due from `sponsors`)
- Milestones (from `milestones` table)

### Component: Replace `/production/calendar/page.tsx`
- FullCalendar React component
- Views: month (default), week, day, list
- Color-coded by event type
- Click event → detail panel
- Filter toggle: Episodes / Sponsors / Milestones
- Dark theme via CSS variables

---

## Phase 5: CRM Enhancement

### Sponsor ↔ Episode linking
- The `sponsors` table already has `episode_id` — make sure it's populated
- When scraping, link detected sponsors to their episode
- In the Kanban card UI, show which episode the sponsor is linked to
- Add an episode selector dropdown on sponsor edit

### Display enhancements
- Show "Detected via: description" or "Detected via: pinned comment" badge on auto-detected sponsors
- Show episode title + publish date on sponsor cards
- On episode detail, show linked sponsors

---

## Design Guidelines
- Match existing dark theme: `--bg: #0d1117`, `--accent: #a371f7`, green=#3fb950, orange=#d29922, blue=#58a6ff, red=#f85149
- Use existing design system components where possible
- Responsive but desktop-first (this is a production tool)
- Navigation: keep existing sidebar nav structure

## File Structure
```
scripts/
  scrape-youtube.ts        # YouTube scraper + series inference
lib/
  db.ts                    # Existing — add migration logic
  gantt.ts                 # Gantt query helpers
  calendar-events.ts       # Calendar event query helpers
app/
  api/
    gantt/route.ts         # Gantt data endpoint
    calendar/route.ts      # Replace existing calendar endpoint
    scrape/route.ts        # Optional: trigger scrape from UI
  production/
    timeline/page.tsx      # Replace with Frappe Gantt
    calendar/page.tsx      # Replace with FullCalendar
```

## Order of Operations
1. Run schema migration
2. Run YouTube scrape → populates real data
3. Build Gantt view
4. Build Calendar view  
5. Enhance CRM with episode linking
