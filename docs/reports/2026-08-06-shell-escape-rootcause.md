# Laporan Harian 2026-08-06 — Root Cause `%s` Shell Escape di Cron Pipeline

## Pertanyaan Engineering
Apa yang menyebabkan gateway kanban dispatcher gagal setiap menit dengan `ValueError: invalid literal for int() with base 10: '%s'`?

## Metode
1. Baca error log → trace stack ke `kanban_db.py:7356` dalam `detect_stale_running()`
2. Query database cari baris dengan `started_at`, `completed_at`, atau `created_at` berisi literal `%s`
3. Verifikasi root cause dengan test langsung di sqlite3 CLI

## Temuan (dengan pengukuran)

**Root cause:** Skill template `tabacoid-daily-improvement` (STEP 4 dan STEP 6b) menggunakan `strftime('%%s','now')` di contoh SQL. Ketika LLM menyalin perintah ini ke terminal, sqlite3 CLI menerima `%%s` sebagai literal `%s` — bukan timestamp unix. sqlite3 CLI bukan shell printf; `%s` sudah benar tanpa double-escape.

```
$ echo "SELECT strftime('%%s','now');" | sqlite3 :memory:
%s                          # ← BUKAN timestamp!

$ echo "SELECT strftime('%s','now');" | sqlite3 :memory:
1785996236                  # ← benar
```

**Data terkorupsi:**
- 1 task dengan `started_at='%s'` dan `completed_at='%s'` (t_879DAAB6)
- 6 task dengan `completed_at='%s'`
- 27 task_events dengan `created_at='%s'`
- 4 orphaned task_runs masih status `running` padahal parent task sudah `done`

**Dampak:** Gateway kanban dispatcher gagal setiap tick (setiap ~60 detik) selama 4 menit pada 08:02 dan 11:01-11:04 WIB. Total: 5 tick failures.

**Perbaikan diterapkan:**
- Semua timestamp literal `%s` di-replace dengan nilai timestamp aktual
- Orphaned task_runs di-close dan current_run_id di-clear dari done tasks
- 0 baris `%s` tersisa setelah cleanup

## Keputusan
**Adopt** — data sudah diperbaiki. Template skill perlu update (lihat Next Priority).

## Risiko
Tidak ada risiko. Perbaikan hanya mengubah data yang sudah salah menjadi benar. Task status dan event history tetap utuh.

## Pelajaran
- `%%s` itu escaping untuk Python `%` formatting atau shell `printf`, BUKAN untuk sqlite3 CLI
- Ketika LLM copy-paste SQL dari prompt ke terminal, shell hanya melakukan satu level escaping
- Test sederhana `echo | sqlite3` cukup untuk verify sebelum deploy template

## Next Priority
- Update skill template `tabacoid-daily-improvement`: ganti `strftime('%%s','now')` → `strftime('%s','now')` di STEP 2, 4, dan 6b
- Update cron job prompt di `~/.hermes/cron/jobs.json` dengan perbaikan yang sama
- Tambahkan guard di `detect_stale_running()` dan `_enforce_max_runtime()` untuk handle non-integer timestamp gracefully (defensive coding, bukan fix utama)
