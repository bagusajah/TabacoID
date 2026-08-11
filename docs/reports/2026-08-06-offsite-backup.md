---
human_review: autonomous
---

# Daily Report 2026-08-06 — Offsite Backup Setup

## Engineering Question
Bagaimana menambahkan offsite backup untuk Hermes agar data kritikal (WhatsApp session, config, API keys) aman jika Pi hilang secara permanen?

## Method
1. Audit backup landscape saat ini (script, cron, history)
2. Evaluasi opsi cloud storage (free tier, S3-compatible, rclone support)
3. Buat offsite backup script yang siap pakai
4. Test idle path (no remote configured)
5. Daftarkan ke cron agar otomatis berjalan setelah remote ditambahkan

## Findings

### Backup Landscape Saat Ini
| Komponen | Status |
|----------|--------|
| Local tar backup | ✅ Daily 03:00, keep 7 hari, ~19MB/backup |
| Backup healthcheck | ✅ Daily 04:00, alert via WhatsApp |
| Offsite/Cloud | ❌ Tidak ada — semua backup hanya di Pi |
| rclone | ✅ Terinstall, belum ada remote |

### Risiko Tanpa Offsite
Jika Pi hilang (hardware failure, theft, disaster), semua backup lokal juga hilang. WhatsApp session harus scan QR ulang, semua API keys harus di-regenerate. Recovery time: berjam-jam.

### Cloud Storage Options
| Provider | Free Tier | Egress | S3-compatible | rclone support |
|----------|-----------|--------|---------------|----------------|
| **Cloudflare R2** | 10GB | Free | Yes | Yes |
| Backblaze B2 | 10GB | Paid | Yes | Yes |
| AWS S3 | 5GB (first year) | Paid | Native | Yes |

**Rekomendasi: Cloudflare R2** — sudah pakai CF untuk tabaco.id DNS/proxy, 10GB free cukup untuk 30 hari backup (19MB × 30 = ~570MB), egress gratis.

### Encryption Note
Backup berisi API keys di `.env` dan WhatsApp session keys. rclone crypt bisa ditambahkan nanti jika diperlukan. Untuk sekarang: private bucket + restrict access.

## Measurements
- `local_backup_size`: 19MB per backup (1355 files)
- `monthly_estimate`: ~570MB (well within 10GB free tier)
- `rclone_installed`: yes
- `rclone_remotes_configured`: 0
- `script_exit_no_remote`: 0 (graceful skip)
- `cron_registered`: yes (04:30 daily)

### Changes Made
1. **`/home/orangepi/backups/offsite-backup.sh`** — script baru, upload latest backup ke rclone remote. Skip gracefully jika belum ada remote. Dedup by filename (tidak re-upload yang sudah ada).
2. **crontab** — tambah `30 4 * * * offsite-backup.sh` (30 menit setelah healthcheck)

## Decision
**Needs Human Review** — Script siap dan cron terdaftar. Tapi butuh human action untuk:
1. Buat R2 bucket di Cloudflare dashboard
2. Generate API credentials (R2 Access Key ID + Secret)
3. Jalankan `rclone config` di Pi:
   ```
   rclone config
   # Type: s3
   # Provider: Cloudflare
   # Access Key ID + Secret: dari CF dashboard
   # Endpoint: https://<account_id>.r2.cloudflarestorage.com
   ```
4. Test: `/home/orangepi/backups/offsite-backup.sh`

Setelah remote configured, script akan otomatis berjalan di cron berikutnya tanpa perubahan apapun.

## Risk
- Backup berisi API keys → harus private bucket. Jangan public.
- rclone tanpa crypt = data at rest tidak terenkripsi di cloud. Acceptable untuk private bucket, tambah crypt jika compliance butuh.
- Cron job berjalan setiap hari bahkan tanpa remote (skip + log). Tidak berbahaya tapi log akan bertambah 1 baris/hari.

## Lessons Learned
- Backup local saja tidak cukup — offsite adalah prasyarat disaster recovery.
- Script yang handle "not configured" state secara graceful = bisa deploy sebelum infra siap. Zero risk, zero noise.
- Cloudflare R2 gratis 10GB + no egress = pilihan paling hemat untuk backup kecil seperti ini.

## Next Priority
- Human: setup R2 bucket + rclone config (langkah di atas)
- Setelah remote siap: verifikasi offsite-backup.sh berhasil upload
- Pertimbangkan rclone crypt untuk encrypt-at-rest jika diperlukan nanti
