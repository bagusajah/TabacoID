---
human_review: autonomous
---

# Daily Report 2026-08-06 — Backup Restore Test

## Engineering Question
"Apakah backup harian Hermes bisa di-restore ke environment baru dengan data yang utuh?"

## Method
1. Ekstrak backup terbaru (`hermes-hermes-20260806_080132.tar.gz`, 14MB) ke `/tmp`
2. Verifikasi setiap critical file: config.yaml (YAML parse), .env (KEY=VALUE count), 3 SQLite DB (`PRAGMA integrity_check` + table count), WhatsApp session files
3. Bandingkan hash restored vs live untuk config.yaml dan .env
4. Hitung restore timing (cold extract)

## Findings

### Restore v1 (backup lama — 080132)
| Item | Status | Detail |
|------|--------|--------|
| config.yaml | ⚠️ Drift | Hash berbeda — config berubah sejak backup dibuat (penambahan security/fallback sections) |
| .env | ✅ Match | 21 env vars, hash identik |
| state.db | ✅ OK | `integrity_check: ok`, 50 tables |
| projects.db | ✅ OK | `integrity_check: ok`, 10 tables |
| kanban.db | ⚠️ STALE | 0 tasks — file ini adalah lokasi lama, kanban aktif sudah pindah ke `kanban/boards/tabacoid/kanban.db` |
| WhatsApp session | ✅ OK | 528 files, 0 zero-byte |
| Restore timing | 0.43s | 534 files |

### Gap Analysis — Items NOT in backup
| Missing Item | Size | Impact |
|-------------|------|--------|
| `kanban/boards/tabacoid/kanban.db` | 196KB | **HIGH** — 48 active tasks, tidak ter-backup sama sekali |
| `skills/` | 11MB | MEDIUM — custom Hermes skills, rebuildable tapi hassle |
| `memories/` | 12KB | LOW — Hermes memory files |

### Fix Applied
Backup script (`hermes-backup.sh`) ditambah 3 item baru:
- `/home/orangepi/.hermes/kanban/boards/tabacoid/kanban.db`
- `/home/orangepi/.hermes/skills/`
- `/home/orangepi/.hermes/memories/`

Cron job diubah dari inline `tar` → memanggil script (single source of truth).

### Restore v2 (backup baru — 220640)
| Metric | Value |
|--------|-------|
| Archive size | 19MB (+5MB dari skills/) |
| Files restored | 1162 |
| Kanban tasks | 48 (intact) |
| SQLite integrity | ok (all 4 DBs) |
| Restore timing | 0.42s |

## Decision
**Adopt** — backup script diperbarui, restore terverifikasi. Kanban boards sekarang ter-backup.

## Risk
- Backup masih lokal (single disk, NVMe). Kalau disk mati, semua hilang. Offsite backup (rclone/S3) masih di backlog (`t_DA0BBE96`, blocked).
- Cron backup script tidak punya error notification — kalau gagal, silent fail. Task `t_C641F4DA` (monitor backup success rate) menunggu di backlog.

## Lessons Learned
- Backup coverage audit harus rutin. Pas infra berubah (kanban migrate ke boards/), backup script tidak ikut update — classic drift problem.
- Cron inline command vs script: script lebih baik karena bisa di-review dan update tanpa edit crontab.

## Next Priority
- Implement offsite backup (rclone/S3) — task `t_DA0BBE96` blocked, perlu human unblock
- Tambah backup success notification — buatkan blocked task
