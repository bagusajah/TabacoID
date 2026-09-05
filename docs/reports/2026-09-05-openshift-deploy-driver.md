---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-05
status: published
human_review: autonomous
---

# OpenShift deploy driver (ROADMAP "Next up" #8)

## Engineering Question
ROADMAP stretch item 8: "OpenShift deploy driver — subclass adding
DeploymentConfig/Route/ImageStream" for OKD/OCP clusters.

## Method
1. Read ROADMAP.md item: OpenShift deploy driver (stretch, next uncompleted
   after service-wiring 1-4 + production-readiness 5-7 all done).
2. Recovered debris first: an uncommitted stale-run startup reconciliation
   (release.service `reconcileStaleRuns` + server boot hook + tests) from a
   previous killed run — verified coherent, suite green, committed as its own
   increment (862bc3e3) before starting new work.
3. Verified SDK facts before writing code: @kubernetes/client-node@0.22.3 has
   NO typed OpenShiftRoute class, but CustomObjectsApi exposes generic
   group/version/plural CRUD with `{response, body}` returns — Route
   (route.openshift.io), DeploymentConfig (apps.openshift.io), ImageStream
   (image.openshift.io) all fit it.
4. Implemented (via opencode): `src/drivers/deploy/openshift.driver.js` —
   `OpenShiftDeployDriver extends KubernetesDeployDriver`. Parent handles
   Deployment/Service/Ingress/ConfigMap/Secret unchanged; the override adds
   the three OpenShift kinds via `_applyCustomObject` (get→replace, 404→
   create, full-doc body; DC drives the revision like the parent's
   Deployment), plus `getRouteHost()` and `getStatusDC()` helpers. Registered
   in `src/drivers/index.js` as explicit `DRIVER_DEPLOY=openshift` — no
   `defaultFor` change, never auto-detected.
5. Tested: `npm test -- --forceExit` → **26 suites / 258 tests, all green**
   (14 new; independently re-run after opencode's self-report).

## Findings
- Vanilla-k8s deployments keep working through the parent class; an OCP shop
  can now deploy a mixed manifest (DC + Service + Route + ImageStream) with
  `DRIVER_DEPLOY=openshift`.
- Test-fake gotcha fixed in the new test: the `driverWithFake` pattern reset
  `calls[key]` on every `makeApiClient` call, but lazy API getters call it per
  access — the fake now accumulates records.
- Not done (deliberate, per YAGNI): no e2e against a real OCP cluster
  (fake-k8s pattern like every other driver); no auto-detection of OpenShift
  flavors. Add when a real OCP environment exists.
- ROADMAP.md updated: item 8 marked done, test count 258/26 suites (also
  corrected the stale "Last updated"/"Test status" header which still said
  226/21 from before items 4-7 landed).

## Decision
Adopt

## Files Changed
- console/new-cicd-console/src/drivers/deploy/openshift.driver.js (new)
- console/new-cicd-console/src/drivers/index.js (register `openshift` adapter)
- console/new-cicd-console/test/openshift-deploy.test.js (new, 14 tests)
- console/new-cicd-console/docs/ROADMAP.md (item 8 done, counts)
- (debris recovery, separate commit 862bc3e3) src/services/release.service.js,
  src/server.js, test/release-reconcile.test.js

Commits: 862bc3e3 (recovered increment), f642c5c2 (OpenShift driver) — both
pushed to origin/docs/multi-session-tracking.
