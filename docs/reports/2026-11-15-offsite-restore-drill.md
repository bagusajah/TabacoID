---
task_id: t_d88142d6
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-15
status: published
human_review: autonomous
---

# Restore drill backup offsite — dan dua celah yang ketemu di jalan

## Engineering Question
Backup offsite ke VPS baru saja aktif (t_95c05741, pagi ini). Tapi backup yang nggak pernah di-restore itu bukan backup — cuma harapan. Pertanyaannya: apakah arsip di `vps:backups` benar-benar bisa di-download utuh dan di-unpack jadi Hermes yang jalan?

## Method
Download `hermes-hermes-20261115_030001.tar.gz` (125.174.707 bytes) dari `vps:backups` via `rclone copyto` terbalik ke scratch, lalu: bandingkan SHA-256 dgn salinan lokal, `gzip -t`, hitung member tar, ekstrak penuh ke scratch, spot-check isi (config.yaml parse, WA session, kanban.db).

## Findings

### Drill: lolos semua
- SHA-256 identik dua sisi: `b93e4032ef81…4aa4f801` (download VPS vs lokal), download 77 detik.
- 3653 member tar, ekstrak penuh 3286 file / 306MB, `config.yaml` valid (40 top keys), WA session utuh 1852 file, kanban board ada di dalam arsip.
- Cakupan bagus: config, .env, sessions, state.db, projects.db, skills, memories, plugins, secrets, systemd user units — semua target recovery kritis masuk.

### Celah #1: `cron/jobs.json` hilang dari tar harian
Definisi cron live (`~/.hermes/cron/jobs.json`, 39KB, Daily Focus + Builder + auto-publish dsb.) **nggak ada** di tar 03:00 — padahal `cron/` ada di daftar ITEMS dan file lain di folder itu (locks, jobs.db) ikut. Root cause: `hermes-weekly-restart.timer` juga api jam **03:00:03 hari Minggu**, pas tar masih extended-read — restart me-rewrite jobs.json persis di jendela itu. Error tar-nya ditelan `2>/dev/null` di baris tar, jadi 30 hari berjalan diam-diam minus satu file.

### Celah #2 (ketemu pas verifikasi fix #1): race DB live lebih dalam
Pas stderr-nya dipasangin log, run manual langsung gagal: `state.db: file changed as we read it` — gateway nulis DB 283MB pas tar. Artinya backup harian ini **bisa gagal total kapan saja** tanpa jejak, dan `2>/dev/null` menyembunyikannya.

## Perubahan
- Crontab: `hermes-backup.sh` geser 03:00 → **03:10** (lewat jendela tabrakan dgn weekly-restart 03:00:03).
- `hermes-backup.sh`: (1) tar stderr sekarang masuk log, bukan dibuang; (2) DB sqlite top-level di-snapshot dulu via `sqlite3 .backup` (konsisten-online, tar baca salinan dingin, path member tetap identik). DB di dalam entri direktori (`cron/*.db` dsb.) tidak di-snapshot — state reproducible, risiko rendah, dicatat di komentar.
- Debris sendiri dibersihkan: 2 partial archive hasil run manual dihapus (kalau ditinggal, besok offsite bakal upload partial itu), sisa 2 entri FAIL di backup-state.json dibiarkan (healthcheck berbasis umur file, bukan state — nggak bikin false alert).

## Hasil (terverifikasi live)
- Run pertama pasca-fix: rc=0, 120M, tanpa warning race. `jobs.json` + `state.db` masuk tar.
- Ekstrak `state.db` dari tar baru: 25 tabel, `PRAGMA integrity_check` = ok. `jobs.json` tar vs live: 2 job, ids match.

## Decision
**Adopt.** Restore offsite terbukti end-to-end; dua celah diam-diam (jobs.json hilang, race DB bisa bunuh backup) ditutup di akar.

## Risk
- Snapshot `sqlite3 .backup` menambah ~300MB I/O sementara di /tmp selama beberapa detik — nggak signifikan di NVMe.
- DB di dalam direktori (mis. `cron/executions.db`) masih rawan race teoretis; kalau suatu hari gagal, sekarang bakal kelihatan di log (bukan diam lagi).
- Fix belum keuji lewat jalur cron beneran (jendela berikutnya besok 03:10); run manual + env stripped sudah ekivalen.

## Lessons Learned
- `2>/dev/null` di tar = memasang titik buta persis di operasi yang paling rentan race. Perbaikan satu argumen langsung membongkar defect kedua.
- Restore drill itu alat deteksi, bukan formalitas: dia yang nemuin jobs.json hilang — 30 hari backup "sukses" log-nya.

## Next Priority
- Besok pagi: cek log backup 03:10 + offsite 04:30 (satu kali liat, konfirmasi jalur cron).
- `backup-healthcheck.sh` masih cuma cek umur file lokal; menambah cek offsite (`rclone lsf vps:backups` umur <36h) tetap jadi kandidat satu-baris yang worth itu.
