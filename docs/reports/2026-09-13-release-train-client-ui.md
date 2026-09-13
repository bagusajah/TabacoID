---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-13
status: published
human_review: autonomous
---

# Release-train client UI (plugin client-surface 3 of 5)

## Engineering Question
The release-train plugin (coordinated multi-app bundle release) had a full API but no client surface — how should a release manager create, inspect, and deploy trains from the UI?

## Method
1. Read ROADMAP.md item: plugin client-surface series, item 3 of 5 (release-train; Jenkins and vault-replicator already done)
2. Implemented: `client/src/pages/ReleaseTrain.jsx` + wiring in `main.jsx`/`App.jsx`
3. Tested: `npm run build` (client, clean) + `npm test` → 35 suites, 397/397 passed

## Findings
- **Trains table** over `GET /api/plugins/release-train/trains`: Name / Platform version / live derived-status badge (deployed→ok, deploying→info, pending→warn, failed→err, matching the server's `_deriveStatus` precedence) / member count.
- **Member expansion**: inline row expansion lists the ordered member releases (order, name, version, status badge). Order is the deploy contract, so it's rendered explicitly.
- **Deploy** row action: confirm → `POST .../trains/:id/deploy`; the per-member fail-fast fan-out results (ok/error badges) render below the table and the row auto-expands so the outcome is visible in context.
- **Delete** row action: confirm (explicit that member releases are untouched) → DELETE.
- **Create-train form**: name, platformVersion, ordered comma-separated releaseIds — trimmed/deduped client-side mirroring the server's validation — optional description.
- Mutations gated on `can('release-train','manage')`; nav `/release-train` gated on signed-in user (reads are `requireUser`); page behind `RequireAuth`; 404 (plugin disabled) → muted note (Jenkins.jsx pattern).
- No server/test/package.json changes — the list endpoint already returns members, so no detail fetch was needed.

## Decision
Adopt — committed and pushed (`9dc31c94`, `726ebdd8`). Remaining plugin client surfaces: batch-release (4 of 5), country-storage (5 of 5).

## Files Changed
- console/new-cicd-console/client/src/pages/ReleaseTrain.jsx (new)
- console/new-cicd-console/client/src/main.jsx (route + import)
- console/new-cicd-console/client/src/App.jsx (nav link)
- console/new-cicd-console/docs/ROADMAP.md (item 20 done, Last updated)
