# Laporan Harian 2026-08-06 — Dispatcher Crash Impact Audit

## Pertanyaan Engineering
Berapa lama kanban dispatcher benar-benar down, berapa tick yang hilang, dan apakah semua fix sudah memadai?

## Metode
1. Parse error log → extract semua `kanban dispatcher: tick failed` timestamps
2. Cross-reference dengan task claim timestamps di database
3. Verifikasi 3 lapis fix: data cleanup, code guard, skill template
4. Cek dispatcher health setelah fix (12+ jam zero errors)

## Temuan (dengan pengukuran)

**Impact corrected — report sebelumnya (`2026-08-06-shell-escape-rootcause.md`) undercount:**

| Metrik | Report lama | Aktual |
|--------|------------|--------|
| Crash window | 4 menit | **10 jam 3 menit** (01:01 → 11:04 WIB) |
| Tick failures | 5 | **20** |
| Dampak | "dispatcher gagal 5x" | **Auto-promotion & auto-dispatch mati 10 jam. Tasks hanya jalan via cron manual claim.** |

**Root cause:** sama — skill template `strftime('%%s','now')` menghasilkan literal `%s` di sqlite3 CLI. Cron sessions terus menulis `%s` ke `started_at`/`completed_at` setiap kali claim/complete task.

**Fix verification — 3 lapis fix sudah in place:**

| Fix | Status | Verifikasi |
|-----|--------|-----------|
| Data cleanup (27 corrupted timestamps + 4 orphaned runs) | ✅ Done | `typeof(started_at)='text'` → 0 rows |
| `_safe_int_ts()` guard di `detect_stale_running()` | ✅ Deployed | Line 7373, file modified 22:58 WIB |
| Skill template `%%s` → `%s` | ✅ Updated | 0 occurrences of `%%s` in SKILL.md |

**Dispatcher health post-fix:**
- `kanban dispatcher: tick failed` terakhir: 11:04:20 WIB
- Zero dispatcher errors dalam 12+ jam (11:04 → 23:45)
- `ERROR` log di jam 23:00: 0 entries

**Secondary signal — kanban.db-shm permission warning:**
```
kanban.db (kanban.db) is not writable: file kanban.db-shm is read-only
```
Ini muncul karena dashboard plugin mencoba open DB dalam WAL mode, tapi DB running di DELETE journal mode. Tidak ada file `-shm`/`-wal` di disk. Warning ini benign — tidak mengganggu operasi.

## Keputusan
**Adopt** — semua 3 fix sudah memadai. Dispatcher stabil. Tidak ada tindakan tambahan diperlukan untuk bug ini.

## Risiko
- Jika ada path lain yang menulis ke DB tanpa melalui sqlite3 CLI (misal Python code), `%%s` tidak akan jadi masalah — hanya shell escaping yang terpengaruh.
- Skill template sudah fix, tapi skill lain yang pakai `strftime` perlu di-check jika ada.

## Pelajaran
- Impact assessment pertama undercount karena hanya cek 2 snapshot log, bukan parse full timeline. Selalu grep range waktu penuh.
- Dispatcher crash tidak mencegah cron manual claim — hanya auto-promotion/auto-dispatch yang mati. Ini artinya cron jobs masih bisa berjalan, tapi task backlog yang mengandalkan auto-promotion stuck.
- 3 lapis fix (data + code + template) adalah pattern yang benar untuk defensive engineering.

## Next Priority
- Audit skill lain yang menggunakan `strftime` di SQL command
- Investigasi source `kanban.db-shm` permission warning — apakah perlu force DELETE journal mode di plugin init
