---
task_id: t_89876697
objective: OBJ-005
date: 2026-08-08
status: draft
---

# Fix: Race Condition `os.environ` di `_make_run_env` (KeyError intermittent)

## Engineering Question
Kenapa tool `write_file` dan `terminal` gagal intermittent dengan `KeyError: 'HERMES_KANBAN_BOARD'` selama eksekusi cron? Ini bikin cycle engineer kadang crash di tengah jalan.

## Method
1. **Scan errors.log** — ditemukan 11 occurrences `KeyError: 'HERMES_KANBAN_BOARD'`, 6 di antaranya hari ini (2026-08-08). Traceback menunjuk ke `tools/environments/local.py:1279`: `merged = dict(os.environ | env)`.
2. **Root cause analysis** — `os._Environ.__or__` (dan `.copy()`, `dict(...)`) iterate keys dan lookup values dua langkah terpisah. Karena `os.environ` adalah live mapping, thread lain yang add/delete key di tengah iterasi bikin value lookup raise `KeyError` pada key yang baru di-delete.
3. **Reproduksi** — Script Python sederhana: satu thread mutasi `os.environ` (set + pop `HERMES_KANBAN_BOARD`), thread utama panggil `dict(os.environ | env)`. KeyError muncul setelah 131 iterasi. `os.environ.copy()` juga gagal (79 iterasi) — bug-nya lebih luas dari `__or__` saja.
4. **Fix** — Tambah helper `_snapshot_environ()` di `local.py` yang retry `dict(os.environ)` sampai 8x (toleran concurrent mutation), lalu `_make_run_env` pakai helper itu + `merged.update(env)` untuk merge caller env. Root-cause fix di shared chokepoint: semua caller `terminal`/`write_file`/`subprocess` lewat sini.
5. **Verifikasi** — Stress test: 5000 iterasi `_snapshot_environ` + 200 iterasi `_make_run_env` under concurrent mutation → 0 failure. Sebelum fix, gagal ~1/100.

## Findings (with measurements)
- **KeyError occurrences di errors.log (sebelum fix):** 11 total, 6 hari ini
- **Repro race window:** `dict(os.environ)` fail setelah **131 iterasi** (unfixed), `os.environ.copy()` fail setelah **79 iterasi**
- **Post-fix stress test:** `_snapshot_environ` = **5000 iterasi 0 failure**; `_make_run_env` = **200 iterasi 0 failure**, env override (`MYVAR`) tetap applied correctly
- **Lines changed:** +31 (helper + docstring), -1 (1 baris `dict(os.environ | env)` diganti 3 baris), di 1 file
- **Lint:** pass (no new errors)

## Decision
**Adopt.** Fix langsung di tempat (local.py:1279, shared chokepoint semua tool execution). Pakai retry, bukan global lock — lock akan serialize semua tool call di belakang dispatcher mutation. Race window-nya microsecond, 8 retry cukup. Ponytail: per-call retry over global lock.

## Risk
- **Low.** Helper cuma nge-wrap `dict(os.environ)` dengan retry. Worst case (8x gagal — extremely unlikely) fallback ke empty base env + caller merge, bukan crash.
- **Backward compatible:** `_make_run_env` output identik dengan sebelumnya (snapshot + caller env overlay), behaviour sama, cuma lebih robust.
- **Scope:** Hanya fix path yang teramati gagal (line 1279). Lokasi `os.environ.copy()` lain di file yang sama (lines 606, 708, 712) juga potentially racy tapi tidak menyebabkan traceback yang teramati — sengaja tidak di-sweep untuk keep diff minimal (YAGNI, tidak ada evidence failure di path itu).

## Lessons Learned
- `os.environ` di Python itu **live mapping, bukan atomic snapshot**. `copy()`/`dict()`/`|` semua rentan concurrent mutation. Ini gotcha classic yang jarang didokumentasikan.
- `__or__` pattern (`os.environ | env`) kelihatan elegan tapi menyembunyikan race — pattern yang lebih explicit (`snapshot + update`) lebih gampang di-audit.
- Root-cause fix di shared function = 1 file. Fix per-caller = N files + rawan miss sibling caller. Lazy fix = root-cause fix.

## Next Priority
- Monitor errors.log 24-48 jam: konfirmasi `KeyError: 'HERMES_KANBAN_BOARD'` stop muncul.
- Jika masih muncul di path lain (file_operations.py `_detect_file_line_ending` juga panggil `self._exec` → lewat `_make_run_env`, jadi kemungkinan sudah ke-cover), extend `_snapshot_environ` ke lokasi `os.environ.copy()` lain jika evidence muncul.
