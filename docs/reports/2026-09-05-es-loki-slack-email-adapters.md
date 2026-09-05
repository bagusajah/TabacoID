---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-05
status: published
human_review: autonomous
---

# ES/Loki log sinks + Slack/Email notification sinks (ROADMAP item 10)

## Engineering Question
ROADMAP "Next up" item 10: "Elasticsearch / Loki / Slack / Email adapters —
richer log search + notification targets." The stdout log sink's `search()`
returns `[]` by design and the webhook notification sink was the only real
notification target; this item adds queryable log backends and richer notify
targets behind the existing `LogSink` / `NotificationSink` interfaces.

## Method
1. Read ROADMAP.md item 10 + ARCHITECTURE.md §4.6/§4.7 (adapter lists and
   LogEntry/Notification contracts).
2. Implemented (4 adapters, following the stdout/webhook driver patterns —
   `opts.injected` axios seam, config→env→opts resolution, never-throw writes):
   - `src/drivers/log-sink/elasticsearch.driver.js` — write() indexes one doc
     per entry into a daily `<prefix>-YYYY.MM.DD` index (fields flattened to
     top level so `app` is a term-filterable field); never throws. search()
     builds a bool filter (level/traceId/app/ts-range) over `<prefix>-*`,
     maps hits back to LogEntry shape. Optional `ApiKey` auth.
   - `src/drivers/log-sink/loki.driver.js` — write() pushes labels
     `{app, level}` + a JSON line (`msg`, fields, traceId) to
     `/loki/api/v1/push`; never throws. search() builds a LogQL stream
     selector over `query_range` and parses the JSON lines back to LogEntry.
     Arbitrary fields stay in the line, not the label set (cardinality-safe).
   - `src/drivers/notification/slack.driver.js` — Incoming-Webhook message
     with one attachment; kind→color (deployed→green, failed→red, else
     amber); payload entries become Slack fields. Never throws.
   - `src/drivers/notification/email.driver.js` — Mailgun-style HTTP gateway
     (`/messages`-compatible form-encoded from/to/subject/text, basic
     `api:<key>` auth, comma-separated recipients). Chosen over nodemailer to
     avoid a new dependency. Never throws; skips when unconfigured.
   - Registered all four in `src/drivers/index.js`
     (`DRIVER_LOG=elasticsearch|loki`, `DRIVER_NOTIFICATION=slack|email`);
     added config blocks in `src/config.js` (`ES_URL`/`ES_INDEX_PREFIX`/
     `ES_API_KEY`, `LOKI_URL`, `SLACK_WEBHOOK_URL`,
     `EMAIL_API_URL/EMAIL_API_KEY/EMAIL_FROM/EMAIL_TO`).
3. Tested: `npm test -- --forceExit` → **289/289 passed, 28 suites** (was
   271/27; +18 new tests in `test/adapter-sinks.test.js`). Org-neutral check
   still 0 hits. Committed and pushed to `docs/multi-session-tracking`.

## Findings
All four adapters work against injected fakes; write paths follow the
never-throw contract so a downed ES/Loki/Slack/mail gateway can't fail the
audited DB write (History afterSave hook) or a release flow. The History
audit stream becomes queryable by setting `DRIVER_LOG=elasticsearch` (or
`loki`) plus the backend URL. Dormant by default — stdout remains the log
default and webhook the notification default, so behavior is unchanged
unless explicitly selected.

Test-authoring note: two initial failures were self-inflicted (hand-computed
2026 epoch-ns constants were off by a year); driver code needed no changes.

What's left in "Next up": nothing numbered remains unstarted except future
Phase 3 plugins (`vault-replicator`, `release-train`, `jenkins-webhook`,
`batch-release`, `country-storage`) and open low-severity TD items (TD-1,
TD-2, TD-3, TD-4, TD-5, TD-12, TD-14, TD-15).

## Decision
Adopt.

## Files Changed
- console/new-cicd-console/src/drivers/log-sink/elasticsearch.driver.js (new)
- console/new-cicd-console/src/drivers/log-sink/loki.driver.js (new)
- console/new-cicd-console/src/drivers/notification/slack.driver.js (new)
- console/new-cicd-console/src/drivers/notification/email.driver.js (new)
- console/new-cicd-console/src/drivers/index.js (registry wiring)
- console/new-cicd-console/src/config.js (log/notification config blocks)
- console/new-cicd-console/test/adapter-sinks.test.js (new, 18 tests)
- console/new-cicd-console/docs/ROADMAP.md (item 10 ✅, 289 tests)
