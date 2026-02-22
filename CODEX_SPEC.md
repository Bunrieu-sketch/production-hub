# Documents Viewer Upgrade Spec

## Overview
Upgrade the Documents tab in Production Hub to be the ultimate document viewer — aggregating all auto-generated content (briefs, reports, chats) with better organization, search, and navigation.

## Current State
- `app/docs/page.tsx` — basic sidebar + viewer layout
- `lib/docs.ts` — scans Memory, Root, Projects, Skills directories
- Categories: memory, root, projects, skills
- Basic filename search only
- Simple markdown rendering

## Phase 1: New Document Sources + Better Categories

### New Directories to Scan
Add these to `lib/docs.ts`:

1. **Daily Briefs** — `memory/briefs/*.md`
   - Category: `briefs`
   - Label: "📋 Daily Briefs"
   - Sort: newest first by date in filename

2. **Chat Transcripts** — `memory/chats/*.md`
   - Category: `chats`
   - Label: "💬 Chat History"
   - Sort: newest first

3. **Research Reports** — `memory/research/*.md`
   - Category: `research`
   - Label: "🔬 Research"
   - Sort: newest first

4. **Competitor Intel** — `../competitor-tracker/reports/*.md`
   - Category: `intel`
   - Label: "📊 Competitor Intel"
   - Sort: newest first
   - Note: This is outside workspace but still accessible

### Updated Category Order
```typescript
const categoryOrder = ['briefs', 'chats', 'research', 'intel', 'memory', 'root', 'projects', 'skills'];
```

### Frontmatter Support
Parse YAML frontmatter from documents to extract:
- `date` — for sorting and display
- `type` — document type (daily-brief, research, chat, etc.)
- `tags` — array of tags for filtering

Use `gray-matter` package or simple regex extraction.

## Phase 2: Enhanced UI

### Date Grouping in Sidebar
Group documents by date:
- "Today"
- "Yesterday"
- "This Week"
- "This Month"
- "Older"

### Preview Snippets
Show first 100 chars of document content in the list item (truncated, no markdown).

### Better Search
- Full-text search across document content, not just filenames
- Highlight matching terms in preview
- Consider using a simple in-memory index or just grep-style search

### Keyboard Navigation
- `j` / `k` — move up/down in list
- `Enter` — open selected document
- `/` — focus search
- `Esc` — clear search / close viewer

### Quick Filters
Add filter buttons above the list:
- "All" | "Briefs" | "Research" | "Intel" | "Chats"
- Date range picker (optional)

### Improved Markdown Rendering
- Better code block styling
- Table support
- Syntax highlighting for code (use highlight.js or prism)
- Collapsible sections for long documents

## File Changes Required

### `lib/docs.ts`
- Add new directory scanning for briefs, chats, research, intel
- Add frontmatter parsing
- Add content snippet extraction
- Add full-text search function

### `app/docs/page.tsx`
- Update category order and icons
- Add date grouping logic
- Add preview snippets to list items
- Add keyboard event handlers
- Add quick filter buttons
- Improve markdown renderer

### `app/api/docs/route.ts`
- Add search query parameter for full-text search
- Return snippets in list response

### `app/globals.css` (or component styles)
- Style improvements for the new layout
- Better code block styling
- Filter button styles

## Design Notes
- Keep the existing dark theme
- Match the existing Production Hub aesthetic
- Sidebar width: ~320px
- Use Lucide icons consistently
- Smooth transitions on selection

## Dependencies to Add
```bash
npm install gray-matter
```

## Testing
- Verify all document types appear in correct categories
- Verify search works across content
- Verify keyboard navigation
- Verify date grouping is correct
- Test with empty categories (should hide them)

## Out of Scope (for now)
- Pinning/favorites (Phase 3)
- Auto-tagging (Phase 3)
- Calendar view (Phase 3)
- Document editing (never)
