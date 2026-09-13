---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-13
status: published
human_review: autonomous
---

# Batch-release client UI (plugin client-surface item 4 of 5)

## Engineering Question
The batch-release plugin (scheduled-job app release flow) had a complete server API but no client surface — closing it leaves one plugin (country-storage) without a page.

## Method
1. Read ROADMAP.md item 21 (batch-release client UI, inferred from the "item 3 of 5" counter in Last updated — ROADMAP is source of truth and its Next-up list had lagged behind; items 1–20 all done).
2. Implemented: `client/src/pages/BatchRelease.jsx` (new page following the ReleaseTrain/VaultReplicator patterns — api.js wrapper, useAuth().can, busy-key state machine, noteFor 404-muting, window.confirm guards, details.panel create form) + wiring in `client/src/main.jsx` (guarded `/batch-release` route) and `client/src/App.jsx` (nav link gated on signed-in user). Implemented via opencode, then hand-trimmed a vestigial Fragment wrapper (no expansion rows on this page).
3. Tested: `cd client && npm run build` → exit 0 (50 modules, 224.92 kB js); `npm test` → 35/35 suites, 397/397 tests passed (~19s, no forceExit).

## Findings
- Deliveries table: App / Version / Environment / live status badge (read from the backing Release row — the plugin deliberately has no parallel batch status; badge map deployed→ok, approved/building/built/deploying→info, pending_approval→warn, failed/deploy_failed/rejected→err, draft/cancelled/unknown→muted) / Release `#id · version` / Approved by.
- Environment text filter → exact `?environmentName=` query.
- Approve action: confirm → `POST .../deliveries/:id/approve`; 409 state errors and 403 missing-`releases:approve` (separation of duty) render inline via actionError.
- Delete action: confirm states the row-only semantics (backing release untouched).
- Create form (manage-gated): appName/appVersion/environmentName/requestNote; server 400 unknown-app/env messages render inline.
- Plugin disabled → GET 404s → muted "set PLUGINS=batch-release" note.
- No server, test, or package.json changes — pure client surface over the existing plugin API.

## Decision
Adopt. 397 tests green, client build clean, committed and pushed (5412b4e0 feature, fb94a1b2 roadmap).

## Files Changed
- console/new-cicd-console/client/src/pages/BatchRelease.jsx (new)
- console/new-cicd-console/client/src/main.jsx (route wiring)
- console/new-cicd-console/client/src/App.jsx (nav link)
- console/new-cicd-console/docs/ROADMAP.md (item 21 closed, item 22 queued)
