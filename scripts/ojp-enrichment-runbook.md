# OJP Applicant Data Enrichment Runbook

**Purpose:** Backfill missing sidebar data (salary, WhatsApp, education, experience, OJP title, work type) and portfolio URLs for existing applicants in the DB.

**Run by:** An OpenClaw agent with access to the `browser` tool (profile=openclaw).

**DB:** `/Users/montymac/.openclaw/workspace/production-hub/production-hub.db`

---

## Overview

For each applicant in the DB that is missing enrichment data, this runbook guides you to:
1. Find their conversation in the OJP inbox
2. Extract sidebar data + message body links
3. Write the data back to the DB

---

## Step 0: Identify Applicants Needing Enrichment

Run this query to get the list of applicants needing backfill:

```bash
sqlite3 ~/.openclaw/workspace/production-hub/production-hub.db "
SELECT id, name, ojp_conversation_id
FROM applicants
WHERE source = 'onlinejobs_ph'
  AND (
    desired_salary = '' OR desired_salary IS NULL OR
    experience = '' OR experience IS NULL
  )
ORDER BY created_at ASC;
"
```

Store the result. You'll work through each row one at a time. Note which have `ojp_conversation_id` already set — those can be accessed directly by URL without searching the inbox.

---

## Step 1: Navigate to OJP Inbox

```
browser(action=open, profile=openclaw, url="https://v2.onlinejobs.ph/message/job/all-applicants")
```

Wait for the page to load (conversation list visible on the left).

Take a snapshot to confirm you can see the conversation list:
```
browser(action=snapshot, profile=openclaw)
```

---

## Step 2: Process Each Applicant

For each applicant from Step 0, follow this sub-process:

### 2a. Navigate to Their Conversation

**If `ojp_conversation_id` is already set:**
```
browser(action=navigate, profile=openclaw, url="https://v2.onlinejobs.ph/message/conversation/{ojp_conversation_id}")
```

**If `ojp_conversation_id` is NOT set — search the inbox:**

First try scrolling through the inbox list to find their name:
```
browser(action=snapshot, profile=openclaw)
```

Look for the applicant's name in the left panel conversation list. If not visible:
```
browser(action=act, profile=openclaw, request={kind: "scroll", ref: "<inbox-list-ref>", direction: "down"})
```

Keep scrolling and taking snapshots until you find the name OR exhaust the list (~10 scrolls max). If still not found, skip this applicant and move to next.

When found, click on their name to open the conversation:
```
browser(action=act, profile=openclaw, request={kind: "click", ref: "<their-name-ref>"})
```

Note the conversation URL from the browser — extract the conversation ID from `https://v2.onlinejobs.ph/message/conversation/{ID}` and save it.

### 2b. Take a Snapshot of the Conversation Page

```
browser(action=snapshot, profile=openclaw)
```

The page has two main areas:
- **Left panel:** Conversation list (ignore for extraction)
- **Center:** Message thread (scan for URLs)
- **Right sidebar:** Applicant profile data (primary extraction target)

### 2c. Extract Right Sidebar Data

From the snapshot, locate and extract the following from the **right sidebar**:

| Field | Location in Sidebar | DB Column |
|-------|--------------------|-----------| 
| OJP Title | Their job title below their name (e.g. "Graphic Illustrator") | `ojp_title` |
| Work type + Salary | "Looking for full-time work (8 hours/day) at $X.XX/hour ($X,XXX.XX/month)" | `ojp_work_type`, `ojp_hourly_rate`, `desired_salary` |
| Email | "Contact Me" section | `email` (only update if currently empty) |
| WhatsApp/Viber | "Contact Me" section | `whatsapp` |
| Education | "Educational Attainment:" section | `education` |
| Experience | "Experience Overview:" section | `experience` |

**Parsing notes:**
- `ojp_work_type`: Extract the work type portion, e.g. `"full-time (8 hours/day)"`
- `ojp_hourly_rate`: Extract just the hourly rate, e.g. `"$7.03/hour"`
- `desired_salary`: Store the full string, e.g. `"$7.03/hour ($1,238.07/month)"`
- `education`: May be multi-line — capture all of it
- `experience`: May be a short paragraph summary — capture all of it
- `whatsapp`: May say "WhatsApp: +63..." or "Viber: +63..." — store as-is

If any field is not present in the sidebar (blank or hidden), leave that DB column unchanged.

### 2d. Extract Portfolio URLs from Message Body

From the snapshot, scan the **center message thread** (their initial message and any subsequent messages from them) for URLs. Target these types:
- Google Drive: `drive.google.com/...`
- YouTube: `youtube.com/...` or `youtu.be/...`
- Vimeo: `vimeo.com/...`
- Behance: `behance.net/...`
- Notion: `notion.so/...`
- Portfolio sites: any `.com` link that isn't a social/spam URL

Collect all found URLs. If multiple, join them with a newline `\n`.

Store in `portfolio_url` (only update if currently empty OR if new URLs found that aren't already stored).

### 2e. Extract the Conversation ID from URL

If `ojp_conversation_id` was not already set, capture it now from the current page URL:
```
browser(action=snapshot, profile=openclaw)
```
Extract the numeric ID from `https://v2.onlinejobs.ph/message/conversation/{ID}`.

### 2f. Write to DB

Run these SQL updates (only set fields where you found data):

```bash
sqlite3 ~/.openclaw/workspace/production-hub/production-hub.db "
UPDATE applicants SET
  ojp_conversation_id = '{conversation_id}',
  ojp_title = '{title}',
  ojp_work_type = '{work_type}',
  ojp_hourly_rate = '{hourly_rate}',
  desired_salary = '{full_salary_string}',
  whatsapp = '{whatsapp_or_viber}',
  education = '{education}',
  experience = '{experience}',
  portfolio_url = CASE WHEN portfolio_url = '' OR portfolio_url IS NULL THEN '{portfolio_urls}' ELSE portfolio_url END,
  email = CASE WHEN email = '' OR email IS NULL THEN '{email}' ELSE email END,
  updated_at = datetime('now')
WHERE id = {applicant_db_id};
"
```

Replace each `{placeholder}` with the actual extracted value. Escape single quotes in text values by doubling them (`''`).

---

## Step 3: Handle Failures Gracefully

If any step fails for a specific applicant (page not found, sidebar missing, parsing error):
- Log: `SKIP: {name} — reason`
- Continue to the next applicant
- Do NOT abort the entire run

---

## Step 4: Progress Tracking

After each successful applicant, log:
```
DONE: {name} (DB id={id}) — salary={desired_salary}, experience={yes/no}, whatsapp={yes/no}, education={yes/no}, portfolio_urls={count}
```

---

## Step 5: Final Report

After processing all applicants, run:

```bash
sqlite3 ~/.openclaw/workspace/production-hub/production-hub.db "
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN desired_salary != '' AND desired_salary IS NOT NULL THEN 1 END) as has_salary,
  COUNT(CASE WHEN experience != '' AND experience IS NOT NULL THEN 1 END) as has_experience,
  COUNT(CASE WHEN whatsapp != '' AND whatsapp IS NOT NULL THEN 1 END) as has_whatsapp,
  COUNT(CASE WHEN education != '' AND education IS NOT NULL THEN 1 END) as has_education,
  COUNT(CASE WHEN portfolio_url != '' AND portfolio_url IS NOT NULL THEN 1 END) as has_portfolio
FROM applicants
WHERE source = 'onlinejobs_ph';
"
```

Report how many applicants now have each enrichment field populated, and how many were skipped/failed.

---

## Tips & Edge Cases

- **Pagination in OJP inbox:** The inbox list lazy-loads. Scroll down 3-5 times before concluding a name isn't visible.
- **Name mismatches:** OJP may show a slightly different name format (e.g. "Ma. Jeramie" vs "Ma Jeramie"). Use fuzzy matching — look for first name + distinctive part of last name.
- **Already-enriched applicants:** Skip any applicant where `desired_salary` and `experience` are both already populated (per the Step 0 query).
- **Rate limiting:** Add a brief pause (1-2 seconds) between conversations to avoid hammering the OJP API.
- **Session timeout:** If OJP redirects to login, navigate to `https://v2.onlinejobs.ph` and log in, then resume from the last applicant processed.
- **VIEW FULL PROFILE button:** Located at the bottom of the sidebar. You can click it to get more data if the sidebar fields are truncated, but it opens a new page — navigate back to the conversation afterward.
