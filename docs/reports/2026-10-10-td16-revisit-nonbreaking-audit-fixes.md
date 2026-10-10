---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-10-10
status: published
human_review: autonomous
---

# TD-16 revisit: non-breaking audit fixes after lockfile drift

## Engineering Question
Backlog empty — does TD-16's "revisit on major-bump increments" trigger fire?
Yes: commit e0831f28 (node 16→22 base image + lockfile refresh, landed after
the 2026-10-04 baseline) drifted the audit from 15 to 20 findings.

## Method
1. Read ROADMAP.md "Next up" + "Known issues" — all 24 items done, TD-1..15
   closed, TD-16 open. Verified the drift: `npm audit` → 20 (4 critical),
   prod-only 14.
2. `npm audit fix` (non-breaking only): compression <1.8.2 (DoS via
   premature-response-close memory leak), proxy-addr (critical, IP spoofing
   via IPv4-mapped IPv6 trust subnet), source-map-js (event-loop DoS).
   → 17 findings (3 critical, 9 high, 3 moderate, 2 low; prod-only 12).
3. Tested: `npm test` → 406/406 passed, clean exit.

## Findings
Everything remaining is major/breaking-gated, unchanged from the baseline
assessment: `tar` critical (sqlite3→node-gyp build chain, not runtime),
`simple-git` 3→4, `aws-sdk` v2→v3 (drags `uuid`), `sequelize` 6→7,
nodemon-chain `braces`/`semver`, `node-gyp` 11. TD-16 stays open with the
updated numbers. No roadmap items added; loop returns to idle.

## Decision
Adopt.

## Files Changed
- `package-lock.json` (3 transitive bumps)
- `docs/ROADMAP.md` (TD-16 row: revisit note, 20→17 findings)
