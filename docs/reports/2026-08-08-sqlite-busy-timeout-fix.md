---
task_id: t_9c563d9d
objective: OBJ-002
date: 2026-08-08
status: draft
human_review: autonomous
---

# Fix SQLite busy_timeout=0 menyebabkan "database is locked" pada cycle 1-menit

## Engineering Question
Engineering cycle cron berjalan setiap 1 menit. Saat eksekusi tumpang tindih (satu sedang menulis, yang berikutnya mulai), error `database is locked (5)` muncul. Apa root cause-nya dan bagaimana memperbaikinya?

## Method
1. Scan `~/.hermes/logs/errors.log` untuk pattern "database is locked"
2. Inspect SQLite PRAGMA settings (`busy_timeout`, `journal_mode`, `locking_mode`)
3. Identifikasi concurrency pattern: 1 cron job berjalan setiap 1m, planner 2×/day, reviewer 1×/day — semuanya akses DB yang sama
4. Cek `~/.sqliterc` (file yang dibaca sqlite3 CLI setiap invocation) — tidak ada
5. Root cause analysis: `busy_timeout=0` artinya SQLite tidak menunggu sama sekali saat lock conflict → langsung error

## Findings

**Before:**
| Setting | Value |
|---------|-------|
| `PRAGMA busy_timeout` | **0** (tidak menunggu) |
| `PRAGMA journal_mode` | wal (sudah benar) |
| `PRAGMA locking_mode` | normal |
| `~/.sqliterc` | tidak ada |
| "database is locked" di errors.log | 1 occurrence (dari cycle ini sendiri, 04:35:56) |

**Root cause:** sqlite3 CLI default `busy_timeout=0`. WAL mode mengizinkan concurrent readers + 1 writer, tapi ketika 2 writer bertabrakan, yang kedua langsung dapat `SQLITE_BUSY` error tanpa retry. Cycle 1-menit membuat collision window kecil tapi nyata — terbukti saat run ini sendiri kena di query pertama.

**Fix:** Buat `~/.sqliterc` dengan `.timeout 5000` — semua sqlite3 CLI call otomatis menunggu 5 detik sebelum melaporkan lock error.

**After:**
| Setting | Value |
|---------|-------|
| `PRAGMA busy_timeout` | **5000ms** (5 detik) |
| `~/.sqliterc` | `.timeout 5000` |
| Concurrent write test | **PASS** — writer2 menunggu lalu berhasil (bukan langsung error) |

**Concurrency test:** Dua writer simultan ke DB yang sama. Writer2 berhasil menunggu lock writer1 selesai, lalu commit sukses. Sebelum fix, ini akan langsung `database is locked`.

## Decision
**Adopt.** Fix sudah live. Satu file (`~/.sqliterc`), satu baris, zero new dependencies. Menyelesaikan root cause untuk semua sqlite3 CLI call di sistem, bukan hanya kanban DB.

## Risk
- **Low.** `.timeout 5000` hanya menambah wait window; tidak mengubah locking behavior.
- Worst case: cron cycle yang overlap akan masing-masing menunggu max 5 detik (normal cycle <10s, jadi wait <5s masih dalam window 1 menit).
- Tidak ada data migration, tidak ada schema change.

## Lessons Learned
1. SQLite WAL mode saja tidak cukup tanpa `busy_timeout` — WAL menyelesaikan reader/writer contention, tapi `busy_timeout` menyelesaikan writer/writer contention.
2. sqlite3 CLI tidak ada default `busy_timeout` (programmatic SQLite API default 0 juga). Konfigurasi level OS (`~/.sqliterc`) adalah tempat fix yang benar karena semua cron jobs pakai CLI.
3. Error ini silent failure untuk cycle: task claim/update bisa gagal tanpa operator sadar. Perlu monitoring.

## Next Priority
- Monitor `errors.log` selama 24 jam untuk verifikasi zero "database is locked" recurrence
- Pertimbangkan tambah `PRAGMA busy_timeout` di kode Hermes yang akses DB secara programmatic (bukan CLI), jika ada
