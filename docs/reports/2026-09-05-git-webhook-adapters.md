---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-05
status: published
human_review: autonomous
---

# Host-specific git webhook adapters (Bitbucket / GitHub / GitLab)

## Engineering Question
ROADMAP "Next up" item 9 (Stretch/Phase 3): host-specific git webhook adapters —
Bitbucket/GitHub/GitLab REST for `createWebhook`. The `SimpleGitDriver` covered
all protocol-level git ops but threw NotImplemented on `createWebhook` because
each provider has a different REST API.

## Method
1. Read ROADMAP.md item: "Host-specific git webhook adapters —
   Bitbucket/GitHub/GitLab REST for createWebhook".
2. Implemented via `opencode run`:
   - `src/drivers/git/webhook.driver.js` (new) — `WebhookGitDriver extends
     SimpleGitDriver` (protocol ops inherited unchanged; only `createWebhook`
     overridden). Provider-specific REST POSTs:
     - Bitbucket Server: `POST {api}/rest/api/1.0/projects/{owner}/repos/{repo}/webhooks`,
       events `repo:refs_changed` + `repo:push`, Basic auth,
       `X-Atlassian-Token: no-check` when secret set.
     - GitHub: `POST {api}/repos/{owner}/{repo}/hooks`, `web` hook with
       `{url, content_type: json}` config, secret as body field.
     - GitLab: `POST {api}/api/v4/projects/{owner}%2F{repo}/hooks`,
       `PRIVATE-TOKEN` header, secret as hook token.
     - Provider pinned via `BitbucketGitDriver`/`GitHubGitDriver`/
       `GitLabGitDriver` subclasses (registry names `bitbucket`/`github`/
       `gitlab`, replacing the three commented placeholders) or auto-detected
       from the repo-URL hostname. API base from `GIT_WEBHOOK_API_BASE`;
       creds from the same `opts.creds` → env chain as git ops; injected-axios
       test seam; 10s timeout; ≥400 → thrown error; success returns
       `{provider, url}`.
   - `src/drivers/index.js` — wired the three adapters into `REGISTRY.git`.
   - `test/git-webhook.test.js` (new) — 13 tests: per-provider
     method/URL/headers/body, secret-optional omissions, host auto-detection,
     and guards (no apiBase, no creds, unknown host, non-2xx → `HTTP <status>`).
3. Tested: `npm test -- --forceExit` → **271/271 passed, 27 suites**
   (258 baseline + 13 new). `grep -ri ascendmoney src/` → 0 hits.

## Findings
- One file covers all three hosts — they differ only in endpoint/payload/auth
  header, so three 3-line subclasses pin the provider over one shared
  implementation. Auto-detection from the URL hostname is a bonus default.
- Dormant by default: behavior is unchanged unless `DRIVER_GIT` is
  `bitbucket`/`github`/`gitlab` and `GIT_WEBHOOK_API_BASE` is set; `simple`
  remains the protocol-level default.
- Remaining stretch item: #10 (Elasticsearch/Loki/Slack/Email adapters).
- Note: `read_file` output masked the literal identifier `basic` as `***`
  during review — verified via `xxd` that the file content is correct
  (reader artifact only, not file corruption).

## Decision
Adopt — committed and pushed.

## Files Changed
- console/new-cicd-console/src/drivers/git/webhook.driver.js (new)
- console/new-cicd-console/src/drivers/index.js
- console/new-cicd-console/test/git-webhook.test.js (new)
- console/new-cicd-console/docs/ROADMAP.md (item 9 ✅, header, test count)

Commits: `cae0299e` (feature), `322ac556` (roadmap) → pushed to
`docs/multi-session-tracking`.
