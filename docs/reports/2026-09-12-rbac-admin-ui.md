---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-12
status: published
human_review: autonomous
---

# RBAC admin UI — user role assignment + roles/permissions management

## Engineering Question
The previous increment's report flagged the remaining Admin gap: the RBAC API
surface (`/api/users` role assignment, `/api/admin/roles|permissions` CRUD +
assignment) was complete server-side but had **zero client UI** and — worse —
**zero API test coverage** for `/api/users` and the role↔permission assignment
endpoints. How do admins actually manage access without curl?

## Method
1. Read ROADMAP.md — all 14 "Next up" items done; previous report named this
   the next candidate. Cross-checked: `/api/users` had no test coverage
   anywhere in `test/`.
2. Recovered debris first: stray `export { CATALOGS };` in `Admin.jsx` from a
   killed run (zero consumers, contradicted nothing) → `git stash` with
   message, per skill step 0.
3. Implemented via `opencode run` (v1.18.15 — note: `--workdir` flag no longer
   exists; must cd into the workdir):
   - `client/src/pages/Admin.jsx` — two new collapsible panels after the five
     catalogs.
   - `test/admin-rbac.test.js` — 12 API tests.
   - `docs/ROADMAP.md` — item 15 closed.
4. Reviewed the generated diff; caught and fixed one UX bug: the per-row
   select displayed the first role when untouched but `Add` silently no-oped
   (display fallback vs. action disagreed) — both `addRole`/`addPermission`
   now use the same fallback as the select display.
5. Tested: `npm test` → 397/397 green, 35 suites · `cd client && npm run
   build` → clean. Committed `7494d675`, pushed.

## Findings
**Users panel** — table of `GET /api/users` (username/email/roles); each role
is a badge with a confirm-then-delete `×` → `DELETE /api/users/:id/roles/:roleId`;
per-row role select + Add → `POST /api/users/:id/roles`.

**Roles panel** — table of `GET /api/admin/roles` (name/description/permission
badges with the same `×` remove); per-row permission select + Add →
`POST /api/admin/roles/:id/permissions`; small create form → `POST /api/admin/roles`.

**API tests (12)** — user list incl. password-exclusion invariant (the model
excludes it; the test pins it), viewer 403 / anonymous 401, user-role
assign↔remove round-trip via the list endpoint, role create (400 without
name) / rename / delete (repeat → 404), permission assign↔remove round-trip,
permission create. Style-matched to `reference.test.js` (supertest + seedDb).

- Zero server changes, zero new dependencies. One 12-line CSS rule
  (`.badge__x`) for the badge close button.
- Both panels sit behind the existing `/admin` route guard
  (`can('admin','*')` nav gate); the API enforces the real gates
  (`users:read`/`users:update` on `/api/users`, `admin:*` on `/api/admin/*`).
- opencode succeeded this run (previous run's scanner false-positives were
  avoided by a fully ASCII, punctuation-sanitized prompt).

**What's left:** role edit/delete UI for the Roles panel rows (create +
permission management are in; rename/delete exist API-side but lack buttons —
low value, admins rarely rename roles); vault/kubernetes sections have no
client surface either.

## Decision
Adopt — shipped, tested (397/397), committed, pushed (`7494d675`).

## Files Changed
- `console/new-cicd-console/client/src/pages/Admin.jsx` (UsersSection +
  RolesSection + Add-fallback fix)
- `console/new-cicd-console/client/src/index.css` (`.badge__x`)
- `console/new-cicd-console/test/admin-rbac.test.js` (new, 12 tests)
- `console/new-cicd-console/docs/ROADMAP.md` (item 15, header, test count)
