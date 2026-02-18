# Task: Simplified Sponsors Kanban

## Objective
Redesign the sponsors page (`/pipeline/sponsors`) to collapse 12 columns into 6, with sub-statuses shown inside cards instead of as separate columns.

## Current Problem
- 12 Kanban columns require horizontal scrolling
- Script phases (writing, submitted, approved) are separate columns but should be sub-statuses
- White scrollbar doesn't match dark theme

## New Stage Structure

Collapse to 6 main stages:

| Stage Key | Label | Old Stages Merged | Card Shows |
|-----------|-------|-------------------|------------|
| `leads` | Leads | inquiry, negotiation | Sub-status badge |
| `contracted` | Contracted | contract | Contract date |
| `content` | Content | brief_received, script_writing, script_submitted, script_approved, filming, brand_review | Progress bar (6 sub-steps) |
| `published` | Published | live | Days since publish |
| `invoiced` | Invoiced | invoiced | Days until payment due / overdue badge |
| `paid` | Paid | paid | Payment received date |

## Content Stage Sub-Statuses
Show as a progress indicator inside the card:
1. Brief Received
2. Script Writing  
3. Script Submitted
4. Script Approved
5. Filming
6. Brand Review

## Database Changes
- Add a new column `sub_status` to sponsors table (nullable TEXT)
- Map existing `stage` values to new structure during migration
- Keep existing `stage` column but update its CHECK constraint

## Migration Logic
```sql
-- Stage mapping:
-- inquiry, negotiation → leads (sub_status = 'inquiry' or 'negotiation')
-- contract → contracted
-- brief_received, script_writing, script_submitted, script_approved, filming, brand_review → content (sub_status = original value)
-- live → published
-- invoiced → invoiced
-- paid → paid
```

## UI Changes

### 1. Kanban Columns
- Reduce from 12 to 6 columns
- Each column is wider (more room for cards)
- No horizontal scroll needed on standard screens

### 2. Cards
- Show brand name, deal value (net), deal type badge
- For `leads` stage: show sub-status as small badge (Inquiry/Negotiation)
- For `content` stage: show progress bar with 6 dots/steps, current step highlighted
- For `published`: show "X days ago" 
- For `invoiced`: show "Due in X days" or "OVERDUE X days" in red
- For `paid`: show payment date

### 3. Progress Bar Component
Create a small horizontal progress indicator:
```
○ ○ ● ○ ○ ○   Script Writing
```
- Filled dot = current step
- Empty dots = other steps
- Label below showing current sub-status

### 4. Scrollbar Fix
Add to globals.css:
```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg);
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-dim);
}
```

### 5. Filter Tabs (optional, nice-to-have)
Add tabs above Kanban: All | Active | Needs Attention
- Active = not paid
- Needs Attention = has overdue dates

## Files to Modify
1. `app/pipeline/sponsors/page.tsx` - main page redesign
2. `app/api/sponsors/route.ts` - update stage handling
3. `app/api/sponsors/[id]/route.ts` - handle sub_status updates  
4. `lib/db.ts` - add migration for sub_status column
5. `app/globals.css` - scrollbar styling

## Keep Intact
- All existing data in sponsors table
- Detail panel (slide-out) functionality
- Drag-and-drop between stages
- Alerts bar
- All API endpoints

## Acceptance Criteria
- [ ] 6 columns instead of 12
- [ ] Cards show progress/sub-status appropriately
- [ ] Scrollbar matches dark theme
- [ ] Existing data preserved and correctly mapped
- [ ] Drag-drop still works between main stages
- [ ] Detail panel still opens on card click

## Don't Do
- Don't create a separate calendar (use existing `/production/calendar`)
- Don't create new database tables (just add sub_status column)
- Don't modify the database file location (stay in mission-control.db)
