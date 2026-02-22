# Production Hub Merge Spec — Production Hub + Sponsors V2

## Overview

Merge production-hub into production-hub as a unified dashboard. Enhance sponsors with V2 features. Single app, single database, single port (5053).

## CRITICAL — Read First

1. **Design System:** Follow `/Users/montymac/.openclaw/workspace/DESIGN_SYSTEM.md` exactly
2. **Existing patterns:** Reference existing production-hub components
3. **Production Hub source:** `/Users/montymac/.openclaw/workspace/production-hub/`
4. **Sponsors V2 spec:** `/Users/montymac/.openclaw/workspace/content-pipeline/SPONSORS-V2-SPEC.md`

## New Sidebar Structure

```tsx
// components/Sidebar.tsx — rebuild with this structure:

Logo: Production Hub (LayoutGrid icon)
━━━━━━━━━━━━━━━━━━━━━
Tasks (Kanban icon) — "/" — KEEP AS HOME

PRODUCTION HUB (section header, collapsible)
  Timeline (GanttChart icon) — "/production/timeline"
  Calendar (Calendar icon) — "/production/calendar"
  Series (Clapperboard icon) — "/production/series"
  Episodes (Video icon) — "/production/episodes"

PIPELINE (section header, collapsible)
  Sponsors (HandCoins icon) — "/pipeline/sponsors"
  People (Users icon) — "/pipeline/people"

━━━━━━━━━━━━━━━━━━━━━
Competitor Intel (Search icon) — external link to http://localhost:5052
Docs (FileText icon) — "/docs"
Design System (Palette icon) — "/design-system"
```

## Database Schema Updates

Add these tables to `production-hub.db` (use better-sqlite3, same pattern as existing):

```sql
-- Series (production trips)
CREATE TABLE IF NOT EXISTS series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  location TEXT DEFAULT '',
  status TEXT DEFAULT 'ideation' CHECK(status IN ('ideation', 'pre_prod', 'shooting', 'post_prod', 'published', 'archived')),
  target_shoot_start TEXT,
  target_shoot_end TEXT,
  actual_shoot_start TEXT,
  actual_shoot_end TEXT,
  fixer_id INTEGER,
  producer_id INTEGER,
  camera_id INTEGER,
  budget_target REAL DEFAULT 0,
  budget_actual REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Episodes (videos within series)
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER REFERENCES series(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'idea' CHECK(stage IN ('idea', 'outlined', 'confirmed', 'filming', 'editing', 'review', 'published')),
  sort_order INTEGER DEFAULT 0,
  episode_type TEXT DEFAULT 'cornerstone',
  shoot_date TEXT,
  rough_cut_due TEXT,
  publish_date TEXT,
  actual_publish_date TEXT,
  editor_id INTEGER,
  youtube_video_id TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  view_count INTEGER DEFAULT 0,
  thumbnail_concept TEXT DEFAULT '',
  hook TEXT DEFAULT '',
  outline TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- People (team members)
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'other' CHECK(role IN ('editor', 'fixer', 'producer', 'camera', 'other')),
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  rate_per_day REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  location TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Milestones (5-week pipeline gates)
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  notes TEXT DEFAULT ''
);

-- Enhanced Sponsors (V2 features)
CREATE TABLE IF NOT EXISTS sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT NOT NULL,
  
  -- Deal structure
  deal_type TEXT DEFAULT 'flat_rate' CHECK(deal_type IN ('flat_rate', 'cpm', 'full_video')),
  deal_value_gross REAL DEFAULT 0,
  deal_value_net REAL DEFAULT 0,
  cpm_rate REAL,
  cpm_cap REAL,
  mvg INTEGER,
  
  -- Pipeline stage
  stage TEXT DEFAULT 'inquiry' CHECK(stage IN (
    'inquiry', 'negotiation', 'contract', 'brief_received', 
    'script_writing', 'script_submitted', 'script_approved',
    'filming', 'brand_review', 'live', 'invoiced', 'paid'
  )),
  
  -- Contacts
  contact_name TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  agency_name TEXT DEFAULT '',
  agency_contact TEXT DEFAULT '',
  
  -- Key dates
  offer_date TEXT,
  contract_date TEXT,
  brief_due TEXT,
  brief_received_date TEXT,
  script_due TEXT,
  film_by TEXT,
  rough_cut_due TEXT,
  brand_review_due TEXT,
  live_date TEXT,
  invoice_date TEXT,
  payment_due_date TEXT,
  payment_received_date TEXT,
  
  -- Payment tracking
  payment_terms_brand_days INTEGER DEFAULT 30,
  payment_terms_agency_days INTEGER DEFAULT 15,
  invoice_amount REAL DEFAULT 0,
  
  -- Content details
  placement TEXT DEFAULT 'first_5_min',
  integration_length_seconds INTEGER DEFAULT 60,
  brief_text TEXT DEFAULT '',
  brief_link TEXT DEFAULT '',
  script_draft TEXT DEFAULT '',
  script_status TEXT DEFAULT 'not_started' CHECK(script_status IN (
    'not_started', 'drafting', 'submitted', 'revision_1', 'revision_2', 'revision_3', 'approved'
  )),
  
  -- Checklist
  has_tracking_link INTEGER DEFAULT 0,
  has_pinned_comment INTEGER DEFAULT 0,
  has_qr_code INTEGER DEFAULT 0,
  tracking_link TEXT DEFAULT '',
  promo_code TEXT DEFAULT '',
  
  -- YouTube tracking
  youtube_video_id TEXT DEFAULT '',
  youtube_video_title TEXT DEFAULT '',
  views_at_30_days INTEGER DEFAULT 0,
  
  -- CPM specific
  cpm_screenshot_taken INTEGER DEFAULT 0,
  cpm_invoice_generated INTEGER DEFAULT 0,
  
  -- MVG / Make-good
  mvg_met INTEGER,
  make_good_required INTEGER DEFAULT 0,
  make_good_video_id TEXT DEFAULT '',
  
  -- Exclusivity
  exclusivity_window_days INTEGER DEFAULT 0,
  exclusivity_category TEXT DEFAULT '',
  
  -- Physical product
  requires_product INTEGER DEFAULT 0,
  product_ordered_date TEXT,
  product_ship_to TEXT DEFAULT '',
  product_received INTEGER DEFAULT 0,
  
  -- Episode link
  episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
  
  -- Notes & next action
  notes TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_action_due TEXT,
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Travel items
CREATE TABLE IF NOT EXISTS travel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('flight', 'hotel', 'transport', 'permit', 'other')),
  title TEXT NOT NULL,
  details TEXT DEFAULT '',
  date_start TEXT,
  date_end TEXT,
  cost REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  booked INTEGER DEFAULT 0,
  confirmation_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Pages to Create

### 1. /production/timeline/page.tsx
Copy from production-hub, adapt imports. Custom Gantt with:
- Series as bars with episode segments
- Zoom controls (day/week/month)
- Today line (red)
- Milestone markers

### 2. /production/calendar/page.tsx
Copy from production-hub. Month grid with color-coded events.

### 3. /production/series/page.tsx
Card grid of series with status filters.

### 4. /production/series/[id]/page.tsx
Series detail with tabs: Overview | Episodes | Milestones | Travel | Team

### 5. /production/episodes/page.tsx
7-stage Kanban with drag-drop. Filter by series.

### 6. /pipeline/sponsors/page.tsx — ENHANCED
12-stage Kanban PLUS:

**Alerts Bar (top):**
```tsx
// Show actionable alerts:
// 🔴 "FarmKind payment overdue by X days"
// 🟡 "Saily: 30-day CPM period ends Mar 4 — prepare invoice"
// 🟡 "Simify script due in 3 days"
```

**Detail Panel (slide-out on card click):**
Tabs: Overview | Script | Checklist | Payment

- **Overview:** Key dates, contact, placement, episode link, notes, next action
- **Script:** Brief text, script draft (editable), script status buttons
- **Checklist:** Toggles for tracking link, pinned comment, QR code
- **Payment:** Terms breakdown, due date calc, overdue warning

**Payment calculation display:**
```
Published: Feb 2
→ Brand pays agency by: Mar 4 (30 days)
→ Agency pays you by: Mar 19 (+15 days)
```

**Header stats:**
- Pipeline value (sum of net for non-paid)
- Paid YTD
- Overdue count (red badge)

### 7. /pipeline/people/page.tsx
Team directory with role filters, workload counts.

## API Routes to Create

```
/api/series              GET, POST
/api/series/[id]         GET, PUT, DELETE
/api/series/[id]/episodes    GET
/api/series/[id]/milestones  GET
/api/series/[id]/travel      GET, POST

/api/episodes            GET (with ?series_id filter)
/api/episodes/[id]       GET, PUT, DELETE

/api/sponsors            GET, POST
/api/sponsors/[id]       GET, PUT, DELETE
/api/sponsors/alerts     GET (returns active alerts)

/api/people              GET, POST
/api/people/[id]         GET, PUT, DELETE

/api/travel/[id]         PUT, DELETE

/api/milestones/[id]     PUT (toggle complete)

/api/timeline            GET (Gantt-formatted data)
/api/calendar            GET (calendar events)
```

## Data Migration

Create `lib/migrate-production.ts`:

1. Read from production-hub/production-hub.db
2. Read from content-pipeline/dashboard.db (sponsors)
3. Insert into production-hub.db with schema mapping
4. Calculate deal_value_net = deal_value_gross * 0.8 for sponsors

Run migration on first API call (check if series table exists).

## Components to Create

### AlertsBar.tsx
Shows sponsor alerts: overdue payments, upcoming deadlines, CPM 30-day marks.

### SponsorDetailPanel.tsx
Slide-out panel with tabs for sponsor details.

### GanttTimeline.tsx
Copy from production-hub, clean up.

### CalendarMonth.tsx
Copy from production-hub, clean up.

### SeriesCard.tsx, EpisodeCard.tsx, PersonCard.tsx
Copy from production-hub, ensure design system compliance.

## Cleanup

After merge is complete and verified:
1. Update Sidebar to remove old Projects iframe links
2. Keep Competitor Intel as external link

## Testing

Verify on http://localhost:5053:
- [ ] Tasks kanban works (home page unchanged)
- [ ] Sidebar shows new structure
- [ ] /production/timeline shows Gantt
- [ ] /production/calendar shows month view
- [ ] /production/series lists series with filters
- [ ] /production/series/[id] shows detail with all tabs
- [ ] /production/episodes shows kanban
- [ ] /pipeline/sponsors shows enhanced kanban with alerts
- [ ] /pipeline/sponsors card click opens detail panel
- [ ] /pipeline/people shows team directory
- [ ] Competitor Intel link opens :5052
- [ ] Docs and Design System still work

## Git

1. Create branch: `feat/production-hub-merge`
2. Commit all changes
3. Push and create PR
4. Title: "feat: merge production-hub into production-hub with sponsors v2"
