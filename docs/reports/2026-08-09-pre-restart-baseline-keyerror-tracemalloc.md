---
task_id: executor-idle-scan
objective: OBJ-002
date: 2026-08-09
status: draft
human_review: autonomous
---

# Pre-Restart Baseline: KeyError Fix + Tracemalloc Activation Audit

## Engineering Question
Task `t_9ace58f6` (commit _snapshot_environ fix) dan `t_91442ec5` (enable HERMES_GATEWAY_TRACEMALLOC) keduanya marked done kemarin. Tapi apakah perubahan itu benar-benar operational — atau cuma code-complete?

## Method
Executor idle scan (board starved, hanya objectives ready). Selama scan, tertangkap KeyError real-time di gateway logs. Investigasi root cause: kapan gateway process start vs kapan fix di-commit.

## Findings

### KeyError Fix: Deployed tapi belum live
- **Gateway PID 1857 start time:** Aug 8 01:37:30 WIB (uptime 1d 01h 20m)
- **Fix commit `0c284ebf0`:** Aug 8 (same day, tapi setelah gateway start)
- **Fix di disk:** ✅ 3 occurrences `_snapshot_environ` di `tools/environments/local.py`
- **Fix di running process:** ❌ PID 1857 loaded code sebelum commit
- **Proof — KeyError masih terjadi:** 1 occurrence di 02:51:17 WIB hari ini (dari tool call executor sendiri melewati gateway)
- **Root cause:** Weekly restart timer (`hermes-weekly-restart.timer`) fires Sun 03:00 WIB. Gateway belum restart sejak fix.

### Tracemalloc: Env var set tapi belum loaded
- **`.env` has:** `HERMES_GATEWAY_TRACEMALLOC=1` ✅
- **Gateway loaded it?** ❌ PID 1857 start sebelum env var ditambahkan
- **Tracemalloc log entries (24h):** 0 — monitor belum pernah run

### Pre-Restart Baseline Measurements
| Metric | Pre-Restart Value |
|--------|-------------------|
| Gateway RSS | 760 MB (1d 01h uptime) |
| KeyError occurrences (24h) | 1 |
| Tracemalloc log entries (24h) | 0 |
| Fix commit on disk | ✅ 0c284ebf0 |
| Fix in running process | ❌ old code |
| Env var in .env | ✅ TRACEMALLOC=1 |
| Env var in process | ❌ not loaded |

### Imminent Activation
Weekly restart timer: **Sun 2026-08-09 03:00:00 WIB** (~2 min from scan). Setelah restart:
1. `_snapshot_environ()` fix live → KeyError race condition eliminated
2. `HERMES_GATEWAY_TRACEMALLOC=1` loaded → leak monitor aktif

## Decision
Needs follow-up verification. kedua perubahan akan go-live pada restart yang sama (~2 min). Follow-up task dibuat untuk post-restart verification di cycle berikutnya.

Ini confirm lesson dari `t_91442ec5`: **deploy != activate**. Code commit dan env var edit tidak mengubah apa-apa sampai process reload. Closure criteria perlu "verified in running process" bukan hanya "committed to disk".

## Risk
- Jika restart timer gagal fire → kedua fix tetap tidak live. Verification task akan catch ini.
- Tracemalloc overhead ~5-15 MB negligible pada 760 MB RSS.
- KeyError race window sangat narrow (microseconds), tapi tetap bisa trigger under concurrent cron load.

## Lessons Learned
1. **"Eliminated" claims perlu verified post-restart** — bukan post-commit. Task `t_89876697` dan `t_9ace58f6` mengklaim KeyError eliminated, tapi process masih running old code.
2. **Idle executor cycles punya value** — board starved doesn't mean no work. Signal hunting di logs caught regression yang scheduled tasks missed.
3. **Weekly restart timer adalah single activation point** untuk multiple pending changes — ini feature, bukan bug, tapi perlu documented.

## Next Priority
- Post-restart verification (task dibuat): confirm KeyError=0, tracemalloc logs appear
- Setelah 24h tracemalloc data: analyze allocator patterns vs RSS growth
- Planner cycle berikutnya perlu create actionable tasks — board saat ini hanya punya objectives
