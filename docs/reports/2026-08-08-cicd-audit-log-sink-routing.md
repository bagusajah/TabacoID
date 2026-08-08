---
task_id: t_3c8c040d
objective: OBJ-005
date: 2026-08-08
status: draft
---

# Audit History → Log Sink Routing: Verifikasi

## Engineering Question
Apakah setiap History/audit event sudah benar-benar melewati `drivers.log` sink (StdoutLogSink), sehingga track record deploy/rollback/promote masuk ke structured log stream?

## Method
Trace implementasi end-to-end dan jalankan test suite untuk verifikasi:

1. Baca `src/models/history.model.js` — konfirmasi hook `afterSave` ada dan route ke `drivers.log.write`
2. Baca `src/drivers/index.js` — konfirmasi `defaultFor('log')` resolve ke `'stdout'` (StdoutLogSink)
3. Baca `src/drivers/log-sink/stdout.driver.js` — konfirmasi `write()` route ke winston logger
4. Grep semua call site `History.create` — konfirmasi tidak ada raw SQL bypass
5. Jalankan `history-audit-hook.test.js` + `log-sink-stdout.test.js` isolated
6. Jalankan full suite (223 tests) untuk konfirmasi tidak ada regresi

## Findings

**Implementasi sudah lengkap** — dikerjakan di commit `c32aa0f0` (driver layer complete) dan diverifikasi di `7c371d6e` (Phase 2 complete).

| Check | Status |
|-------|--------|
| `afterSave` hook di history.model.js | ✅ Ada — lazy-require drivers, never-throws |
| Log driver default resolve | ✅ `defaultFor('log') → 'stdout'` di drivers/index.js |
| Level routing (error/info) | ✅ `status='failed'` → `error`, else `info` |
| All History writes via model | ✅ 5 call sites di release.service.js, no raw SQL bypass |
| Hook never-throws | ✅ Wrap di try/catch, sink down tidak fail DB write |
| Test suite history-audit-hook | ✅ 4/4 pass |
| Test suite log-sink-stdout | ✅ 4/4 pass |
| Full suite | ✅ 223/223 pass (21 suites) |

**Measurements:**
- `test_count: 223 tests pass (21 suites, 0 failures)`
- `history_hook_tests: 4/4 pass`
- `log_sink_tests: 4/4 pass`
- `history_create_callsites: 5 (all via model, no bypass)`

## Decision
**Adopt (sudah aktif).** Tidak ada code change diperlukan — task sudah terimplementasi dan diverifikasi. ROADMAP item #3 (service-wiring) sudah ditandai ✅ Done.

## Risk
**Low.** Implementasi sudah live di main branch. Risiko hanya jika ada code path baru yang menulis History via raw SQL atau bypass model — saat ini tidak ada.

Catatan: ROADMAP.md baris 9 menyebut "5 pre-existing failures in drivers/vault-route/kubernetes suites" — saat ini semua sudah pass (223/223). Mungkin sudah diperbaiki di commit antara, tapi ROADMAP belum di-update.

## Lessons Learned
Task ini sebenarnya sudah selesai sebelum di-claim. Planner harus cek `done` / ROADMAP status sebelum create task untuk avoid duplikasi. Audit hook pattern (lazy-require driver registry di model hook, never-throws) adalah pattern bagus untuk side-effect routing di Sequelize models.

## Next Priority
Update ROADMAP.md baris 9 untuk refleksi 223/223 pass (remove "5 pre-existing failures" note yang sudah tidak accurate).
