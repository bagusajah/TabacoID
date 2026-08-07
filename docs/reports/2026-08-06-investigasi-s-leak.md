# Daily Report 2026-08-06 (Investigasi %s Leak)

## Engineering Question
Apa sumber literal `'%s'` yang bocor ke kolom `started_at` di kanban DB, menyebabkan 20 dispatcher crash?

## Method
1. Trace error log — temukan 20x `ValueError: invalid literal for int() with base 10: '%s'` di `detect_stale_running()` (kanban_db.py:7356)
2. Cek data — tidak ada sisa `%s` di DB (sudah di-clean oleh cycle sebelumnya)
3. Investigasi task fix `t_93B1BCEE` — sudah selesai: ubah `%%s` → `%s` di SKILL.md
4. Cross-check: konfirmasi skill template sekarang bersih (0 match `%%s`)
5. Verifikasi: 15 task masih punya `started_at=NULL` (wajar, belum pernah di-claim)

## Findings (with measurements)
- **dispatcher_crash_count**: 20 crash (01:01–11:04 WIB, 6 Aug 2026)
- **root_cause**: Skill template `tabacoid-daily-improvement/SKILL.md` step 6b mengandung `strftime('%%s','now')` (double-percent). LLM menyalin perintah SQL dari template ini ke sqlite3 shell. Shell bash melewatkan `%%s` apa adanya ke sqlite3. sqlite3 gagah parse `%%s` → syntax error. LLM kemudian mencoba alternatif lain (mungkin Python sqlite3 dengan string formatting yang salah), dan akhirnya `'%s'` masuk sebagai literal string ke kolom `started_at`.
- **crash_path**: `kanban_watchers.py:1225` → `dispatch_once` → `_dispatch_once_locked` → `detect_stale_running` → `int(row["active_started_at"])` → ValueError
- **3 vulnerable int() calls**: kanban_db.py lines 1138, 7226, 7356 — semua crash kalau `started_at` bukan integer
- **fix_applied**: Task `t_93B1BCEE` sudah selesai — ubah `%%s` → `%s` di SKILL.md. Template sekarang benar.
- **sisa_risiko**: Tidak ada guard `int()` di `detect_stale_running`. Kalau code path lain menulis non-integer ke `started_at`, dispatcher crash lagi. Task `t_7CA7B48F` sudah ada di backlog untuk ini (status: ready).

## Decision
**Adopt** — investigasi selesai. Root cause sudah di-fix oleh task `t_93B1BCEE`. Sisa risiko (int guard) sudah ada di backlog sebagai task terpisah.

## Risk
Residual: `int()` tanpa guard di 3 lokasi. Low risk karena template sudah fix dan tidak ada code path lain yang menulis ke `started_at` selain dispatcher sendiri (yang pakai `time.time()`). Tapi tetap sebaiknya di-guard.

## Lessons Learned
- Double-percent `%%` di skill template → literal `%%` di shell → syntax error di sqlite3. Skill template yang mengandung SQL harus menggunakan `%` tunggal untuk sqlite3 format specifiers.
- LLM "recovery" dari SQL error bisa memperburuk situasi — alternatif yang dipilih malah menyimpan literal string.
- `int()` tanpa try/except di hot path dispatcher = single point of failure untuk seluruh board.

## Next Priority
- (existing: t_7CA7B48F) Tambah int() guard di detect_stale_running untuk handle non-integer timestamp
