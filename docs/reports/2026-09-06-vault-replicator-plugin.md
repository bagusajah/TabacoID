---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-06
status: published
human_review: autonomous
---

# vault-replicator plugin (Phase 3, ADR-0011)

## Engineering Question
ROADMAP "Phase 3 remaining candidates" listed `vault-replicator` next (after
`jenkins-webhook` closed the previous run): port the legacy multi-cluster
Vault DR control (`console/cicd_modules/vault_replicator.js`, 422 lines +
`route_vault_replicator.js`, 112 lines) into the plugin boundary without
importing its coupling (org config require, `oc` exec, HTML-string views).

## Method
1. Read ROADMAP.md item: Phase 3 — `vault-replicator` plugin.
2. Read ADR-0011 (plugin contract: `module.exports = (context)`, PLUGINS env,
   self-gating `/api/plugins/*` namespace) and the legacy module + route.
3. Implemented (no opencode needed — direct implementation following the
   jenkins-webhook plugin template):
   - `plugins/vault-replicator/index.js` — stateless proxy over the per-cluster
     vault-replicator sidecar (`/v1/vaultreplicator/get|add|delete|forcemaster`).
     `GET /api/plugins/vault-replicator/state` (requireUser) maps the sidecar
     payload to `{clusterId, role, status, replicationState}` with the legacy
     readiness derivation (master+ready→ready, standby→running, else
     unavailable). `POST .../replicators` (add), `DELETE .../replicators/:id`
     (delete), `POST .../replicators/:id/force-master` (best-effort fan-out to
     every configured member, per-member `{member, ok, error?}`) gate on
     `requirePermission('vault-replicator', 'manage')` — admin's `*:*` passes,
     others need an explicit grant (no seed change needed). Unconfigured → 503,
     sidecar error → 502. Legacy's `oc get configmap
     vault-replicator-members` exec (AGENTS.md-retired pattern) is replaced by
     `VAULT_REPLICATOR_MEMBERS` (JSON `{clusterId: baseUrl}` env); legacy
     HTML-string rendering is dropped (the React client consumes JSON).
     Axios-like `requester` test seam in plugin config (driver-`injected`
     spirit). No DB model — legacy kept no table, so no model file/migration.
   - `src/config.js` — `plugins.vaultReplicator` block (`VAULT_REPLICATOR_URL`,
     `VAULT_REPLICATOR_MEMBERS` with tolerant JSON parse).
   - `test/vault-replicator.test.js` — 14 tests: state mapping incl. legacy
     standby semantics, 401/503/502 paths, add validation (400 blank), delete,
     viewer-403 on all mutations, fan-out fan/best-effort/503, `_deriveState`
     unit.
4. Tested: `npm test -- --forceExit` → 326 tests / 30 suites green (was 312/29).

## Findings
- Legacy semantics quirk preserved (and pinned by a test): standby →
  `running` regardless of status — the role check wins, so a *not ready*
  standby still reports running. Only master+ready is `ready`.
- No schema change: plugin is a pure proxy, so unlike jenkins-webhook there is
  no model/migration — loader test asserts `db.VaultReplicator` stays undefined.
- force-master fan-out is best-effort by design (legacy fired-and-forgot);
  the API now reports per-member outcomes instead of hiding them.
- Remaining Phase 3 candidates: `release-train`, `batch-release`,
  `country-storage`.

## Decision
Adopt

## Files Changed
- console/new-cicd-console/plugins/vault-replicator/index.js (new)
- console/new-cicd-console/test/vault-replicator.test.js (new)
- console/new-cicd-console/src/config.js (vaultReplicator config block)
- console/new-cicd-console/docs/ROADMAP.md (Phase 3 table + counts)

Commits: 701ff87f (plugin), 5897e0b9 (roadmap) — pushed to
docs/multi-session-tracking.
