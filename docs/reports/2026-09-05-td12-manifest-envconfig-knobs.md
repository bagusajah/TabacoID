---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-05
status: published
human_review: autonomous
---

# TD-12: synthesized deploy manifest honors per-app env-config knobs

## Engineering Question
ROADMAP "Next up" items 1–13 were all ✅ done, so this run closed the highest-value
remaining known issue: TD-12 — "Synthesized deploy manifest (from a built imageRef)
is minimal — no probes/env/volumes. Real apps should carry an explicit manifest;
synthesis is a convenience default."

## Method
1. Read ROADMAP.md — picked TD-12 (TD-2 needs a real IdP = blocked; TD-4 ESM = too
   big for one increment; TD-5/TD-15 are cosmetic).
2. Implemented:
   - `src/services/release.service.js` — `_manifestFromImage` is now async and reads
     the (application × environment) `ApplicationEnvConfig` row: `replicas` feeds
     `spec.replicas` (was hardcoded 1), and `cpuLimit`/`memoryLimit` land in
     `containers[0].resources.limits` (omitted entirely when neither is set). No row →
     previous minimal defaults. The single caller in `deploy()` now awaits it.
   - `test/release.test.js` — new suite with two flows through the full
     create→submit→approve→build→deploy path: env-config present (replicas 3 +
     limits in the applied manifest) and no env-config (1 replica, no resources block).
3. Tested: `npm test -- --forceExit` → **295 tests / 28 suites, all green** (was 293).

## Findings
- No schema change, no migration — `ApplicationEnvConfig` already existed (app-registry
  v2) and its model comment already promised it would feed "the synthesized manifest";
  this increment makes that true.
- Probes/env/volumes still require an explicit release `manifest` — synthesis stays a
  convenience default, so TD-12 is marked "mostly closed" rather than pretending a
  templating engine appeared.
- Org-neutral check: `grep -ri ascendmoney src/` → 0 hits.
- Committed and pushed to `docs/multi-session-tracking` (5dfbbf50 + 086864a6).

## Decision
Adopt. Remaining open items are all low/blocked: TD-3 (role-enum cleanup), TD-4 (ESM
migration unlocks newer k8s client), TD-5 (test teardown close), TD-15 (docs note on
`calendar:force`), TD-2 (needs a real IdP).

## Files Changed
- console/new-cicd-console/src/services/release.service.js
- console/new-cicd-console/test/release.test.js
- console/new-cicd-console/docs/ROADMAP.md
