# Laporan Harian 2026-08-06 — Defensive Guard: _safe_int_ts di detect_stale_running & enforce_max_runtime

## Pertanyaan Engineering
Bagaimana mencegah `ValueError: invalid literal for int()` di dispatcher kanban ketika ada timestamp terkorupsi (misalnya literal `%s`) di database?

## Metode
1. Identifikasi semua `int()` call langsung pada kolom timestamp DB di `detect_stale_running()` dan `enforce_max_runtime()`
2. Buat helper `_safe_int_ts()` yang return `None` untuk non-integer value
3. Replace semua `int(row["col"])` dengan `_safe_int_ts(row["col"])`, skip row jika result `None`
4. Jalankan existing test suite untuk verifikasi regresi

## Temuan (dengan pengukuran)

**Lokasi rawan crash (sebelum fix):**
- `detect_stale_running`: 2 titik — `int(row["active_started_at"])` dan `int(row["last_heartbeat_at"])`
- `enforce_max_runtime`: 5 titik — `int(row["active_started_at"])` dan 4x `int(row["max_runtime_seconds"])`

**Fix:** Helper `_safe_int_ts(val) -> int | None` yang handle `ValueError` dan `TypeError`, return `None` untuk bad values. Kedua function sekarang skip row dengan timestamp non-integer secara graceful.

**Pengukuran:**
- `test_kanban_db.py`: 30/30 passed (sebelum dan sesudah fix — no regression)
- `_safe_int_ts` unit check: 7/7 assertions passed (int, `%s`, None, string, float, empty)
- Lines changed: +24 (helper + 2 call sites refactored), -8 (removed raw `int()` calls)

## Keputusan
**Adopt** — guard sudah diterapkan. Satu baris corrupt tidak lagi crash seluruh dispatcher tick.

## Risiko
Tidak ada. Row dengan bad timestamp di-skip (sama seperti row dengan `NULL` timestamp yang sudah di-handle sebelumnya). Tidak ada data diubah.

## Pelajaran
- Defensive parsing di loop yang membaca DB row: selalu wrap `int()` conversion, karena satu corrupt row bisa crash seluruh batch
- `int()` helper lebih maintainable daripada try/except inline di setiap call site

## Next Priority
- Tidak ada follow-up langsung. Guard sudah cukup untuk problem class ini.
