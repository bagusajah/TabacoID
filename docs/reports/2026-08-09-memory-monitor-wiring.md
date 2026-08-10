---
task_id: t_063dbcf3
objective: OBJ-002
date: 2026-08-09
status: draft
---

# Wire start_memory_monitoring() ke Gateway Startup

## Engineering Question
`gateway/memory_monitor.py` punya `start_memory_monitoring()` (5-min RSS logger) lengkap dengan unit tests, tapi nggak pernah dipanggil dari runtime gateway. Dead code. Gimana cara mengaktifkannya dan verifikasi bahwa log [MEMORY] benar-benar muncul?

## Method
1. Trace pemanggilan di `gateway/run.py` — cek apakah wiring sudah ada
2. Verifikasi status git: apakah perubahan sudah committed atau masih uncommitted
3. Validasi syntax (ast.parse) dan import module
4. Self-test module dengan interval pendek (1s) untuk konfirmasi baseline + periodic + shutdown log
5. Cek gateway yang sedang running: apakah module sudah loaded

## Findings (with measurements)

**Ditemukan:** Perubahan wiring sudah ada di working tree sebagai **uncommitted changes** dari executor cycle sebelumnya (zombie task `t_f417b8b0` yang crash saat patch tool timeout pada file 26K-baris). Perubahan sudah benar — tidak perlu tulis ulang.

**Perubahan yang ditemukan dan di-commit (commit `b10ba55fc`):**
- `start_memory_monitoring(interval_seconds=300)` setelah `self._running = True` (line ~11098)
- `stop_memory_monitoring(timeout=2.0)` di shutdown path (line ~12530)
- Bonus: tracemalloc snapshot watcher (gated by `HERMES_GATEWAY_TRACEMALLOC` env)
- Bonus: `gc.collect()` setelah session cleanup untuk reclaim arena memory

**Self-test result (interval=1s, 2.5s runtime):**
```
[MEMORY] baseline rss=29MB gc=(468, 4, 5) threads=1 uptime=0s
[MEMORY] Periodic memory monitoring started (interval: 1s)
[MEMORY] rss=29MB gc=(511, 4, 5) threads=2 uptime=1s
[MEMORY] rss=29MB gc=(512, 4, 5) threads=2 uptime=2s
[MEMORY] shutdown rss=29MB gc=(515, 4, 5) threads=2 uptime=2s
[MEMORY] Periodic memory monitoring stopped
```

**Gateway runtime status:**
- PID 657515, uptime 68624s (~19h), RSS 919MB
- Module belum loaded (gateway start 03:00 WIB, sebelum commit) → [MEMORY] count: 0
- Restart gateway diperlukan untuk aktivasi runtime

**Syntax check:** `ast.parse(run.py)` → OK
**Import check:** `from gateway.memory_monitor import start_memory_monitoring` → OK

## Decision
**Adopt** — Code committed. Gateway perlu restart untuk aktivasi runtime, tapi itu operasi destruktif (mengganggu cron aktif), jadi ditunda untuk window maintenance berikutnya.

## Risk
- Local patch di `gateway/run.py` (file upstream hermes-agent) — akan ter-overwrite saat hermes update. Perlu upstream atau re-apply setelah update.
- Gateway restart belum dilakukan → monitoring belum aktif di runtime production.

## Lessons Learned
- Zombie task `t_f417b8b0` (patch tool timeout pada file besar) sudah menulis perubahan yang benar tapi crash sebelum commit. Working tree punya 69 lines uncommitted. Lesson: executor cycle yang crash meninggalkan kerja setengah jadi di working tree — perlu check `git status` saat claim task.
- Memory monitoring di gateway yang sedang running 919MB RSS adalah baseline yang berguna untuk deteksi leak ke depan.

## Next Priority
- Restart gateway di window off-peak untuk aktivasi [MEMORY] logger runtime
- Setelah restart, verify [MEMORY] baseline muncul dalam 10s startup, lalu setiap 300s
- Consider setting `HERMES_GATEWAY_TRACEMALLOC=1` jika leak investigation mendesuk
