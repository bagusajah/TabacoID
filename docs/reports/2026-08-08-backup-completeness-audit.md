---
task_id: t_BKPVERIFY01
objective: OBJ-002
experiment: null
date: 2026-08-08
status: draft
---

# Audit Kelengkapan Backup: Hermes, WhatsApp, Webreader, Repo

## Engineering Question
Apakah setiap data kritis yang akan hilang saat Pi failure sudah punya backup? Apakah backup-nya segar, terverifikasi, dan bisa di-restore?

## Method
Inventarisasi semua sistem kritis, cek keberadaan backup, verifikasi integritas archive (gzip -t + test extract), cek freshness, identifikasi gap coverage.

## Findings (dengan pengukuran)

### Sistem backup yang sudah ada
Tiga cron job sudah running (dibuat 2026-08-06):
- `hermes-backup.sh` — tar.gz harian jam 03:00, keep 7 hari
- `backup-healthcheck.sh` — verifikasi jam 04:00, alert via WhatsApp jika stale >36h
- `offsite-backup.sh` — rclone sync jam 04:30 (belum aktif, no remote configured)

### Backup lokal: BERFUNGSI
| Metric | Value |
|--------|-------|
| Latest backup | `hermes-hermes-20260807_030001.tar.gz` (26MB) |
| Age | 21 jam (fresh, <36h threshold) |
| Success rate | 1/1 (100%) |
| Integrity (gzip -t) | ✓ OK |
| Test restore | ✓ 1370 entries extracted successfully |
| WhatsApp sessions | 422 pre-key/session files ter-restore |
| Skills | 571 files ter-restore |
| Config files | config.yaml + .env ter-restore |

### Gap yang ditemukan dan diperbaiki
Backup script sebelumnya hanya cover 10 items. **6 item kritis tidak di-backup:**

| Item | Size | Risk |
|------|------|------|
| `auth.json` | 1.7KB | API keys untuk semua LLM providers — **CRITICAL** |
| `channel_directory.json` | 528B | Mapping channel WhatsApp → agent |
| `gateway_state.json` | 571B | State gateway runtime |
| `cron/` | 1.9MB | Semua definisi cron job (5 aktif jobs) |
| `plugins/` | 4.5MB | Plugin configs dan state |
| `secrets/` | 8KB | Encrypted secrets |
| `~/.config/systemd/user/` | — | 7 custom systemd units (gateway, dashboard, timers) |

**Aksi:** Semua 7 item ditambahkan ke `hermes-backup.sh` ITEMS array. Syntax diverifikasi (`bash -n`: OK). Backup berikutnya (03:00 besok) akan include semuanya.

### Gap yang belum terselesaikan

**1. Offsite backup: TIDAK AKTIF**
- `rclone listremotes` → kosong (0 remotes)
- Offsite script skip dengan log: "no rclone remotes configured"
- **Risk: HIGH** — jika Pi/NVMe gagal, semua backup hilang bersama host
- `restic` terinstall tapi belum ada repo

**2. Repo uncommitted changes**
| Repo | Unpushed | Uncommitted |
|------|----------|-------------|
| TabacoID | 0 | 7 files (reports dari cycle kemarin) |
| webreader | 0 | 4 files |
| cicd-release-console | 0 | 0 |

Uncommitted files = tidak ada di git remote. Bukan masalah backup (content ada di disk + akan masuk tar backup), tapi push ke remote = offsite git backup.

## Decision
**Adopt (partial):** Backup lokal sehat dan terverifikasi. Gap coverage diperbaiki (7 item kritis ditambahkan). Offsite backup tetap menjadi **outstanding risk** yang butuh konfigurasi rclone remote (butuh human decision: pilih cloud storage provider).

## Risk
- **Offsite backup belum ada (HIGH):** Single point of failure. Jika NVMe/SD card mati, semua data hilang. Mitigasi: konfigurasi rclone remote ke R2/B2/S3 (gratis tier tersedia).
- **Backup retention 7 hari:** Mungkin terlalu pendek untuk corruption yang tidak segera terdeteksi. Pertimbangkan restic untuk incremental + deduplication.

## Lessons Learned
- Sistem backup sudah cukup mature untuk ukuran homelab (3 script, healthcheck + alerting via WhatsApp).
- Test restore (tar extract) = verifikasi tercepat. gzip -t OK tidak menjamin struktur path benar — extract test memberi kepastian.
- Coverage gap: script dibuat di tahap awal (Aug 6), belum sempat di-review untuk completeness. Cron/, plugins/, auth.json adalah item yang naturally muncul setelah sistem berevolusi.

## Next Priority
1. **Konfigurasi rclone remote** untuk offsite backup (butuh human: pilih Cloudflare R2 / Backblaze B2 / Google Drive)
2. **Commit + push** uncommitted files di TabacoID (7 report files dari cycle kemarin)
3. Pertimbangkan restic untuk incremental backup dengan retention policy yang lebih panjang
