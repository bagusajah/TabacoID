---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-05
status: published
human_review: autonomous
---

# TD-1 resolved by deletion: vestigial express-session middleware removed

## Engineering Question
ROADMAP "Next up": all service-wiring, production-readiness, and stretch items
were done. The only open Medium-severity entry in Known issues was **TD-1** —
"`express-session` MemoryStore in production (single-replica only). Needs
Redis-backed store."

## Method
1. Read ROADMAP.md + AGENTS.md; `git status --porcelain` clean (no debris).
2. Traced the actual auth flow before deciding a fix: `middleware/auth.js` is
   stateless JWT (login sets a signed `cicd_token` cookie, logout clears it,
   OIDC state rides its own short-lived cookie). A repo-wide grep found
   **zero** reads of `req.session` in src/, routes, or tests — the session
   middleware was dead weight.
3. Deleted instead of adding a Redis store: the suggested fix would have added
   a dependency + an operational service (Redis) to keep alive, all to back a
   store nothing reads. Root-cause fix is removal.
4. Tested: `npm test -- --forceExit` → **290/290 green, 28 suites** (289
   prior + 1 new regression guard).

## Findings
Removed:
- `src/server.js`: `app.use(session({...}))` + the `express-session` require.
- `package.json` / `package-lock.json`: `express-session` dependency dropped.
- `src/config.js`: `sessionSecret` key (its only consumer was the middleware).
- `docker-compose.yml`, `kubernetes-local.yaml`, `helm/values.yaml`,
  `helm/templates/secret.yaml`, `.env.example`: `SESSION_SECRET` /
  `sessionSecret` entries. (`values.yaml` comment updated; no `required`
  guard in the chart referenced it.)

Added:
- One test in `test/auth.test.js`: login response must never set a
  `connect.sid` cookie — if the session middleware ever comes back, this
  fails and points at TD-1.

Also corrected stale ROADMAP marks: "Next up" items 6 (TD-10) and 7 (TD-11)
were still un-struck there despite being marked ✅ Done in the Known-issues
table since 2026-08-29.

Net diff: **11 files, +41 / −92** — a deletion increment.

What's left (production-readiness): TD-2 (OIDC e2e vs a real IdP), TD-3
(role ENUM fallback), TD-4 (k8s client ESM), TD-5 (jest teardown close),
TD-12 (synthesized manifest minimal), TD-14 (per-app tracking stages),
TD-15 (calendar:force doc note). All Low except TD-2 (Medium).

## Decision
Adopt. Deletion over addition: the MemoryStore hazard is gone, one
dependency lighter, no Redis to operate. If a future feature ever needs
server-side sessions, add `connect-redis` at that point — not before.

## Files Changed
- console/new-cicd-console/src/server.js
- console/new-cicd-console/src/config.js
- console/new-cicd-console/package.json
- console/new-cicd-console/package-lock.json
- console/new-cicd-console/.env.example
- console/new-cicd-console/docker-compose.yml
- console/new-cicd-console/kubernetes-local.yaml
- console/new-cicd-console/helm/values.yaml
- console/new-cicd-console/helm/templates/secret.yaml
- console/new-cicd-console/test/auth.test.js
- console/new-cicd-console/docs/ROADMAP.md
