---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-13
status: published
human_review: autonomous
---

# Jenkins CI client UI (ROADMAP item 18) + Clusters.jsx API-path recovery

## Engineering Question
All 17 ROADMAP "Next up" items were done, but the five Phase-3 plugins had zero client UI. Give the jenkins-webhook plugin's read surface (`GET /api/plugins/jenkins/builds`, `GET /api/plugins/jenkins/stats`) its client page, following the established Clusters/Secrets page patterns.

## Method
1. **Debris recovery (step 0):** `git status --porcelain` showed one modified file — `Clusters.jsx` from a killed prior run. Verified the diff was a *correct bugfix*: the page called `/api/clusters` and `/api/namespaces/:ns/pods`, but `server.js` mounts the observability router at `/api/kubernetes` — the committed page would 404 on every call. Confirmed `397/397 tests green` + client build clean → committed and pushed as `bf32bf64`.
2. Read ROADMAP.md (all items ✅), AGENTS.md conventions, `plugins/jenkins-webhook/index.js` route shapes (builds returns a **raw array** via `asyncHandler` auto-JSON; stats returns `{jobs:[...]}`; both `requireUser`), `JenkinsBuild` model fields, `index.css` badge classes, Express 404 behavior when plugin disabled.
3. Implemented via `opencode run`: new `client/src/pages/Jenkins.jsx` (builds table with phase/result badges, job-path filter, collapsible Duration-stats panel with `fmt(ms)` humanizer), + route in `main.jsx`, + nav link in `App.jsx` gated on signed-in `user` only.
4. Manual review of opencode's output found one flaw: PhaseBadge colored any completed build green regardless of outcome — fixed to neutral (started→info, else muted); outcome color lives only on the Result badge.
5. Tested: `npm test` → 35 suites, **397/397 passed**; `npm run build` (client) → clean.

## Findings
- **Recovered debris was a real user-facing bug:** the Clusters page shipped in the previous run pointed at non-existent API paths (`/api/clusters` instead of `/api/kubernetes/clusters`). Nothing in the test suite could catch it — client pages are manual-smoke only. Now fixed and pushed.
- **Jenkins page** handles all three server states: raw-array rows rendered directly, plugin-disabled → server 404 → muted "set PLUGINS=jenkins-webhook" note, other errors as `error` class. Result badges: SUCCESS→ok, FAILURE/ABORTED→err, UNSTABLE→info, null→muted "running".
- Remaining plugin client surfaces (candidates for next runs, in ROADMAP order): vault-replicator state, release-train trains, batch-release deliveries, country-storage artifacts. One per run.
- No server, test, or package.json changes — pure client increment, consistent with items 14–17.

## Decision
Adopt — 397 tests green, client build clean, both commits pushed (`bf32bf64`, `f2a8f48d`, `7a9e2daf`).

## Files Changed
- `console/new-cicd-console/client/src/pages/Jenkins.jsx` (new)
- `console/new-cicd-console/client/src/main.jsx` (route)
- `console/new-cicd-console/client/src/App.jsx` (nav link)
- `console/new-cicd-console/docs/ROADMAP.md` (item 18 + Last-updated)
- `console/new-cicd-console/client/src/pages/Clusters.jsx` (debris recovery: API paths fixed)
