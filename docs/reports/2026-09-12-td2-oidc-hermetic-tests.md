---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-12
status: published
human_review: autonomous
---

# TD-2 closed — hermetic OIDC test coverage (no real IdP needed)

## Engineering Question
ROADMAP TD-2: "OIDC adapter wired but not e2e-tested (needs a real IdP). Unit-tested only."
Investigation showed the note was **stale in both directions** — grep of `test/` found
*zero* OIDC tests (not even unit tests). The OIDC callback is a security trust boundary
(state CSRF validation, user upsert from IdP claims, JWT minting) sitting completely
uncovered. Question: can it be tested without standing up a real Keycloak/Dex?

## Method
1. Read ROADMAP.md item: TD-2 (only remaining Medium-severity open item; every "Next up" item ✅).
2. Verified baseline: 372/372 green, clean tree (no debris from killed runs).
3. Implemented via opencode: `test/oidc.test.js` — one new test file, zero production changes.
   The key insight: routes (`identityMode()`) and `auth.service#handleOidcCallback` both read
   `drivers.identity` at call time, so the existing `setDriver('identity', fake)` test seam
   covers the entire flow with no IdP, no discovery, no network.
4. Tested: `npm test` → 385 passed / 385, 34 suites, exits clean (~18s, no flags per TD-5).

## Findings
**Route-flow tests (fake IdP via setDriver):**
- `GET /api/auth/oidc/start` → 302 to the IdP authorization URL + `cicd_oidc_state` cookie
- callback with missing/mismatched state cookie → 400, exchange never invoked
- callback with matching state → code exchange, User upsert (`preferred_username` → username,
  `<username>@oidc.local` email fallback, `'!'` password placeholder), `cicd_token` JWT
  cookie (httpOnly), CSRF cookie cleared, 302 → postLoginRedirect
- minted JWT round-trips: `GET /api/auth/me` returns the upserted user, password never leaks
- local `POST /api/auth/login` → 400 `identity_mode_mismatch` while OIDC is wired
- driver restored in `afterAll` (no cross-suite pollution)

**Adapter unit tests (`OidcIdentityProvider#getUser` via the `_clientPromise` lazy-client seam):**
- groups claim under `groups` / `cognito:groups` / `urn:amazon:cognito:groups`
- username fallback chain `preferred_username` → `email` → `sub`
- non-array groups claim coerced to `[value]`; absent → `[]`

What's left: a true e2e against a live Keycloak/Dex remains untested (hermetic fakes can't
catch discovery-metadata or client-registration mistakes) — but every seam we own is now
pinned. TD-4 (ESM migration, Low) is the only remaining open tech-debt item.

## Decision
Adopt — TD-2 closed. The "needs a real IdP" framing was wrong: the `setDriver` seam plus
the adapter's `_clientPromise` seam cover the full surface hermetically. 13 new tests,
385 total, all green, committed `e73412ce`, pushed to `docs/multi-session-tracking`.

## Files Changed
- `console/new-cicd-console/test/oidc.test.js` (new, 13 tests)
- `console/new-cicd-console/docs/ROADMAP.md` (TD-2 closed, test count 372→385, Auth+RBAC row 30→43)
