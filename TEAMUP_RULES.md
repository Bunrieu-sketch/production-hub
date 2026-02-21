# TeamUp Integration Rules

## Source of Truth

**TeamUp is the source of truth for scheduling.** Mission Control syncs FROM TeamUp, not the other way around.

## Workflow

```
TeamUp (source of truth)
    ↓ (sync button pulls)
Mission Control Calendar (read-only view)
```

## How to Use

### 1. Add/Edit Events → Use TeamUp

- Go to your TeamUp calendar in the browser/app
- Create, edit, or delete events there
- Then click **"Sync from TeamUp"** in Mission Control

### 2. Sync Button

- Located in top-right of Calendar page
- Click to pull latest events from TeamUp
- Shows last sync time

### 3. What Gets Synced

| TeamUp Event | Mission Control |
|--------------|-----------------|
| Title | Event title |
| Start/End dates | Event dates |
| Location | Event location |
| Description | Event notes |
| Calendar (sub-calendar) | Event category |

### 4. Event Categories (TeamUp Sub-calendars)

Use these sub-calendar names in TeamUp for proper categorization:

- **"Shoot"** → Shooting schedules
- **"Pre-Production"** → Planning, research, calls
- **"Post-Production"** → Editing, review
- **"Publish"** → Uploads, premieres
- **"Sponsor"** → Sponsor deadlines, calls
- **"Milestone"** → Key deadlines
- **"Travel"** → Flights, hotels, transport
- **"Personal"** → Personal blocks (won't sync)

## Rules

1. **Always edit in TeamUp first** — Mission Control is read-only for calendar events
2. **Sync after making changes** — Click the sync button to pull updates
3. **Don't duplicate events** — TeamUp events replace Mission Control's inferred calendar events
4. **Use consistent naming** — Sub-calendar names must match exactly (case-insensitive)

## API Configuration

TeamUp API key and calendar ID should be set in `.env.local`:

```
TEAMUP_API_KEY=your_api_key_here
TEAMUP_CALENDAR_ID=your_calendar_id_here
```

To get these:
1. Go to TeamUp → Settings → API
2. Generate an API key
3. Copy your calendar ID from the URL (e.g., `ks1b3p7q1d3b2b2b`)

## Troubleshooting

- **Events not showing?** Check sync was successful (green toast)
- **Wrong colors?** Verify sub-calendar names match the categories above
- **Old events still showing?** Hard refresh the page after sync
