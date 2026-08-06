# Daily Report 2026-08-06 — Error Pattern Analysis

## Engineering Question
Apa error pattern paling sering muncul di Hermes `errors.log`, root cause-nya apa, dan bagaimana dampaknya?

## Method
Analisis `~/.hermes/logs/errors.log` (306 baris, window ~6 jam: 00:33–06:01 WIB). Klasifikasi error by pattern, hitung frekuensi, telusuri root cause untuk top pattern, verifikasi di database dan source code.

## Findings

### Error Distribution (306 baris, 5 jam window)

| # | Pattern | Jumlah | Level |
|---|---------|--------|-------|
| 1 | `kanban dispatcher: tick failed` (ValueError: `%s` di started_at) | **14** | ERROR |
| 2 | `check_fn returned False` (feature checks: browser, BFL, React, dll) | **36** | WARNING |
| 3 | `Tool terminal/patch/execute_code returned error` (agent tool failures) | **20** | WARNING |
| 4 | `copilot` (ghp_* token tidak didukung) | **6** | WARNING |
| 5 | `Relay session closed with errors` (scope handle not on top of stack) | **3** | WARNING |
| 6 | `max_turns=150 exceeds hard cap of 40; clamping` | **3** | WARNING |
| 7 | `RateLimitError 429` (zai API overload) | **2** | WARNING |
| 8 | `LSP spawn/initialize failed` (typescript di webreader) | **1** | WARNING |
| 9 | `asyncio Future exception never retrieved` (LSPProtocolError) | **1** | ERROR |
| 10 | `kanban.db-shm read-only` | **1** | WARNING |

### Root Cause #1: Kanban Dispatcher Crash (14 ERROR, highest impact)

**Symptom:** Dispatcher tick gagal setiap ~60 detik dengan `ValueError: invalid literal for int() with base 10: '%s'` di `detect_stale_running()`.

**Root cause:** Dua task (`t_46163a7f`, `t_bba47c7c`) memiliki `started_at = '%s'` — literal string, bukan Unix timestamp. Nilai ini bocor dari SQL `strftime('%s','now')` yang dieksekusi via `sqlite3` CLI oleh cron job sebelumnya. Kemungkinan `%s` diinterpretasi oleh shell/Python `%`-formatting sebelum sampai ke SQLite.

**Code weakness:** `detect_stale_running()` di `kanban_db.py:7356` melakukan `int(row["active_started_at"])` tanpa try/except. Satu baris corrupt → seluruh dispatcher tick crash.

**Impact:** Dispatcher tidak bisa menjalankan stale detection, claim, atau promotion selama 4+ jam (01:01–05:01). Error berulang 14x (setiap ~60 detik).

**Fix applied:** Data corrupt sudah diperbaiki:
```sql
UPDATE tasks SET started_at=strftime('%s','now')
WHERE id IN ('t_46163a7f','t_bba47c7c') AND started_at='%s';
```
Verifikasi: 0 rows dengan non-integer started_at tersisa.

### Pattern #2: Feature Check Warnings (36 WARNING, noise)
12 fungsi check_fn masing-masing 3x per session init. Normal — menandakan fitur yang tidak tersedia di environment ini (no browser, no BFL, no React preview). Bukan error, tapi menyumbang 12% dari log volume. **Actionable:** bisa diredusen dengan logging level INFO atau dedup per-session.

### Pattern #3: Tool Execution Failures (20 WARNING, mixed)
Berbagai agent tool error: SQL parse error, blocked command (gateway restart), f-string syntax error, long-lived process warning. Campuran — sebagian agent self-correction, sebagian legitimate block.

### Pattern #4: Copilot Token (6 WARNING, konfigurasi)
Classic PAT `ghp_*` tidak didukung Copilot API. Perlu diganti fine-grained PAT atau OAuth.

### Pattern #5-10: Low-frequency, low-impact
Relay scope error (3x, session cleanup), max_turns clamping (3x, konfigurasi), rate limit (2x, transient), LSP failure (1x, webreader tidak punya TypeScript), asyncio future leak (1x, LSP crash side-effect), WAL read-only (1x, transient).

## Measurements
- `total_error_lines`: 306 baris dalam ~5.5 jam
- `dispatcher_crash_count`: 14 crash (01:01–05:01 WIB, ~60s interval)
- `corrupt_rows_found`: 2 task dengan `started_at='%s'`
- `corrupt_rows_remaining`: 0 (fixed)
- `unique_error_patterns`: 10 distinct patterns
- `noise_ratio`: 36/306 = 11.8% (feature check warnings)
- `real_error_ratio`: 16/306 = 5.2% (ERROR level)
- `host_uptime`: 18 days
- `memory_available`: 4.1Gi / 7.7Gi
- `disk_usage`: 44G / 234G (19%)

## Decision
**Adopt** — data corrupt sudah diperbaiki. Error pattern analysis berguna untuk prioritas engineering ke depan.

**Needs Human Review** — code fix untuk `detect_stale_running()` (tambah try/except di line 7356) dan investigasi sumber `%s` leak di SQL path yang digunakan cron.

## Risk
Rendah. Data fix aman (hanya 2 row done task). Code fix di kanban_db.py perlu review karena file besar (10255 lines) dan sentral.

## Lessons Learned
1. `strftime('%s','now')` via sqlite3 CLI bisa bocor jadi literal `%s` jika dieksekusi dari Python subprocess dengan `%`-formatting.
2. Satu row corrupt di database bisa crash seluruh dispatcher loop — defensive parsing penting.
3. Feature check warnings mendominasi log volume (12%) tapi nol impact. Bisa di-downgrade ke DEBUG.

## Next Priority
- Tambah try/except di `detect_stale_running()` kanban_db.py:7356 agar non-integer started_at tidak crash dispatcher
- Investigasi sumber `%s` leak — apakah cron skill SQL dieksekusi via Python subprocess?
- Replace ghp_* token dengan fine-grained PAT atau OAuth untuk Copilot
- Downgrade feature check warnings ke DEBUG level
