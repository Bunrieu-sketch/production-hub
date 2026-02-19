# Health Council — Build Spec

## Overview
Add a "Health Council" page to Mission Control (Next.js app on port 5053). This is an AI-powered system health dashboard that displays results from automated audits of the OpenClaw/Monty infrastructure.

## Architecture

The Health Council runs as a **cron job at 3:30 AM daily** (handled separately by OpenClaw, NOT by this app). The cron job writes results as JSON files to `health-council/reports/`. This app **reads and displays** those reports.

## What to Build

### 1. Database Schema Addition

Add to `mission-control.db` (SQLite via better-sqlite3):

```sql
CREATE TABLE IF NOT EXISTS health_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,           -- YYYY-MM-DD
  overall_score INTEGER NOT NULL,      -- 0-9 (count of healthy areas)
  report_json TEXT NOT NULL,           -- Full JSON report
  created_at TEXT DEFAULT (datetime('now'))
);
```

The `report_json` column stores:
```json
{
  "date": "2026-02-19",
  "overall_score": 8,
  "areas": [
    {
      "id": "cron_health",
      "name": "Cron Job Health",
      "icon": "⏰",
      "status": "healthy",          // "healthy" | "warning" | "critical"
      "summary": "All 5 jobs ran successfully",
      "details": ["Daily brief: ✅ last run 07:00", "..."],
      "agent": "Ops Monitor",
      "model": "claude-sonnet-4-6"
    },
    // ... 8 more areas
  ],
  "recommendations": [
    { "number": 1, "severity": "warning", "text": "Add API tests for mission-control" }
  ],
  "council": {
    "moderator": "claude-opus-4-6",
    "members": [
      { "role": "Engineer", "model": "claude-sonnet-4-6" },
      { "role": "Prompt Architect", "model": "gpt-5.2-pro" },
      { "role": "Data Analyst", "model": "gemini-2.5-pro" },
      { "role": "Ops Monitor", "model": "claude-sonnet-4-6" }
    ]
  }
}
```

### 2. API Endpoints

All in `app/api/health-council/`:

**GET /api/health-council/latest**
- Returns the most recent health report
- Response: `{ report: {...}, previousScore: number | null }`

**GET /api/health-council/history?days=7**
- Returns last N days of reports (date + overall_score only, for trend chart)
- Response: `{ history: [{ date, overall_score }] }`

**POST /api/health-council/reports**
- Accepts a full report JSON and saves it to the database
- Body: the report JSON structure above
- Response: `{ ok: true, id: number }`

### 3. Frontend Page

**Route:** `/health-council` (create `app/health-council/page.tsx`)

**Layout — match existing Mission Control design:**
- Dark theme (same as rest of app)
- Use existing globals.css styles

**Components:**

#### Header Section
- Title: "🏛️ Health Council"
- Subtitle: "AI-powered infrastructure health audit"
- Overall score: large circle showing X/9 with color (green ≥7, yellow 4-6, red <4)
- Last run timestamp
- Trend: small sparkline or arrow showing score change from previous day

#### 9 Health Area Cards (3x3 grid)
Each card shows:
- Icon + Name (e.g., "⏰ Cron Job Health")
- Status badge: 🟢 Healthy / 🟡 Warning / 🔴 Critical
- One-line summary
- Agent name + model that reviewed it
- Click to expand → shows detailed findings list

The 9 areas in order:
1. ⏰ Cron Job Health
2. 🔧 Code Quality
3. 🧪 Test Coverage
4. 🧠 Prompt Quality
5. 📦 Dependencies
6. 💾 Storage
7. 🧩 Skill Integrity
8. ⚙️ Config Consistency
9. 📊 Data Integrity

#### Recommendations Section
- Numbered list of recommendations
- Each with severity badge (warning/critical)
- Sorted by severity (critical first)

#### Council Members Footer
- Small section showing who reviewed: icons for each model provider
- "Reviewed by: Claude Opus 4.6 (moderator), Claude Sonnet 4.6, GPT-5.2 Pro, Gemini 2.5 Pro"

#### 7-Day Trend (bottom)
- Simple bar chart or line showing overall_score for last 7 days
- Use CSS-only bars (no chart library needed) or a simple SVG

### 4. Sidebar Navigation

Add to `components/Sidebar.tsx`:
- New item below the Competitor Intel external link
- Icon: `ShieldCheck` from lucide-react (or `HeartPulse`)
- Label: "Health Council"
- Route: `/health-council`
- Internal link (not external)

### 5. Seed Data

Create an initial seed report so the page isn't empty. Use realistic placeholder data showing a mostly-healthy system with 1-2 warnings.

## Design Guidelines

- Match existing Mission Control aesthetic exactly (dark theme, same card styles, same font)
- Cards should have subtle hover effects
- Status colors: green (#22c55e), yellow (#eab308), red (#ef4444)
- Use the existing CSS variables and patterns from globals.css
- Responsive: cards should stack on mobile

## File Structure
```
app/
  health-council/
    page.tsx              -- Main page
  api/
    health-council/
      latest/
        route.ts          -- GET latest report
      history/
        route.ts          -- GET history
      reports/
        route.ts          -- POST new report
components/
  HealthScoreCircle.tsx   -- Overall score display
  HealthAreaCard.tsx       -- Individual area card
  HealthTrend.tsx          -- 7-day trend visualization
  RecommendationList.tsx   -- Numbered recommendations
lib/
  health-council.ts       -- DB queries for health reports
```

## Important Notes
- Use `better-sqlite3` (already installed) for DB access
- Use existing patterns from other pages (check `app/page.tsx`, `app/pipeline/sponsors/page.tsx` for style reference)
- The DB file is at the project root: `mission-control.db`
- Do NOT install new dependencies — use what's already in package.json
- Run the DB migration (CREATE TABLE) in the lib file on first access (same pattern used elsewhere)
