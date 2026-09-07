---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-06
status: published
human_review: autonomous
---

# TD-3: Legacy role-ENUM permission fallback removed

## Engineering Question
ROADMAP "Next up" is fully complete (Phases 1–3 done, §4.8 plugin list complete).
Next actionable tech-debt item: TD-3 — `User.role` ENUM fallback in
`getEffectivePermissions` ("remove once roles are seeded via admin API").

## Method
1. Read ROADMAP.md → all Next-up items ✅; remaining open debt: TD-2 (blocked on a real IdP), TD-3, TD-5, TD-15. Picked TD-3 (self-contained, testable).
2. Traced every `user.role` consumer: only `auth.service.js#_fallback` reads it for authorization; all test fixtures pair the ENUM with real Role rows, so nothing exercises the fallback. One real dependency found: the bootstrap admin (`src/models/index.js`) only got its admin Role if one already existed — fresh installs leaned on the fallback.
3. Implemented:
   - `src/models/index.js` — bootstrap admin now seeds the admin Role and the `*:*:*` permission itself via `findOrCreate` before `addRole`. Fresh installs never need the fallback.
   - `src/services/auth.service.js` — deleted the fallback block (13 lines); `getEffectivePermissions` is a pure Role→Permission union now.
   - `src/models/user.model.js` — comment updated: the `role` ENUM column is display metadata, never authorization. Column kept — dropping it needs a migration for a dead field.
   - `test/rbac.test.js` — regression test: a user with `role:'admin'` but no Role rows gets `[]`.
4. Tested: `npm test -- --forceExit` → 372 passed / 33 suites (371 + 1 new). Org-neutral grep → 0.

## Findings
- Role associations are now the single permission source; no hidden grant path.
- Fresh-install safety preserved: bootstrap self-seeds Role + permission.
- Existing installs with fallback-dependent users: assign real Roles via `POST /api/users/:id/roles` (seeded viewer/developer/approver/admin fixtures show the pattern); the ENUM column still displays but no longer grants.
- Net −2 lines; behavior change is intentional fail-closed.
- **Bonus (found by ad-hoc verification, fixed):** fresh-install boot was broken
  before this increment — baseline's create-only `sync()` creates the full
  current model schema, so unconditional post-baseline migrations threw
  duplicate-column/table and `connectDatabase`'s catch swallowed the failure,
  skipping remaining migrations AND the bootstrap admin. All four
  post-baseline migrations are now existence-guarded (idempotent). Verified
  with a fresh-boot script that runs the REAL `connectDatabase` path: 5/5
  migrations apply, bootstrap admin created, admin Role + `*:*:*` seeded,
  ENUM-only user → `[]`.

## Decision
Adopt — committed and pushed (0154799e code, b26826e3 roadmap, 163f79a5
fresh-install fix, 7c26917b roadmap note).

## Files Changed
- `src/services/auth.service.js` (fallback removed)
- `src/models/index.js` (bootstrap seeds admin Role + `*:*:*`)
- `src/models/user.model.js` (comment: ENUM is display-only)
- `test/rbac.test.js` (+1 regression test)
- `src/migrations/20260905*-20260906*.js` ×4 (existence guards — fresh-install fix)
- `docs/ROADMAP.md` (TD-3 closed, TD-8 follow-up noted, test count 372)
