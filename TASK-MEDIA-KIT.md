# Task: YouTube Media Kit Generator

## Goal
Build a `/media-kit` page in Mission Control that lets Andrew configure his channel stats, auto-pulls sponsor history from the DB, and generates a professional printable/shareable media kit he can send to brands.

---

## Stack
- Next.js 15 + TypeScript + Tailwind (dark theme — existing codebase)
- SQLite via better-sqlite3 (existing `mission-control.db`)
- No new npm dependencies unless absolutely needed

---

## Database Changes

Add a `media_kit_config` table to `lib/db.ts`:

```sql
CREATE TABLE IF NOT EXISTS media_kit_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  youtube_handle TEXT DEFAULT '@Andrew_Fraser',
  channel_name TEXT DEFAULT 'Andrew Fraser',
  subscriber_count INTEGER DEFAULT 190000,
  avg_views_per_video INTEGER DEFAULT 80000,
  avg_engagement_rate REAL DEFAULT 4.2,
  niche_description TEXT DEFAULT 'Extreme travel, street food & cultural documentaries from Southeast Asia and beyond.',
  content_pillars TEXT DEFAULT '["Extreme Food","Travel Documentaries","Street Culture","Adventure Vlogs"]',
  audience_age_range TEXT DEFAULT '18-34',
  audience_gender_split TEXT DEFAULT '{"male": 68, "female": 32}',
  audience_top_geos TEXT DEFAULT '["United States","United Kingdom","Australia","Canada","Vietnam"]',
  posting_frequency TEXT DEFAULT '2-3 videos/month',
  channel_url TEXT DEFAULT 'https://youtube.com/@Andrew_Fraser',
  instagram_handle TEXT DEFAULT '@andrewfraser',
  tiktok_handle TEXT DEFAULT '',
  contact_email TEXT DEFAULT 'andrew@fraser.vn',
  updated_at TEXT DEFAULT (datetime(''now''))
);

-- Insert default row
INSERT OR IGNORE INTO media_kit_config (id) VALUES (1);
```

Also add these helper functions to `lib/db.ts`:
- `getMediaKitConfig()` — returns the single config row
- `updateMediaKitConfig(data)` — updates the config row (partial update)
- `getMediaKitStats()` — queries sponsors table for: total_sponsors (count where stage='published'), total_revenue (sum deal_value_gross where stage='published'), avg_deal_value, top_brands (array of brand_name where stage='published' order by deal_value_gross desc limit 12)

---

## API Routes

### `app/api/media-kit/route.ts`
- **GET**: Returns `{ config: MediaKitConfig, stats: MediaKitStats }`
  - stats come from getMediaKitStats() — live DB query
- **PUT**: Accepts partial config update, saves to DB, returns updated config

---

## Pages

### `app/media-kit/page.tsx` — Editor Dashboard
The main dashboard page (dark theme, consistent with rest of MC). Contains:

**Left column (60%):** Live preview of the media kit card — a scaled-down version of what brands see
**Right column (40%):** Config form

**Config form sections:**
1. **Channel Stats** — subscriber_count (number input), avg_views_per_video (number input), avg_engagement_rate (decimal), posting_frequency (text)
2. **About** — channel_name, youtube_handle, niche_description (textarea), content_pillars (tag input — comma-separated chips), channel_url, instagram_handle, contact_email
3. **Audience** — audience_age_range (text), audience_gender_split (two number inputs: male %, female %), audience_top_geos (comma-separated chips)

At the bottom of the page:
- Button: **"Open Media Kit Preview →"** — opens `/media-kit/preview` in new tab
- Button: **"Copy Preview Link"** — copies the URL to clipboard

Auto-save on blur (PATCH request) — no explicit save button needed.

### `app/media-kit/preview/page.tsx` — The Actual Media Kit
This is a standalone, printable/shareable page. It should look BEAUTIFUL — the kind of thing Andrew can literally send to a brand manager and be proud of.

Design: Dark background (#0d1117), gold accents (#f0a500), clean typography. NOT the Mission Control nav — this page has no sidebar or nav. Full-width, single-column layout.

Structure of the media kit:

```
┌─────────────────────────────────────────┐
│ [Header]                                │
│  ANDREW FRASER                          │
│  @Andrew_Fraser · YouTube               │
│  Extreme travel, food & culture docs    │
│  ─────────────────────────────────────  │
│                                         │
│ [Stats Bar] (3 columns)                 │
│  190K+ Subscribers  |  80K Avg Views    │
│  2-3 Videos/Month   |  4.2% Engagement  │
│                                         │
│ [Content Pillars]                       │
│  🍜 Extreme Food  🗺️ Travel Docs        │
│  🌏 Street Culture  🏔️ Adventure        │
│                                         │
│ [Audience]                              │
│  Age: 18-34 (primary 25-34)             │
│  Gender: 68% Male / 32% Female          │
│  Top Markets: 🇺🇸 US  🇬🇧 UK  🇦🇺 AUS   │
│                                         │
│ [Past Brand Partners]                   │
│  (badges/chips of brand names from DB)  │
│  Babbel · FarmKind · Simify · LARQ …   │
│                                         │
│ [Sponsorship Options] (3 cards)         │
│  Dedicated Video | First 5 Min | Outro  │
│                                         │
│ [Contact / CTA]                         │
│  Ready to collaborate?                  │
│  andrew@fraser.vn                       │
│  [Watch Latest Video]  [View Channel]   │
└─────────────────────────────────────────┘
```

Make it printable (CSS @media print: hide buttons, white background option).

Add a **"Print / Save as PDF"** button (uses window.print()).

---

## Sidebar Update

Add to `components/Sidebar.tsx` under the PIPELINE section (after People):
- "Media Kit" link → `/media-kit` — use `Sparkles` icon from lucide-react

---

## Formatting Helpers
Format large numbers nicely: 190000 → "190K+", 1200000 → "1.2M"

---

## Testing
- TypeScript should compile clean (`npx tsc --noEmit`)
- Preview page should render without crashing even if sponsors table returns 0 rows
- Config form should handle partial updates gracefully

---

## Git
Branch: `feat/media-kit-generator`
Commit message: `feat: add YouTube media kit generator with editable config + shareable preview`
PR title: `feat: YouTube Media Kit Generator`
PR description: Brief summary of what was built.
