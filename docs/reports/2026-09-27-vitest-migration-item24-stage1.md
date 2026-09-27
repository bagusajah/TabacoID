---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-27
status: published
human_review: autonomous
---

# Test suite migrated Jest → Vitest 5 (item 24 stage 1 — K8s-client ESM unblock)

## Engineering Question

ROADMAP item 24 was "deliberately deferred" with a named trigger: pick it up
when 0.22 loses security support or a 2.x feature is needed. Before declaring
another no-op run, I audited the trigger: `npm audit` shows a **critical**
`request`/`form-data` chain reachable from `@kubernetes/client-node@0.22.3`
(range `<=1.0.0-rc7`, only fix is 2.0.0 — ESM-only). The trigger has fired,
so the deferral expired. Per item 24's own recipe — "Vitest first, then bump
the SDK" — this run did stage 1: migrate the test runner.

## Method

1. Read ROADMAP.md item 24 + TD-4; confirmed remote had no newer roadmap
   entries (`git fetch`, HEAD == origin).
2. Baseline: 36 suites / 406 tests green under Jest.
3. Implemented (via opencode, then independently re-verified):
   - `vitest.config.js` replaces `jest.config.js` — `environment: 'node'`,
     `setupFiles: ['./test/_setup.js']` (same pre-test-file env seam:
     sqlite + local identity before `src/models` loads),
     `include: ['./test/**/*.test.js']`, **`globals: true`** (the one
     non-mechanical choice: importing `describe`/`it`/`expect` per file
     would flip each `require()`-based CJS test file to ESM in vite-node).
   - `test/oidc.test.js`: 4× `jest.fn` → `vi.fn` (the only jest API in the
     suite; no `jest.mock`/spyOn/timers anywhere).
   - `package.json`: `"test": "vitest run"`, devDeps −jest +vitest@5.0.2;
     lockfile regenerated. **`dependencies{}` byte-identical** —
     `@kubernetes/client-node` stays 0.22.3, sqlite3 stays 5.1.7 (verified
     by diffing the lockfile root against HEAD).
   - Stale "jest" labels in current-state docs/comments (README,
     ARCHITECTURE.md, 2 code comments, .gitignore) — ADRs 0005/0006/0010 and
     TD-5's history left as period records.
4. Tested: `npm test` → **406/406, 36 files, exit 0, clean exit** (verified
   5× total: 4× in-session + 1× by me before committing). Setup ordering
   proven with a throwaway test asserting `DB_DIALECT=sqlite` at test-file
   scope before it was deleted. Org-neutral check still 0 hits.
5. Committed + pushed `docs/multi-session-tracking` (2 commits: code, docs).

## Findings

- The migration is a pure runner swap — zero ESM conversion, zero source
  restructuring. 220 jest/babel packages dropped from the lockfile, 56
  vitest-chain packages added. Suite exits cleanly on its own (TD-5's
  "exits clean" property survives the runner change).
- **Stage 2 is now unblocked and security-motivated**: the 0.22→2.0 SDK bump
  (the actual item-24 payload) is the natural next increment. Recipe recorded
  in ROADMAP: bump, exercise `require('@kubernetes/client-node')` under
  Vitest (the Jest registry blocker is gone; if 2.x's ESM entry still returns
  `{}` through CJS interop, fall back to a lazy dynamic `import()` in
  `k8s-client.js`), update the driver test fakes' name-keyed impl lookup for
  the 2.x generated-class rename, expect the critical
  `request`/`form-data`/`qs`/`tough-cookie` chain to leave the lockfile with
  0.22.
- Known ceiling (documented in ADR-0012): vitest 5 needs Node ≥22.12 to run
  *tests*; the Docker production image installs `--only=production` so deploys
  are unaffected, but the `node:16-alpine` builder stage and
  `engines.node: ">=16"` are now optimistic. Fix opportunistically when base
  images are next touched.
- `npm run lint` fails (no eslint config in repo) — pre-existing, untouched.

## Decision

Adopt. Stage 2 (SDK bump) queued as the next run's item.

## Files Changed

- `vitest.config.js` (new), `jest.config.js` (deleted)
- `package.json`, `package-lock.json`
- `test/oidc.test.js` (jest.fn → vi.fn), `test/_setup.js`, `test/_db.js` (comments)
- `src/server.js` (comment), `README.md`, `docs/ARCHITECTURE.md`, `.gitignore` (labels)
- `docs/ROADMAP.md` (item 24 stage-1 status, TD-4 reopened as Low→Medium, test status)
- `docs/decisions/0012-vitest-runner.md` (new ADR)
