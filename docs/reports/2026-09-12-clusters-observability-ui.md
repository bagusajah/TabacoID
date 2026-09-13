---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-12
status: published
human_review: autonomous
---

# Clusters observability client UI

## Engineering Question
Three real, tested server endpoints — `GET /api/clusters`, `GET /api/clusters/:id/status?namespace=&name=`, `GET /api/namespaces/:ns/pods?selector=` (routes/kubernetes.routes.js, 8 tests, done early in Phase 1) — had no client surface. The §7 deploy story's observability leg existed only via curl. Was a UI needed, and what's the minimal one?

## Method
1. Read ROADMAP.md item: all 16 "Next up" items were ✅ Done — the genuine next gap was the un-backed-by-UI cluster observability API (client nav had no Clusters link; only Admin.jsx touched clusters, as reference-data CRUD).
2. Implemented: `client/src/pages/Clusters.jsx` (new, 229 lines) + route in `client/src/main.jsx` + nav link in `client/src/App.jsx`. Followed existing page patterns (Secrets.jsx / Calendar.jsx): api.js wrapper, inline row expansion, `<details className="panel">` collapsible, badge classes, muted driver-unavailable note on 501.
3. Tested: `cd client && npm run build` → clean (46 modules, 2.55s). `npm test` → **35/35 suites, 397/397 tests passed**, 20.4s, no forceExit.

## Findings
- Clusters registry table (Name / Datacenter / Environment) over `GET /api/clusters`. Per-row "Status" toggle expands an inline panel: namespace + workload-name inputs → live Deployment status (Ready/Not-ready badge, `available/desired (updated N)` replicas, version label, endpoint link, conditions list with reasons).
- Collapsible Pods panel: namespace + optional label-selector → pods table with phase badges (Running→ok / Pending→info / Failed→err / else muted), Pod IP, node, start time.
- Nav link `/clusters` gates on signed-in user only — the three server routes are `requireUser` (clusters are reference data, like environments), so a `can()` gate would hide a page every authenticated user may read. Page itself is behind `RequireAuth`.
- 501 `driver_not_implemented` (no DRIVER_DEPLOY, not in-cluster) renders a muted "No deploy driver configured (set DRIVER_DEPLOY or run in-cluster)." note, not an error — matches Secrets.jsx.
- No server, test, or package.json changes — pure client increment. Zero new dependencies, zero new CSS (existing table/badge/panel classes reused).
- `opencode run` CLI failed (arg-parsing → printed help, exit 1); implemented directly instead. Three defects caught in self-review before build: `useState` used where `useEffect` belonged, a stringly-typed error-kind check, and dead helper code — all fixed.

## Decision
Adopt — committed `1d11b6e2` (code) + roadmap close (docs) and pushed to `docs/multi-session-tracking`. 397 tests green, client build clean.

## Files Changed
- `console/new-cicd-console/client/src/pages/Clusters.jsx` (new)
- `console/new-cicd-console/client/src/main.jsx` (+4 lines: import + guarded route)
- `console/new-cicd-console/client/src/App.jsx` (+3 lines: nav link)
- `console/new-cicd-console/docs/ROADMAP.md` (item 17 closed, Last updated, test status)
