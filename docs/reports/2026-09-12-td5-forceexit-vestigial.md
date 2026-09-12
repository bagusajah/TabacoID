---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-12
status: published
human_review: autonomous
---

# TD-5 closed: `jest --forceExit` verified vestigial — suite exits clean with no flags

## Engineering Question
Is the `--forceExit` test-run hack (TD-5: "a background DB handle doesn't close cleanly") still needed, and should the proposed fix (sequelize `close()` in test teardown) be applied?

## Method
1. Read ROADMAP.md item: TD-5 (only remaining actionable debt — "Next up" is fully done; TD-2 needs a real IdP, TD-4 needs an ESM migration, TD-15 is a docs note that already exists in ADR-0007 context).
2. Reproduced: `npx jest` (no flags) ×3 → exit 0 every run, 33 suites / 372 tests green, ~20s each. `npx jest --detectOpenHandles` → **zero open handles reported**.
3. Root-caused the history: the Phase-0 hang was the `express-session` MemoryStore, deleted outright by TD-1 — `--forceExit` was never re-audited after that. The repo's own `npm test` script (`jest`, no flag) never had it; only the skill/cron prompt habit did.
4. Implemented: docs-only change — closed TD-5 in ROADMAP with the verification evidence, fixed the stale cross-reference in ADR-0005, removed `--forceExit` from the builder skill's step 6.
5. Tested: `npx jest` → 33/33 suites, 372/372 tests, exit 0 (three consecutive runs).

## Findings
- **The proposed fix was wrong and was rejected.** Jest `globalTeardown` runs in a separate module registry and cannot reach the worker's sequelize instance; and `test/_db.js` deliberately shares one sqlite `:memory:` connection across the whole worker (`schemaSynced` guard) — a per-suite `close()` would drop the schema and break every subsequent suite. The debt item's prescription predated TD-1 and would have introduced a real bug.
- **`--forceExit` was actively harmful going forward**: it force-kills the process and would mask any future genuine handle leak as a green run. Removing it from the skill means a hang is now a visible failure.
- Zero code changes needed; 372 tests stay green.

## Decision
Adopt — TD-5 closed by verification (not by the originally prescribed fix). Remaining open debt after this run: TD-2 (needs real IdP — not autonomously testable), TD-4 (blocked on ESM migration decision), TD-15 (documentation note; `calendar:force` scoping guidance already recorded in ROADMAP + ADR-0007).

## Files Changed
- `console/new-cicd-console/docs/ROADMAP.md` — TD-5 row closed with evidence; header "Last updated" bumped (commit `1695a3f9`, pushed to `docs/multi-session-tracking`)
- `console/new-cicd-console/docs/decisions/0005-require-main-guard-for-testability.md` — stale TD-5 cross-reference corrected
- `~/.hermes/skills/software-development/cicd-console-builder/SKILL.md` — step 6 no longer passes `--forceExit`
