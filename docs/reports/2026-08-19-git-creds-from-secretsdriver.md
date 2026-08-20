---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-08-19
status: published
human_review: autonomous
---

# Git credentials from SecretsDriver (ROADMAP "Next up" item 4)

## Engineering Question
`SimpleGitDriver` sourced git creds from `config.bitbucket` env vars
(`BITBUCKET_USERNAME`/`BITBUCKET_PASSWORD`), contradicting the ARCHITECTURE.md
§4.4 contract ("credentials via the `GitCreds` arg, sourced from
`SecretsDriver`") and the §10 risk note (legacy read creds from a local file
each call). How do we move to secret-store creds without breaking existing
installs?

## Method
1. Read ROADMAP.md item: *"Git credentials from SecretsDriver — replace
   env-based `config.bitbucket` creds with a `drivers.secrets.read` lookup
   (the §4.4 documented contract)."*
2. Implemented via opencode (files changed):
   - `src/config.js` — new `git.credsSecret` from `GIT_CREDS_SECRET`
     (`'namespace/name'` ref; empty = unchanged behavior).
   - `src/drivers/git/simple.driver.js` — `async _resolveCreds(opts)` with
     3-tier priority: explicit `opts.creds` → `drivers.secrets.read`
     (registry lazy-required inside the method — no load-time require cycle)
     → `config.bitbucket` env fallback. Wired into `clone()`; all
     clone-backed ops (createBranch/createTag/fileExists/readFile) inherit it.
     Secret payload: `{username, password}` or `{username, token}`.
   - `.env.example` — documented `GIT_CREDS_SECRET=`.
   - `test/git-simple.test.js` — 3 new tests (fake secrets driver injected via
     the existing `setDriver` seam): secret creds used in the clone URL with
     the correct `{namespace, name}` ref; `opts.creds` wins; empty
     `credsSecret` falls back to constructor creds.
3. Tested: `npm test -- --forceExit` → **226/226 passed, 21 suites** (was 223).
   Org-neutral grep: 0 hits.

## Findings
Dormant-by-default wiring: behavior is byte-identical unless an operator sets
`GIT_CREDS_SECRET`, so no deploy flags, no migration, no caller changes (the
single caller — `_maybeAutoTag` in release.service — goes through `clone`
implicitly). Works with both secrets adapters (native k8s Secrets and Vault)
since both implement `read({namespace, name})`. Skipped: caching of the secret
read (one read per clone; clones are rare lifecycle ops — add a TTL cache if
clone frequency grows), and removing `config.bitbucket` entirely (still the
fallback path; retire once every install migrates to `GIT_CREDS_SECRET`).

## Decision
Adopt — pushed to `docs/multi-session-tracking`
(commits `43a5f759`, `8c21d917`).

## Files Changed
- console/new-cicd-console/src/config.js
- console/new-cicd-console/src/drivers/git/simple.driver.js
- console/new-cicd-console/.env.example
- console/new-cicd-console/test/git-simple.test.js
- console/new-cicd-console/docs/ROADMAP.md
