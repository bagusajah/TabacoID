---
task_id: t_fbb36674
objective: OBJ-005
date: 2026-08-08
status: draft
human_review: approved
---

# CICD: Wire Notification Driver into Release Lifecycle

## Engineering Question
Release lifecycle events (create, approve, deploy success, deploy/build failure) tidak emit ke notification driver. ROADMAP.md item #2 (service-wiring) menunggu implementasi. Bagaimana cara wire notification events dengan pattern yang konsisten dengan existing `_maybeAutoTag` hook?

## Method
Membaca `src/services/release.service.js` untuk memahami state machine dan existing side-effect pattern (`_maybeAutoTag`). Membaca `src/drivers/notification.driver.js` (interface) dan `src/drivers/notification/webhook.driver.js` (adapter). Membaca existing test suite `test/release.test.js` untuk memahami test seam pattern (`setDriver` injection).

Implementasi:
1. Helper baru `_notify(kind, release)` — mirror dari `_maybeAutoTag`: never-throws side-effect hook. Catch `NotImplementedError` → debug log (dormant), catch other → warn log, release outcome unchanged.
2. Wire di 5 lifecycle points: `createRelease` (created), `approve` (approved), `deploy` success (deployed), `deploy` catch (failed), `build` catch (failed).
3. Test suite baru: inject fake notification + deploy drivers via `setDriver`, verify event kinds dan payload.

Delegasi coding ke opencode (same GLM model, focused coding agent).

## Findings (with measurements)
- **Test suite**: 30 → 32 tests passing (release.test.js). +2 new tests untuk notification events.
- **Full suite regression check**: 212 → 214 passing, 5 failing (same pre-existing failures: drivers/vault-route/kubernetes — driver auto-detection on Pi host, unrelated).
- **Files changed**: 2 source files (`release.service.js` +26 lines, `release.test.js` +67 lines) + 1 doc (`ROADMAP.md` updated).
- **Pattern adherence**: `_notify` follows exact contract dari `_maybeAutoTag` — never throws, NotImplementedError-tolerant, dormant until `DRIVER_NOTIFICATION=webhook`.
- **Notification payload**: `{kind, payload: {releaseId, version, status, applicationId}}` — sesuai dengan `NotificationSink.send()` contract.

## Decision
**Adopt.** Implementasi clean, pattern konsisten dengan existing code, test coverage adequate. Notification driver sekarang aktif (dormant by default, aktif saat `DRIVER_NOTIFICATION=webhook` + `NOTIFICATION_WEBHOOK_URL` di-set). Replaces legacy per-brand notify matrix.

## Risk
- **Low**: Notification calls synchronous (await) seperti `_maybeAutoTag`. Untuk webhook dengan latency tinggi, bisa slow down release flow. Webhook driver sudah punya 10s timeout. Jika jadi masalah, bisa ganti ke fire-and-forget (no await) — tapi untuk konsistensi dengan auto-tag pattern, await dipertahankan.
- **Low**: Payload minimal (4 fields). Jika receiver butuh lebih banyak context (app name, env name), perlu enrich payload di kemudian hari.

## Lessons Learned
- `_maybeAutoTag` adalah template yang bagus untuk semua side-effect hooks di release lifecycle — never-throws contractnya clean dan predictable.
- `setDriver` test seam makes testing trivial — no mocking frameworks needed, plain object injection.

## Next Priority
ROADMAP item #3: Structured audit via log sink — route History/audit events through `drivers.log`. Pattern sama: side-effect hook di transition/deploy/build yang call `drivers.log.log()` setelah History row dibuat.
