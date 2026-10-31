---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-10-31
status: published
human_review: autonomous
---

# TD-16 10th revisit — eslint chain closed at 0 findings

## Engineering Question
ROADMAP backlog is empty; per-loop duty is re-checking "Next up" + "Known issues"
for new entries. None were added, but the standing TD-16 audit-drift check found
the 10-moderate eslint→minimatch chain (left blocked by the 9th revisit) had
become fixable: eslint latest jumped to 10.14.0.

## Method
1. Re-checked ROADMAP.md "Next up" (empty, all 24 items + TD-1..16 closed) and the
   TD-16 audit-drift note: `npm audit` → 10 moderate, the known eslint→minimatch
   chain (`minimatch <11.0.1`, globparts DoS; npm's only suggested fix = eslint 4 downgrade, rejected last run).
2. `npm view` showed eslint 10.14.0 (was blocked at 8/9-era) deps `minimatch ^10.2.6`
   — still inside the advisory range, so the major bump alone wasn't enough. Added
   tree-wide `overrides.minimatch: "^11.0.3"` (11 is ESM-only; repo runs Node 26 and
   `@eslint/config-array` only calls the `minimatch()` function — API-compatible).
3. eslint 10 dropped eslintrc → added minimal `eslint.config.js` (flat config,
   eslint-config-prettier only; style is prettier's job). Bumped
   eslint-config-prettier 8→10 (peer `eslint >=7`).
4. Removed 18 now-dead `eslint-disable` directives (rules dropped in eslint 9/10:
   `global-require`, `no-await-in-loop`, `class-methods-use-this`, env-scoped
   `no-unused-vars`) across 13 files — pure deletions, zero logic touched.
5. Tested: `npm run lint` → 0 errors, 0 warnings; `npm test` → **36 files / 407
   tests green**, clean exit; `npm audit` → **0 vulnerabilities**.

## Findings
- `npm audit` 10 → 0 findings; the last open advisory chain in the tree is gone.
- eslint 8.57.1 → 10.14.0, eslint-config-prettier 8.10.2 → 10.1.8, minimatch 3.1.5 → 11.0.3 (override).
- Cosmetic known ceiling: `eslint.config.js` is ESM syntax in a CJS package, so lint
  prints a node MODULE_TYPELESS warning — exit 0, no functional impact.
- Suite 407/407 green after all changes (run twice during the increment).

## Decision
Adopt — committed `22234073`, pushed to `docs/multi-session-tracking`.

## Files Changed
- `package.json` (eslint ^10.14.0, eslint-config-prettier ^10.1.8, overrides.minimatch ^11.0.3)
- `package-lock.json`
- `eslint.config.js` (new, flat config)
- 13 files: dead eslint-disable directive removal (plugins ×3, src ×9, test ×1)
- `docs/ROADMAP.md` (TD-16 10th revisit entry, Last-updated header)
