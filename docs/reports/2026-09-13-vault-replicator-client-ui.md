---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-13
status: published
human_review: autonomous
---

# Vault-replicator client UI (plugin client-surface 2 of 5)

## Engineering Question
The vault-replicator plugin has a full server surface (state read + add/remove/force-master
mutations) but no client page — DR state is invisible in the console UI.

## Method
1. Read ROADMAP.md item 19: vault-replicator client UI (next in "Next up" after items 1–18 closed)
2. Implemented: `client/src/pages/VaultReplicator.jsx` + nav/route wiring in `App.jsx` / `main.jsx`
3. Tested: `npm test` → 35/35 suites, 397/397 tests green; `npm run build` → clean Vite build

## Findings
Built per the established client patterns (Jenkins.jsx for plugin-404 handling, Secrets.jsx for
confirm-then-mutate):

- **DR-state table** over `GET /api/plugins/vault-replicator/state` — Cluster / Role / Status /
  Replication badge using the legacy readiness semantics and colors (ready→ok, running→info,
  unavailable→err) + Refresh.
- **Force master** row action (confirm → `POST .../replicators/:id/force-master`) renders the
  per-member fan-out results as ok/error badges — one member failing doesn't hide the others.
- **Remove** row action (confirm → `DELETE .../replicators/:id`).
- Collapsible **Add member** form (`POST .../replicators` `{clusterID}`).
- Mutations gated on `can('vault-replicator','manage')`; nav link gated on signed-in `user` only
  (reads are `requireUser`). No `auth.jsx` change needed — its `can()` already matches logical
  resource names, so admin `*:*` passes.
- Error tiers: 404 (plugin disabled) and 503 (`VAULT_REPLICATOR_URL` unset) → muted notes;
  502 (sidecar down) → hard error.

Remaining plugin client surfaces: release-train, batch-release, country-storage (3 of 5).

## Decision
Adopt — shipped, tested, pushed (commits `08926897`, `7ed0e8ad`).

## Files Changed
- console/new-cicd-console/client/src/pages/VaultReplicator.jsx (new)
- console/new-cicd-console/client/src/App.jsx (nav link)
- console/new-cicd-console/client/src/main.jsx (route)
- console/new-cicd-console/docs/ROADMAP.md (item 19 closed, Last updated)
