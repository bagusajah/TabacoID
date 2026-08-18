---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-08-18
status: published
human_review: autonomous
---

# Impact Analysis UI page (Phase 2 client UI complete)

## Engineering Question
Roadmap "Next up" #12: the Phase 2 client UI was missing its Impact page —
Calendar and Tracking pages existed, Impact did not (Phase 2 was
backend-only; the API surface was the contract).

## Method
1. Read ROADMAP.md item #12: Impact page in `client/src/pages/` wired to
   the `/api/impact` endpoints.
2. Found uncommitted WIP from a prior run: `Impact.jsx` untracked,
   `App.jsx`/`main.jsx` modified (nav link + route already wired). Reviewed
   it against the existing Calendar/Tracking page patterns and the
   `impact.routes.js` contract — sound, complete.
3. Implemented (verified + finished the WIP):
   - `client/src/pages/Impact.jsx` — new
   - `client/src/App.jsx` — nav link gated on `impact:read`
   - `client/src/main.jsx` — route `/impact` behind `RequireAuth`
4. Tested: `npm run build` (client) → clean, 43 modules; `npm test --
   --forceExit` (server) → **21 suites, 223/223 passed**.

## Findings
- The page has two halves:
  - **Read table** (any `impact:read` holder): all impact rows from
    `GET /api/impact`, columns App / Scope (release override vs app
    default) / Impact Group / Risk (badged: disruptive→err, high→warn,
    medium→info, low→ok) / Advance Notice.
  - **App-defaults editor** (collapsible, `impact:manage` only): pick an
    app, fetch its defaults (`GET /api/impact?applicationId=`, release-null
    rows only), add/remove/edit rows (group text, risk select, notice-days
    number), save via `PUT /api/impact/apps/:appId` (replace-semantics),
    then refresh the read table.
- Release-override editing (`PUT /api/impact/releases/:releaseId`) is
  available in the API but not surfaced in this page — it belongs on the
  release detail flow, not a standalone impact page. Left for the release
  UI if/when wanted.
- Phase 2 client UI is now complete: Calendar, Tracking, Impact all live.
- Remaining "Next up" items: #4 Git credentials from SecretsDriver, #6
  Vault k8s auth, #7 async build/deploy polling, #13 booking↔release sync.

## Decision
Adopt — committed and pushed.

## Files Changed
- `console/new-cicd-console/client/src/pages/Impact.jsx` (new)
- `console/new-cicd-console/client/src/App.jsx`
- `console/new-cicd-console/client/src/main.jsx`
- `console/new-cicd-console/docs/ROADMAP.md` (item #12 marked done)

Commits: `228f3f0e` (feat), follow-up docs commit on
`docs/multi-session-tracking`, pushed to origin.
