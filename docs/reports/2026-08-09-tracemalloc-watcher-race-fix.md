---
task_id: t_ac75c250
objective: OBJ-002
date: 2026-08-09
status: draft
---

# Fix Tracemalloc Watcher Race: Spawns Before _running=True

## Engineering Question

Mengapa tracemalloc watcher tidak menghasilkan snapshot log meskipun tracemalloc enabled dan gateway sudah running 6+ jam?

## Method

1. Verifikasi gejala: grep `tracemalloc` di `gateway.log` dan `journalctl`
2. Baca source `gateway/run.py` untuk trace spawn-to-execution flow
3. Identifikasi root cause race condition
4. Verifikasi perbaikan yang sudah ada di working tree (applied by previous executor session)
5. Static syntax check dengan `py_compile`

## Findings (with measurements)

### 1. Bug dikonfirmasi — 0 snapshots dalam 6+ jam

| Metric | Value |
|--------|-------|
| Gateway uptime | 6h 41m (PID 657515, started 03:00:16 WIB) |
| Expected snapshots (30min interval) | ~12 |
| Actual snapshots | **0** |
| Log entries containing "tracemalloc" | **1** (hanya startup message) |

### 2. Root cause: spawn-before-ready race

Watcher spawned di `start()` line 10435, tetapi `self._running = True` tidak set sampai line 11072 — **637 lines dan 10 await yield points kemudian**.

Kode original (yang running di memory sekarang):
```python
async def _tracemalloc_snapshot_watcher(self, interval=1800):
    prev_snapshot = tracemalloc.take_snapshot()
    while self._running:   # ← FALSE pada saat spawn!
        await asyncio.sleep(interval)
        ...
```

Saat watcher pertama kali dieksekusi, `self._running` masih `False`. Loop body tidak pernah jalan. Task return cleanly. `_spawn_supervised`'s `_done` callback tidak restart pada clean exit (by design — anti busy-spin). **Watcher silently dies pada setiap startup.**

### 3. Semua watcher lain aman — punya pre-sleep

| Watcher | Pre-sleep | Safe? |
|---------|-----------|-------|
| kanban_watcher (line 7449) | `await asyncio.sleep(30)` | ✅ |
| queue_drain_watcher (line 11409) | `await asyncio.sleep(5)` | ✅ |
| platform_reconnect_watcher (line 11891) | `await asyncio.sleep(10)` | ✅ |
| **tracemalloc_snapshot_watcher (line 11842)** | **None** | ❌ |

Tracemalloc watcher adalah satu-satunya yang langsung cek `while self._running:` tanpa pre-sleep.

### 4. Fix sudah di working tree — verified correct

Previous executor session applied fix (uncommitted diff):

```python
# SEBELUM:
while self._running:        # False at spawn → loop body skip
    await asyncio.sleep(interval)

# SESUDAH:
while True:                 # Always enter loop
    await asyncio.sleep(interval)  # Sleep FIRST
    if not self._running:   # Exit check POST-sleep
        break
```

Logic check: sleep 30min pertama, by then `_running=True` guaranteed. Exit check post-sleep handles shutdown gracefully.

Also bonus fix: `gc.collect()` after agent session end (line 17662+) — reclaims arena memory setelah transient large objects dari API responses.

- `py_compile` check: **SYNTAX OK**
- Total diff: 88 lines, 2 file changes (imports + watcher method + gc.collect hook)

### 5. Re-verification 2026-08-09 12:36 WIB — fix masih belum live

| Metric | Value |
|--------|-------|
| Gateway uptime | 9h 39m (PID 657515, started 03:00:16 WIB) |
| Gateway RSS | 798 MB |
| Fix applied to source | 09:07:17 WIB (6h AFTER gateway start) |
| Expected snapshots (30min interval, 9.5h) | ~19 |
| Actual snapshots | **0** |
| `[MEMORY]` RSS log entries | **0** (module never wired into runtime) |
| Next weekly restart timer | Sun Aug 16 03:00 WIB (7 hari lagi) |

Fix confirmed correct di working tree (line 11854: `while True` + post-sleep break). `py_compile` passes. Tapi gateway yang running loaded old code. Weekly restart timer (`hermes-weekly-restart.timer`) baru akan fire Aug 16.

### 6. NEW finding: `start_memory_monitoring()` adalah dead code

Selama verifikasi, ditemukan bahwa `gateway/memory_monitor.py` (modul 5-min RSS logger yang emit `[MEMORY]` lines) **tidak pernah di-import atau dipanggil** dari `gateway/run.py`. Function `start_memory_monitoring()` hanya muncul di:
- `memory_monitor.py` (definisi)
- `tests/gateway/test_memory_monitor.py` (unit test)

Task `t_200D67E7` sebelumnya meng-claim "[MEMORY] logs now appear" tapi itu false positive — grep match berasal dari tool output yang di-echo balik ke log, bukan dari module yang benar-benar jalan. **Dua sistem monitoring memory (tracemalloc watcher + memory_monitor.py) sama-sama non-functional.**

## Decision

**Adopt (code fix) — BLOCKED (deployment).**

Code fix complete dan verified. `while True` + post-sleep break adalah ponytail solution terbaik: tidak menambah pre-sleep line, tidak mengubah loop semantics, hanya mengubah **kapan** exit check terjadi.

Fix belum live karena gateway restart diperlukan. Executor tidak bisa initiate restart dari dalam gateway process (security guard). Next natural restart: weekly timer Aug 16, atau manual `systemctl --user restart hermes-gateway` dari shell.

## Risk

- **Gateway restart diperlukan** — tidak bisa dilakukan dari dalam gateway (security guard blocks self-restart). Butuh `systemctl --user restart hermes-gateway` dari shell terpisah atau tunggu weekly timer Aug 16.
- Tracemalloc overhead ~5-10% — acceptable untuk monitoring phase, gated by env var.
- Watcher punya single exit point (post-sleep break) — jika `_running` kembali ke False di tengah sleep, watcher masih wait sampai interval selesai baru exit. Acceptable: 30 min max stale run.
- 7 hari tanpa tracemalloc data — leak monitoring butuh data. Manual restart recommended sebelum weekly timer.

## Lessons Learned

- **Silent failure is the killer.** `_spawn_supervised` by design tidak restart clean exits — ini benar (anti busy-spin), tapi berarti watcher yang exit-on-spawn **tidak terdeteksi**. Future watchers harus punya health signal (log "watcher started" di first loop iteration).
- **Race condition antara spawn dan `_running=True`** adalah bug klasik di async startup sequences. Semua watcher baru harus either: (a) punya pre-sleep, atau (b) gunakan `while True` + post-sleep break.
- **Dead code yang lolos review.** `start_memory_monitoring()` punya unit test yang pass tapi tidak pernah wired ke runtime. Test coverage ≠ production coverage. Lesson: integration test yang verify "module actually called during startup" lebih valuable dari unit test yang test function dalam isolasi.
- Previous executor (zombie, running 25 min) sudah applied fix correctly tapi crash sebelum complete task. Reap mechanism caught it.

## Next Priority

1. **Manual restart gateway** (`systemctl --user restart hermes-gateway`) untuk load fix — setelah restart, verify tracemalloc snapshot muncul dalam 31 menit
2. **Wire `start_memory_monitoring()` ke gateway startup** di `run.py` setelah `self._running = True` — ini follow-up task terpisah
3. Setelah snapshot confirmed, mulai memory trend tracking (RSS + tracemalloc allocator data per 24h)
4. Pertimbangkan health-signal pattern untuk semua `_spawn_supervised` watchers
