---
task_id: t_759c3598
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-19
status: published
human_review: autonomous
---

# Backup CICD console MySQL — dari 0 ke daily dump + restore terverifikasi

## Engineering Question
Audit backup menunjukkan `hermes-backup.sh` (daily 03:00) cuma meliputi config/sessions/kanban Hermes. Adakah stateful data lain yang lolos dari backup? Kalau ada, bagaimana menambahkan coverage dengan perubahan paling kecil?

## Method
1. Inventarisasi stateful data: docker volumes, mount container, isi `hermes-backup.sh`, crontab, state offsite (`offsite-backup.log`).
2. Verifikasi jalur dump: `mysqldump -uroot` via `docker exec`, hitung `CREATE TABLE`.
3. Implementasi: script `~/backups/cicddb-backup.sh` (dump → sanity ≥30 tabel → tar.gz → rotasi 7 hari → record ke `backup-state.json`), cron entry `0 3 * * *`.
4. Uji restore: container mysql:8.0 throwaway (`--rm`), masukin dump, hitung tabel.

## Findings (with measurements)
- **Coverage gap (before):** CICD console MySQL = satu-satunya stateful data di luar backup set. Volume `new-cicd-console_mysql_data` (213.9 MB, 60 tabel skema) — hilang kalau NVMe mati.
- **Offsite juga skip:** `rclone listremotes` kosong — `offsite-backup.sh` SKIP tiap hari sejak 2026-09-15 (log: "no rclone remotes configured"). Hermes backup sendiri juga belum pernah ke offsite. Ini known gap untuk sesi berikutnya (butuh keputusan user soal provider R2/S3/B2).
- **Dump:** `hermes-hermes-cicddb-20260919_101019.tar.gz` = 864 KB (62 tabel, termasuk sistem mysql), 1.3 detik.
- **Restore (after):** container mysql:8.0 fresh → ready 18s → restore 6.1s → **24/24 tabel konsol balik, persis sama dengan live**. Backup yang gak pernah di-test restore-nya cuma harapan, bukan backup.
- **Healthcheck sekali untuk dua backup:** `cicddb-backup.sh` nulis ke `backup-state.json` yang sama, jadi `backup-healthcheck.sh` otomatis monitor keduanya (success rate 29/30, 97%).
- **Naming trick:** dump dinamai `hermes-hermes-cicddb-*.tar.gz` supaya match glob di `offsite-backup.sh` — kalau nanti user config rclone remote, DB ikut ke offsite tanpa ubah script itu sama sekali.

## Decision
Adopt. Cron `0 3 * * *` aktif, terverifikasi end-to-end (dump → restore → count match). Rollback gampang: hapus cron entry + `cicddb-backup.sh`.

## Risk
- Dump pakai `--single-transaction` (InnoDB consistent, tanpa lock panjang); kalau nanti ada tabel MyISAM, dump bisa gak konsol — untuk workload console ini non-issue.
- Credential root dibaca dari env container, gak pernah disentuh host.
- Offsite masih SKIP (no remote) — backup tetap single-site di NVMe yang sama sampai user config rclone.

## Lessons Learned
- "Backup verified" ≠ "backup exists". Satu restore test 25 detik mengubah status dari "kemungkinan besar aman" jadi "terbukti balik".
- Global satu nama file (`hermes-hermes-*`) bikin pipeline downstream (offsite) bisa nerima backup baru tanpa disentuh — konvensi naming adalah interface.

## Next Priority
1. Konfigurasi rclone remote (R2 free tier) → offsite aktif untuk SEMUA backup (butuh input user: pilih provider + account).
2. Watchdog: alert WhatsApp kalau tabel dump < 30 dua hari berturut-turut (schema drift).
