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
