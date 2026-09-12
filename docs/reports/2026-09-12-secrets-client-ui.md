---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-12
status: published
human_review: autonomous
---

# Secrets client UI (§7 "manage its secrets" — client surface closed)

## Engineering Question
The `/api/vault` secrets API (4 endpoints over the SecretsDriver) existed since Phase 1, but the React client had no page for it — every other capability (apps, releases, calendar, tracking, impact, admin, RBAC) had a UI except secrets. This was the last §7 exit-criterion client-surface gap.

## Method
1. Read ROADMAP.md item: all 15 "Next up" items were ✅; identified the secrets-UI gap against the §7 exit criterion ("…deploy it to vanilla k8s, and **manage its secrets**"). Debris check first: `git status --porcelain` → clean.
2. Implemented via opencode (files changed):
   - `client/src/pages/Secrets.jsx` (new) — namespace filter (default `default`) + refresh → `GET /api/vault?namespace=`; secret-refs table (Namespace/Name); inline row expansion → `GET /api/vault/:ns/:name` with per-key masked values (`••••••`) + reveal toggle; confirm-then-Delete → `DELETE`; collapsible create/update panel (key=value textarea parsed to `{ data }`) → `POST /api/vault/:ns/:name`. Write controls hidden without `can('secrets','write')`.
   - `client/src/App.jsx` — `/secrets` nav link gated on `can('secrets','read')`, between Impact and Admin.
   - `client/src/main.jsx` — guarded `/secrets` route (RequireAuth).
   - `client/src/auth.jsx` — `can()` now resolves logical resources whose mount differs from the logical name (`secrets` → `/api/vault`, since grants are stored as `/api/vault/*`), and mirrors the server's secondary logical-name/glob check (`r === resource`, `r === 'resource/*'`). Verified against `src/middleware/auth.js` matchResource semantics; existing checks (apps/releases/calendar/tracking/impact/admin) unaffected.
   - `docs/ROADMAP.md` — "Last updated" + new Next-up item 16.
3. Tested: `cd console/new-cicd-console && npm test` → **397/397 green, 35/35 suites, ~19s** · `cd client && npm run build` → clean (45 modules) · `grep -ri ascendmoney src/ client/src/` → 0 hits.

## Findings
- The client `can()` had a latent mismatch: it only matched `/api/<resource>*` path grants, but secrets grants are `/api/vault/*` (mount ≠ logical name). Without the fix, the Secrets nav/write controls would be invisible to any non-admin granted secrets permissions. The fix mirrors the server's dual path+logical check exactly.
- 501 `driver_not_implemented` from an unwired SecretsDriver renders as a muted note ("No secrets driver configured…"), matching the page's degrade-gracefully contract.
- Commit `bc895239` pushed to `docs/multi-session-tracking`. Baseline before the change was 397 green — no server, test, or package.json changes; test count unchanged (UI increment, verified by build).

## Decision
Adopt — §7 client surface is now complete: every core capability has a UI. Remaining work is production-readiness polish and any stretch adapters ROADMAP surfaces next.

## Files Changed
- `console/new-cicd-console/client/src/pages/Secrets.jsx` (new)
- `console/new-cicd-console/client/src/App.jsx`
- `console/new-cicd-console/client/src/main.jsx`
- `console/new-cicd-console/client/src/auth.jsx`
- `console/new-cicd-console/docs/ROADMAP.md`
