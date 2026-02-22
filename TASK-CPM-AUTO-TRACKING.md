# Task: CPM Auto-Tracking & Single Source of Truth

## Overview
Build automated YouTube view tracking for CPM sponsor deals, with episodes as the single source of truth for all video data across the system.

## Goals
1. **Single source of truth** — episodes table holds all video data (views, YouTube ID, etc.)
2. **Auto-detect sponsored videos** — watch Andrew's channel, auto-link sponsors to episodes when videos go live
3. **Live CPM tracking** — daily view count updates, auto-calculate CPM amounts
4. **Skill documentation** — document CRM rules, link from UI

---

## Part 1: Episodes as Single Source of Truth

### Database Changes

The `episodes` table should be THE source for video data. Add/ensure these columns:

```sql
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS view_count_updated_at TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
```

Sponsors link to episodes via `episode_id` (already exists).

### View Count Source
- CPM calculations should read `view_count` from the linked **episode**, not from `sponsors.views_at_30_days`
- Keep `sponsors.views_at_30_days` as the "locked" final count for invoicing (snapshot at 30 days)
- Before 30 days: show live count from episode
- After 30 days: use locked `views_at_30_days` for invoicing

---

## Part 2: Auto-Detect Sponsored Videos

### New API Route: `/api/youtube/sync`

Fetches Andrew's recent videos and matches them to sponsors.

**Logic:**
1. Call YouTube Data API: `GET https://www.googleapis.com/youtube/v3/search`
   - `channelId`: UCfVqXHFHPtdOtzNaTAuglag (Andrew Fraser)
   - `type`: video
   - `order`: date
   - `maxResults`: 10
   - `publishedAfter`: 14 days ago
   
2. For each video, get full details via `videos` endpoint (views, duration, etc.)

3. **Match to sponsors:**
   - Find sponsors where `live_date` is within ±5 days of video publish date
   - AND `episode_id` is NULL (not yet linked)
   - Optional: check if brand name appears in video title/description
   
4. **Auto-link:**
   - Create episode record if needed (or update existing)
   - Set `sponsors.episode_id` to the matched episode
   - Log the match

5. **Update view counts:**
   - For all episodes with `youtube_video_id`, update `view_count`

### Environment
- YouTube API Key: use env var `YOUTUBE_API_KEY` (already configured: AIzaSyCwzuXhPPFyeq0uf_eEFaT6g97jzmLztuQ)

### Cron Job
Create instructions for a daily cron job (7:30am) that calls this sync endpoint.

---

## Part 3: Updated CPM Display

### In Sponsor Cards
For CPM deals, show:
- **Before 30 days:** "Est: $X (Y views, Z days left)" — uses live episode.view_count
- **After 30 days:** "Final: $X (Y views)" — uses locked views_at_30_days
- **Not linked yet:** "Pending link" — waiting for video to go live

### In Detail Panel (Payment Tab)
- Show live view count from episode
- Show calculated amount based on current views
- Show countdown to 30-day lock
- "Lock Views" button to manually snapshot views_at_30_days

### Auto-Lock Logic
When a CPM deal's video is 30+ days old:
- Auto-copy episode.view_count → sponsors.views_at_30_days
- Mark as ready for invoicing
- Send alert (via the sync job output)

---

## Part 4: Skill Documentation

### Create Skill: `/Users/montymac/.openclaw/workspace/skills/sponsor-crm/SKILL.md`

```markdown
---
name: sponsor-crm
description: Manage the YouTube sponsorship pipeline. Use when checking sponsor status, updating deals, tracking payments, or understanding CRM rules.
---

# Sponsor CRM Skill

## Pipeline Stages
| Stage | Description |
|-------|-------------|
| leads | Initial inquiry or negotiation |
| contracted | Contract signed, awaiting brief |
| content | Brief received through brand review |
| published | Video is live |
| invoiced | Invoice sent, awaiting payment |
| paid | Payment received, deal complete |

## Content Sub-Stages
1. brief_received — Brand sent creative brief
2. script_writing — Andrew drafting script
3. script_submitted — Script sent to brand
4. script_approved — Brand approved script
5. filming — Integration being filmed
6. brand_review — Rough cut sent for approval

## Deal Types
- **flat_rate** — Fixed fee, paid after video goes live
- **cpm** — Paid per 1,000 views, usually with a cap
- **full_video** — Brand sponsors entire video (rare)

## CPM Calculation
```
gross_amount = min(views / 1000 * cpm_rate, cpm_cap)
net_amount = gross_amount * 0.8  (20% agency commission)
```

Views are locked at 30 days post-publish for invoicing.

## Payment Timeline
1. Video publishes
2. Brand pays agency (typically 30 days)
3. Agency pays Andrew (+15 days)
4. Total: ~45 days from publish to payment

## Email Workflow
- Andrew forwards sponsor emails to montythehandler@gmail.com
- Monty checks 3x daily (7am, 1pm, 6pm)
- Updates extracted: brand, stage, value, deadlines, deliverables
- Dashboard updated automatically

## Auto-Detection
- Daily job syncs Andrew's YouTube channel
- New videos matched to sponsors by date and brand name
- View counts updated automatically
- 30-day lock triggers invoice-ready alert

## Database
Single source of truth: `production-hub.db`
- `episodes` — all videos, view counts, YouTube IDs
- `sponsors` — all deals, linked to episodes via episode_id
```

### Add to CRM UI

Add a button/link in the sponsors page header:
```tsx
<a href="/docs/sponsor-crm" className="btn btn-ghost" style={{ fontSize: 12 }}>
  📖 View Rules
</a>
```

Create a simple docs page at `/docs/sponsor-crm` that renders the skill markdown.

---

## Files to Create/Modify

### Create:
- `app/api/youtube/sync/route.ts` — YouTube sync endpoint
- `skills/sponsor-crm/SKILL.md` — Skill documentation (in workspace, not production-hub)
- `app/docs/sponsor-crm/page.tsx` — Rules documentation page

### Modify:
- `lib/db.ts` — Add episode columns if needed
- `app/pipeline/sponsors/page.tsx` — Update CPM display, add rules link
- `app/api/sponsors/route.ts` — Include episode view counts in response

---

## Acceptance Criteria

- [ ] Episodes table has youtube_video_id, view_count columns
- [ ] `/api/youtube/sync` fetches videos and matches to sponsors
- [ ] CPM cards show live estimates before 30 days
- [ ] CPM cards show final locked amount after 30 days
- [ ] Auto-link works when video goes live
- [ ] Skill documentation created
- [ ] "View Rules" link visible on CRM page
- [ ] View counts update from episodes (single source of truth)

---

## YouTube API Details

**Channel ID:** UCfVqXHFHPtdOtzNaTAuglag (Andrew Fraser)

**Search endpoint:**
```
GET https://www.googleapis.com/youtube/v3/search
?part=snippet
&channelId=UCfVqXHFHPtdOtzNaTAuglag
&type=video
&order=date
&maxResults=10
&publishedAfter={14_days_ago_ISO}
&key={API_KEY}
```

**Videos endpoint (for view count):**
```
GET https://www.googleapis.com/youtube/v3/videos
?part=statistics,snippet
&id={video_id}
&key={API_KEY}
```
