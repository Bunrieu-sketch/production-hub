# Production Hub Gantt API Improvements

## Current State
The production-hub repo has uncommitted changes in `app/api/gantt/route.ts` that:
1. Filter out published series and completed past work
2. Consolidate phases by type (preprod → one bar, shoot → one bar, post+publish → "Edit & Publish")
3. Calculate average progress for grouped phases
4. Return a cleaner collapsed view

## What Needs to Be Done

1. **Commit the existing changes** - The diff is ready, just needs to be committed properly
2. **Test the build** - Run `npm run build` to ensure it compiles
3. **Verify the app runs** - Test the timeline page at `/production/timeline`
4. **Check for any missing pieces** - Ensure TimelineGantt component supports the new custom_class values
5. **Create a branch and PR** - Follow the established git workflow

## Files with Uncommitted Changes
- `app/api/gantt/route.ts` - Major refactoring (consolidated phases, filtering)
- `app/api/calendar/route.ts` - Adds idea and series events to calendar
- `app/production/calendar/page.tsx` - Minor changes
- `app/production/timeline/page.tsx` - Minor changes

## Git Workflow (CRITICAL)
1. Create branch: `feat/gantt-phase-consolidation`
2. Commit all changes with conventional commits
3. Push branch to origin
4. Create PR via `gh pr create`
5. DO NOT push to main - Andrew reviews and merges

## Testing Checklist
- [ ] `npm run build` passes without errors
- [ ] Timeline page loads and shows data
- [ ] Gantt chart renders with consolidated phase bars
- [ ] Series are properly filtered (no published series)
- [ ] Progress percentages display correctly

## CSS Classes Used
The API returns these custom_class values that should be styled:
- `gantt-parent` - Series header bar
- `phase-preprod` - Pre-production phase bar
- `phase-shoot` - Shooting phase bar  
- `phase-post` - Edit & Publish phase bar

Check if these are styled in the TimelineGantt component or global CSS.
