---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-06
status: published
human_review: autonomous
---

# Batch-release plugin landed (recovered from a killed run)

## Engineering Question
ROADMAP "Next up" → Phase 3 plugin candidate `batch-release` (§4.8, legacy
`cicd_modules/batch-release.js`). A previous run was killed mid-work and left
uncommitted debris for exactly this plugin.

## Method
1. Read ROADMAP.md: next candidate was `batch-release` (release-train had just
   closed at 342 tests).
2. Recovered debris first per skill loop: `git status --porcelain` showed
   `plugins/batch-release/` + model + migration + tests + 2 one-line hooks
   (`src/models/index.js` plugin-model registration, `test/_db.js` teardown
   order) — all uncommitted from the killed run.
3. Reviewed the debris end-to-end before trusting it: plugin follows the
   release-train pattern (ADR-0011) — BatchDelivery row stores the batch
   identity, lifecycle runs through the core Release state machine, status is
   never stored. Migration mirrors `20260906120000-release-trains.js`
   (applied unconditionally by the runner, model loads only when enabled).
4. Tested: `npm test -- --forceExit` → **32 suites, 357 tests passed**
   (342 baseline + 15 new).
5. Committed as the finished increment and pushed.
6. Updated ROADMAP.md: Phase 3 table row, "four increments done", test count
   357/32, remaining candidates now just `country-storage`. Pushed.

## Findings
What was built (the recovered increment):
- `POST /api/plugins/batch-release/deliveries` — creates a draft core release
  + BatchDelivery row; re-creating the same app+version+env cancels the
  previous release and replaces the row (legacy semantics without the silent
  delete). Validates app + env exist.
- `GET .../deliveries` (+`?environmentName=`) and `GET .../deliveries/:id` —
  requireUser; status derived live from the Release row (no stale stored
  status).
- `POST .../deliveries/:id/approve` — drives submit→approve through the core
  state machine; double gate: `batch-release:manage` **and** `releases:approve`
  (separation of duty — the requester can't approve their own batch).
- `DELETE .../deliveries/:id` — deletes the row only; the backing release is
  untouched (cancel via the core API).
- Model `batch_delivery.model.js` + migration
  `20260906130000-batch-deliveries.js` (release FK `SET NULL`, user FKs).

Design notes worth keeping:
- No parallel mini state machine (legacy had create→approve tables of its
  own) — the core Release row is the single source of truth.
- Deploy stays explicit on the core release endpoint; batch adds identity +
  review trail, not a second deploy path.

What's left: Phase 3 candidate `country-storage` is the only remaining §4.8
candidate.

## Decision
Adopt — recovered increment was coherent, tests green on first run, committed
as-is. Two commits: `cb533a77` (plugin) and `e70da1e5` (roadmap), both pushed
to `docs/multi-session-tracking`.

## Files Changed
- console/new-cicd-console/plugins/batch-release/index.js (new)
- console/new-cicd-console/src/models/batch_delivery.model.js (new)
- console/new-cicd-console/src/migrations/20260906130000-batch-deliveries.js (new)
- console/new-cicd-console/test/batch-release.test.js (new)
- console/new-cicd-console/src/models/index.js (plugin-model registration)
- console/new-cicd-console/test/_db.js (teardown order)
- console/new-cicd-console/docs/ROADMAP.md (status + test count)
