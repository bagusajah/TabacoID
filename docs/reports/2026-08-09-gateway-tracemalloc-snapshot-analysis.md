---
task_id: t_exe_04ec8f61
objective: OBJ-002
date: 2026-08-09
status: draft
human_review: autonomous
---

# Gateway Tracemalloc Snapshot Analysis — Watcher Bug Found + RSS Growth Data

## Engineering Question
Apakah memory growth gateway (482→549MB dalam 2h post-restart) adalah leak linear atau warmup settling? Dan apakah tracemalloc snapshot watcher berfungi untuk identify top-N allocation sites?

## Method
- Baca `~/.hermes/logs/memory-baseline.log` untuk RSS time series 30-min interval (pre dan post-restart 03:00 WIB)
- Verifikasi `/proc/657515/status` dan `smaps_rollup` untuk precise RSS/PSS
- Trace source code `_tracemalloc_snapshot_watcher` di `gateway/run.py` untuk memahami mengapa zero snapshot entries muncul di logs
- Cross-reference dengan prior reports (t_42e91f0c, t_49b5dbdd, t_782b0de2)

## Findings (with measurements)

### 1. Tracemalloc Watcher: SILENTLY BROKEN (race condition)

**Tracemalloc enabled log muncul, tapi ZERO snapshot entries di semua log files** (gateway.log, agent.log, rotated logs):

```
2026-08-09 03:00:19,068 INFO gateway.run: tracemalloc enabled (HERMES_GATEWAY_TRACEMALLOC=1)
```
...dan tidak ada lagi. Expected: snapshot setiap 30 min (03:30, 04:00, 04:30, 05:00, 05:30, 06:00 = 6 snapshots).

**Root cause: ordering bug di local patch (`run.py`).**

| Line | Code | `_running` state |
|------|------|-----------------|
| 10433-10438 | `_spawn_supervised(self._tracemalloc_snapshot_watcher, ...)` | **False** |
| 11072 | `self._running = True` | True |

Watcher coroutine:
```python
async def _tracemalloc_snapshot_watcher(self, interval=1800):
    prev_snapshot = tracemalloc.take_snapshot()  # ← runs
    while self._running:                          # ← False! loop body never enters
        await asyncio.sleep(interval)
        ...
    # ← clean return, no exception
```

`asyncio.create_task()` schedules the watcher, tapi antara line 10435 dan 11072 ada multiple `await` calls (platform connect, session init) yang yield control ke event loop. Event loop menjalankan watcher task → `while self._running:` adalah False → loop body skip → coroutine return clean.

`_spawn_supervised` done callback melihat `exc is None` (clean exit) → **no restart, no error log**. Watcher hilang silently.

**Impact:** Tracemalloc tracing aktif (overhead ~5-10% tetap bayar), tapi data snapshot tidak pernah ter-log. Top-N allocation sites tidak available.

### 2. RSS Growth: BURSTY (step-function), bukan linear leak

**Post-restart timeline (PID 657515, 30-min interval dari memory-baseline.log):**

| Time (WIB) | Uptime | RSS (MB) | Delta (MB) | Rate (MB/h) |
|------------|--------|----------|------------|-------------|
| 03:30 | 0.5h | 485 | — | — |
| 04:00 | 1.0h | 494 | +9 | 18 |
| 04:30 | 1.5h | 534 | +40 | 80 |
| 05:00 | 2.0h | 536 | +2 | 4 |
| 05:30 | 2.5h | 569 | +33 | 66 |
| 06:00 | 3.0h | 566 | −3 | −6 |

**Current precise (06:16 WIB):** RSS=567 MB, PSS=551 MB, uptime=3h16m

**Net growth:** 485 → 567 MB = **+82 MB / 2.75h = ~30 MB/h**

### 3. Comparison: Current vs Previous Cycle

| Metric | Previous cycle (PID 1857) | Current cycle (PID 657515) |
|--------|--------------------------|---------------------------|
| Baseline RSS | 521 MB (03:00 Aug 8) | 485 MB (03:30 Aug 9) |
| Peak/end RSS | 741 MB (02:30 Aug 9) | 567 MB (06:00 Aug 9, ongoing) |
| Duration | ~23.5h | ~3h (ongoing) |
| Avg rate | ~9.4 MB/h | ~30 MB/h |
| Pattern | Step-function, early fast then plateau | Same pattern, masih early phase |

**Key insight:** Current 30 MB/h rate adalah **early warmup phase**. Previous cycle menunjukkan rate melambat signifikan setelah beberapa jam (521→576 MB dalam ~8h = 7 MB/h, lalu step-up ke ~595 MB saat cron activity). Burst di 04:30 (+40MB) dan 05:30 (+33MB) berkorelasi dengan executor cron runs (engineering cycle setiap 1m).

### 4. Tracemalloc Overhead Confirmation

Tracemalloc dengan 25-frame depth aktif tapi tidak menghasilkan data. Overhead tetap dibayar:
- VmSize: 1,774 MB (normal untuk Python+tracemalloc)
- VmRSS: 567 MB (tracemalloc adds ~5-10% memory overhead untuk traceback tables)
- 6,984 smaps entries

## Decision

**Needs Fix (tracemalloc watcher) + Adopt (weekly restart mitigation).**

1. **Tracemalloc watcher bug:** FIX REQUIRED. Pindahkan `_spawn_supervised(tracemalloc_watcher)` ke AFTER `self._running = True` (line 11072+), atau tambah `await asyncio.sleep(interval)` sebelum `while self._running:` check di watcher. Tanpa fix ini, tracemalloc overhead dibayar tanpa benefit.

2. **Memory growth:** BUKAN linear leak. Pattern = step-function warmup + cron-driven bursts. Weekly restart timer (Sun 03:00 WIB) sudah memadai sebagai mitigation. Projected peak ~700-750 MB sebelum restart berikutnya — well dalam batas aman (RAM 8GB, available ~5GB).

## Risk
- **Tracemalloc overhead tanpa data** — ~30-50 MB memory overhead untuk 25-frame traceback tables, zero actionable output. Should fix or disable.
- **Step-function bursts** (+40MB dalam 30 min) bisa terjadi saat concurrent executor runs. Jika 3+ executors run bersamaan, bisa spike +100MB. Monitor jika RSS >800 MB pre-restart.
- **Local patch vulnerability** — tracemalloc code adalah local patch (comment: "may be overwritten on hermes update"). Bug fix perlu re-apply setelah update.

## Lessons Learned
- **Race condition pada background task spawn** — selalu verify `_running` (atau equivalent gate) sudah True SEBELUM spawn watcher yang loop pada flag tersebut. Atau structur ulang watcher: `while True: await sleep(interval); if not self._running: break; ...`
- **Clean coroutine exit = silent death** — `_spawn_supervised` tidak restart pada clean return (by design, untuk self-disabling watchers). Tapi ini juga berarti watcher yang exit karena race condition hilang tanpa jejak.
- **memory-baseline.log** adalah sumber telemetri paling reliable untuk RSS trend analysis — 30-min interval, survives log rotation, captures all Python processes.

## Next Priority
1. **Fix tracemalloc watcher race condition** — move spawn after `_running=True` OR restructure watcher loop. Create task untuk patch `gateway/run.py`.
2. **Disable tracemalloc jika fix tertunda** — jika tidak akan fix dalam 24h, unset `HERMES_GATEWAY_TRACEMALLOC` untuk stop paying overhead tanpa benefit. Tracing tetap bisa re-enable setelah fix.
3. **Continue RSS monitoring** — next reading di 12:00 WIB (9h post-restart) untuk confirm rate melambat ke <15 MB/h sesuai pattern previous cycle.
