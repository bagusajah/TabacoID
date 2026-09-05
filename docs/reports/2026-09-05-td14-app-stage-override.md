---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-05
status: published
human_review: autonomous
---

# Per-app tracking stage override (TD-14)

## Engineering Question
Every "Next up" item (1–13) was already complete; the remaining actionable
work was the tech-debt table. TD-14 was the cleanest open item: tracking
stages are seeded from `config.releaseStages` globally, but an application
cannot declare its own stage chain. (TD-2 needs a real IdP; TD-3 needs an
admin roles API — both bigger than one increment. Phase 3 plugins are
org-specific and gated on real demand.)

## Method
1. Read ROADMAP.md item: TD-14 — "Tracking stages are seeded from
   `config.releaseStages` but there's no per-app override yet (an app can't
   declare a custom stage chain). Add an `Application.stages` override when
   needed."
2. Implemented:
   - `src/models/application.model.js` — added `stages` (nullable JSON).
   - `src/migrations/20260905000000-app-stages.js` — forward-only
     `addColumn` per ADR-0009 (tests keep plain `sync()`).
   - `src/services/tracking.service.js` — `_ensureStages` now fetches the
     release's application and prefers `application.stages` when it is a
     non-empty array of non-blank strings; otherwise the global
     `config.releaseStages` catalog (unchanged behavior). Validation lives
     in the single consumer; the model just stores JSON.
   - `test/tracking.test.js` — 3 new tests: override seeds a custom chain
     (`build → scan → ship`) via the API; `advanceStage` succeed +
     auto-advance works across the custom chain; a malformed override
     (`['ok', '', 42]`) is ignored → 6 default stages.
3. Tested: `npm test -- --forceExit` → **293/293 passed, 28 suites**
   (was 290; +3). Org-neutral check: `grep -ri ascendmoney src/` → 0 hits.

## Findings
- No new route or permission needed: `updateApplication` passes unknown
  fields through, so `PUT /api/apps/:id {"stages": [...]}` already sets the
  override (gated on `apps:update`).
- Dormant by default — `stages` is null unless an admin sets it; seeding is
  per-release and idempotent, so already-seeded releases keep their stages.
- What's left in the debt table: TD-2 (OIDC e2e, needs a real IdP), TD-3
  (roles admin API), TD-5 (jest teardown), TD-12 (manifest synthesis),
  TD-15 (docs for `calendar:force`). Phase 3 plugins remain not started.

## Decision
Adopt — smallest change that closes the debt item: one column, one
migration, a 10-line preference check in the one function that seeds
stages, three tests.

## Files Changed
- console/new-cicd-console/src/models/application.model.js
- console/new-cicd-console/src/migrations/20260905000000-app-stages.js
- console/new-cicd-console/src/services/tracking.service.js
- console/new-cicd-console/test/tracking.test.js
- console/new-cicd-console/docs/ROADMAP.md
