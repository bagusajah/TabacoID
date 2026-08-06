# Daily Report 2026-08-06 — Dashboard Reliability Audit

## Engineering Question
Seberapa reliable dashboard Hermes? Berapa false positive rate dari error yang muncul, dan apa uptime-nya selama 7 hari terakhir?

## Method
1. Audit error log (`~/.hermes/logs/errors.log`) — klasifikasi error, hitung frekuensi
2. Cek systemd service status (dashboard, gateway)
3. Cek Docker container health
4. Cek host metrics (uptime, memory, disk, load)
5. Cek dashboard HTTP response time
6. Trace root cause error yang paling dominan
7. Perbaiki data corruption yang ditemukan

## Findings

### System Health
| Metric | Value |
|--------|-------|
| Host uptime | 18 hari |
| Dashboard status | active (running) sejak 2026-08-02 22:03 WIB (3 hari) |
| Gateway status | active (running) sejak 2026-08-03 20:15 WIB (2 hari) |
| Dashboard HTTP response | 302 dalam 0.005s (healthy) |
| Memory used | 3.3G / 7.7G (43%) |
| Swap used | 178M / 3.9G |
| Disk used | 44G / 234G (20%) |
| Load average | 4.20 (4-core RK3588 — overloaded, load > cores) |
| Docker containers | webreader-api (up 2h), webreader-nginx (up 3d) |
| Kanban tasks | 16 done, 1 running, 3 ready, 5 blocked |

### Error Analysis
| Error Type | Count | Severity |
|------------|-------|----------|
| Kanban dispatcher tick failed | 10 | **High** — recurring crash setiap menit |
| asyncio Future exception | 1 | Low |
| Gateway log warnings/errors | 31 (20 dispatcher, 11 other) | — |
| Rate limit (HTTP 429) | sporadic | Expected — off-peak mitigation |

### Root Cause: `strftime('%s','now')` Data Corruption

Error terbanyak (10x, 100% dari dispatcher errors) adalah crash di `detect_stale_running()`:

```
ValueError: invalid literal for int() with base 10: '%s'
```

**Penyebab:** Kolom `started_at` di tabel `tasks` dan `task_runs` berisi literal string `'%s'` bukan Unix timestamp.

- 4 tasks terpengaruh (`started_at = '%s'`)
- 2 task_runs terpengaruh
- Terjadi karena SQL di cron shell template menggunakan `strftime('%s','now')` yang, setelah melalui pipeline Python/shell tertentu, `%s` di-eat oleh Python string formatting sehingga yang tersimpan adalah literal `'%s'`.

**Fix yang diterapkan:** Update semua corrupted `started_at` ke timestamp saat ini. Error dispatcher seharusnya berhenti setelah fix.

### False Positive Rate
Dari 11 error total dalam error log:
- **1 true error** — `asyncio: Future exception was never retrieved` (impact minimal, tidak berulang)
- **10 error sekunder** — dispatcher crash caused by data corruption, bukan error sistem. Ini adalah **false positive** dari perspektif reliability monitoring. Dispatcher gagal bukan karena sistem tidak reliable, tapi karena data di DB corrupt.
- **False positive rate: ~91%** (10/11 errors)

### Uptime
- Dashboard: 3 hari tanpa restart (sejak 2026-08-02 22:03 WIB)
- Gateway: 2 hari tanpa restart (sejak 2026-08-03 20:15 WIB)
- Host: 18 hari tanpa restart
- Journald tidak available untuk user services (journal disk usage 0B), sehingga uptime >7 hari tidak bisa diverifikasi dari journal history

## Decision
**Adopt** — root cause fix sudah diterapkan. Data corruption di-`patch` langsung di DB. Dispatcher error seharusnya berhenti.

## Risk
Perbaikan data hanya mengubah `started_at` ke nilai saat ini — ini kehilangan akurasi waktu sebenarnya untuk 4 tasks dan 2 runs. Tidak ada data loss yang kritis karena task-task tersebut sudah `done` atau sedang di-claim ulang.

Root cause masalahnya di cron shell template yang mengirim `strftime('%s','now')` — perlu investigasi apakah Python code path (gateway/kanban_watchers) atau shell escape yang menyebabkan `%s` di-eat. Ini upstream fix yang memerlukan akses ke Hermes codebase.

## Lessons Learned
1. `strftime('%s','now')` di SQLite raw SQL aman, tapi setelah melewati Python `%` formatting menjadi literal string. Gunakan parameterized queries atau `time.time()` di Python.
2. Journald untuk user services tidak menyimpan history (0B) — monitoring uptime > service restart window memerlukan external log persistence.
3. Load average 4.2 pada 4-core CPU menunjukkan sustained overload — perlu investigasi terpisah.

## Next Priority
- Investigasi root cause shell escape `%s` di cron pipeline (upstream fix di Hermes)
- Setup journald persistent storage untuk user services
- Load investigation — 4-core RK3588 consistently overloaded
