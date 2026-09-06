---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-06
status: published
human_review: autonomous
---

# Phase 3 started: plugin loader + jenkins-webhook plugin

## Engineering Question
ROADMAP "Next up" items 1–13 were all done; the remaining work was
**Phase 3 — Plugins (not started)**. This run recovered and finished the
first Phase 3 increment: the plugin boundary/contract plus the first plugin
(`jenkins-webhook`, the §4.8 "CI duration recorder").

## Method
1. Read ROADMAP.md — found uncommitted debris from a previous killed run
   covering exactly this increment (plugin loader, plugin dir, model,
   migration, tests).
2. Verified the debris was coherent (reviewed every file, org-neutral check
   passed), added the missing pieces (ADR-0011, `.env.example` plugin block,
   ROADMAP Phase 3 section + test-count update), then tested.
3. Tested: `npm test -- --forceExit` → **312 passed / 29 suites** (green).

## Findings
- **Plugin contract** (`src/plugins/index.js#initPlugins`): a plugin is a
  Node module `module.exports = (context) => {}` with
  `{app, db, config, registerRoute}`. Enabled via `PLUGINS` env
  (comma-separated; empty = core only). Idempotent; unknown names throw at
  boot. Core `src/` requires nothing under `plugins/`.
- **jenkins-webhook plugin**: `POST /api/plugins/jenkins` ingests Jenkins
  phases, folds STARTED/COMPLETED/FINALIZED into one `JenkinsBuild` row per
  (jobPath, buildNumber). Machine auth via shared-secret
  `JENKINS_WEBHOOK_TOKEN` (503 fail-closed when unset); same-phase retries
  dedup; first terminal verdict wins (COMPLETED over FINALIZED bookkeeping).
  Authenticated reads: `/builds` (jobPath/releaseId filters) and `/stats`
  (per-job avg/p50/max duration). Model loads only when enabled; forward-only
  migration with unique (job_path, build_number).
- **Auth split**: `/api/plugins/*` is a self-gating namespace in the JWT
  middleware — plugin machine endpoints use their own shared secret, plugin
  user-facing endpoints call `requireUser` themselves.
- Deliberate ceiling: plugin tables persist after a plugin is disabled
  (forward-only migrations don't depend on runtime config) — documented in
  ADR-0011.

## Decision
Adopt — committed `514aac68` and pushed to `docs/multi-session-tracking`.

## Files Changed
- `console/new-cicd-console/src/plugins/index.js` (new — loader)
- `console/new-cicd-console/plugins/jenkins-webhook/index.js` (new — plugin)
- `console/new-cicd-console/src/models/jenkins_build.model.js` (new)
- `console/new-cicd-console/src/migrations/20260905120000-jenkins-builds.js` (new)
- `console/new-cicd-console/src/models/index.js` (plugin model hook)
- `console/new-cicd-console/src/middleware/auth.js` (self-gating /plugins)
- `console/new-cicd-console/src/server.js` (initPlugins at boot)
- `console/new-cicd-console/src/config.js` (plugins block)
- `console/new-cicd-console/test/jenkins-webhook.test.js` (new, 17 tests)
- `console/new-cicd-console/.env.example` (PLUGINS/JENKINS_WEBHOOK_TOKEN)
- `console/new-cicd-console/docs/decisions/0011-plugin-loader-and-boundary.md` (new)
- `console/new-cicd-console/docs/ROADMAP.md` (Phase 3 section, counts)
- `console/new-cicd-console/docker-compose.yml` (restart: unless-stopped)
