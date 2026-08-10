---
task_id: t_a9f67fc9
objective: OBJ-002
date: 2026-08-09
status: draft
---

# Cleanup HestiaCP Orphaned Artifacts (Cron + Sudoers)

## Engineering Question
HestiaCP sudah di-uninstall tapi masih ada residual artifacts. Berapa banyak log noise yang dihasilkan, dan bisih dihilangkan sepenuhnya?

## Method
1. Scan `journalctl` 24 jam terakhir untuk error pattern `hestiaweb`
2. Trace root cause: cron entries, sudoers config, user account
3. Backup semua artifacts sebelum removal
4. Remove crontab + sudoers entry
5. Verify error rate drop ke 0

## Findings (with measurements)

**Root cause:** HestiaCP package fully removed, tapi 3 residual artifacts tertinggal:
- `/var/spool/cron/crontabs/hestiaweb` — 11 cron entries, termasuk `*/2 * * * *` yang trigger setiap 2 menit
- `/etc/sudoers.d/hestiaweb` — NOPASSWD grant ke `/usr/local/hestia/bin/*`
- User `hestiaweb` (uid 1001)

Setiap 2 menit, cron trigger → `sudo /usr/local/hestia/bin/v-update-sys-queue restart` → binary tidak ada → sudo auth fail → 3 log lines per failure.

**Before:**
- `hestiaweb_errors_24h: 607 entries` (before → after: 607 → 0)
- `hestiaweb_errors_1h: 272 entries`
- `sudo_auth_failures_since_removal: 0` (measured 2+ min post-fix, zero new entries)
- `journalctl_disk_usage: 81.0 MB`

**After removal (verified at 02:22, 2+ min post-fix):**
- 0 pam_unix auth failures sejak 02:20
- 0 CRON session entries untuk hestiaweb sejak 02:20
- Cron cycle 02:22 seharusnya trigger error → confirmed silent

**Kept:** User `hestiaweb` tidak di-remove karena masih own 2 backup files di `/backup/` (bagusmukmin + device-x, total 2.5MB, tanggal Jul 18). Removing user akan orphan files tersebut.

## Decision
**Adopt.** Fix berhasil, error rate 607/24h → 0. Backup disimpan di `.hermes/backups/hestia-cleanup-2026-08-09/` untuk rollback.

## Risk
- **Low.** HestiaCP sudah tidak terinstall, tidak ada service yang depend pada artifacts ini.
- User `hestiaweb` dipertahankan untuk file ownership integrity.
- Backup lengkap tersedia jika perlu restore.

## Lessons Learned
- Package removal tidak selalu bersih. HestiaCP tidak menghapus crontab/sudoers saat uninstall — ini known gap di HestiaCP cleanup.
- Log noise dari orphaned cron bisa signifikan: 600+ entries/24h memperbesar journald footprint dan menyembunyikan error yang relevan.
- Pattern ini layak jadi checklist item: setelah uninstall package dengan cron integration, always verify `/var/spool/cron/crontabs/` dan `/etc/sudoers.d/` untuk orphaned references.

## Next Priority
- Consider periodic audit: `crontab -l -u <user>` untuk semua users untuk detect orphaned cron entries.
- 2 backup files di `/backup/` owned by hestiaweb — evaluate apakah masih relevant atau bisa di-archive + user di-remove.
