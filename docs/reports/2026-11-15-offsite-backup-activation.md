---
task_id: t_95c05741
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-15
status: published
human_review: autonomous
---

# Aktivasi lapis offsite backup — rclone SFTP ke VPS (pernah SKIP diam 30 hari)

## Engineering Question
Pipeline backup 3-lapis Hermes (lokal → healthcheck → offsite). Apakah lapis offsite-nya benar-benar jalan?

## Method
Audit jejak `~/backups/offsite-backup.sh` (cron 04:30 harian): baca log 30 hari, cek konfigurasi rclone, uji prasyarat (SSH key ke VPS via Tailscale), lalu aktifkan dan verifikasi end-to-end.

## Findings
- **Lapis offsite MATI total sejak dipasang**: log 17 Okt – 15 Nov (30 hari) `SKIP: no rclone remotes configured` setiap hari. `rclone listremotes` = kosong. Nol byte pernah meninggalkan Pi. Follow-up t_BKPVERIFY01 (Agustus) pernah nyatat "offsite belum aktif" — tidak pernah ditindaklanjuti sampai hari ini.
- **Bug dedup tersembunyi di script lama**: cek "sudah terupload?" pakai `rclone ls` (output `size path`) lalu `grep '^filename$'` — pola itu tidak akan pernah match, artinya begitu remote ada, script akan re-upload 120MB setiap hari tanpa sadar. Fix: `rclone lsf` (nama saja).
- **Script lama tidak punya retention**: tanpa prune, disk VPS 20G (63% terpakai) akan penuh dalam ~58 hari pada 120MB/hari.
- SSH root ke VPS (100.65.68.15:2222 via Tailscale, key `id_ed25519`) terverifikasi — infrastruktur yang sudah ada sejak t_c70b4327, tinggal dipakai.

## Perubahan
- `~/.config/rclone/rclone.conf` — remote baru `vps:` (SFTP → 100.65.68.15:2222, dedicated key). IP langsung, bukan alias SSH config: rclone tidak resolve alias Host.
- `~/backups/offsite-ssh/` — key + config dedup (self-contained, cron-safe), dipisah dari `~/.ssh` supaya backup script nggak menyentuh key aktif.
- `~/backups/offsite-backup.sh` — rewrite kecil: remote eksplisit `vps:backups`, **guard remote hilang = ERROR + alert WhatsApp + exit 1** (bukan SKIP diam — ini persis class failure yang membunuh leg ini 30 hari), dedup `lsf`, `rclone copyto`, retention 14 file (~1.7GB ceiling di VPS), verifikasi size pasca-upload.

## Hasil (semua terverifikasi live)
- Upload pertama: `hermes-hermes-20261115_030001.tar.gz` (120MB) → `vps:backups` di host.tabaco.id, 34 detik.
- **SHA-256 match** lokal vs VPS: `b93e4032…4f801` kedua sisi — bukti integritas end-to-end.
- Idempotensi: run kedua = `SKIP: already on vps:backups` (bug dedup terbukti fix).
- Retention: dgn 15 file dummy, prune membuang 1 terlama → 14 tersisa (filename sort = chronological).
- Guard: remote hilang disimulasikan via `RCLONE_CONFIG` kosong → ERROR tercatat, alert ter-approve stub, rc=1.
- VPS side: file terlihat via `ssh ls` langsung, 125174707 bytes, disk 63%→64% (+120MB).

## Decision
**Adopt.** Cron 04:30 yang sudah ada sekarang benar-benar menghasilkan salinan offsite harian (beda gedung, jalur Tailscale, biaya nol). Failure mode paling berbahaya (silent skip) sudah diubah jadi alarm.

## Risk
- Offsite ini masih **same-provider ecosystem** (VPS yang juga host DNS/relay). Kalau akun VPS bermasalah, lokal tetap selamat — risiko tingkat kedua, bukan lapis pertama.
- Tailscale dependent: kalau Tailscale down jam 04:30, upload gagal → alert WhatsApp (loud, bukan silent). Percobaan ulang terjadi besok pagi.
- Key backup ada di direktori backup yang ikut ke tar lokal — exposure sama dgn `~/.ssh` (chmod 600, owner orangepi).

## Lessons Learned
- Cron dengan `exit 0` pada "belum dikonfigurasi" = resep silent death. Guard yang benar membedakan *belum di-setup* (skip pertama kali) dari *setup-nya hilang* (error keras). 30 hari log SKIP seharusnya ketahuan dari healthcheck — healthcheck lokal cuma cek umur backup lokal, nggak cek keberadaan offsite.
- Bug dedup `rclone ls` ini silent juga: tidak akan pernah gagal, hanya boros bandwidth/disk setiap hari.

## Next Priority
- (Opsional, tidak dijalankan hari ini) Tambah klaim offsite ke `backup-healthcheck.sh` — misal verifikasi ≥1 file di `vps:backups` umur <36h, satu baris `rclone lsf` + alert. Saat ini kegagalan offsite sudah ter-alert langsung dari script utama.
- Restore drill: download + untar satu backup dari VPS untuk membuktikan restore (belum pernah dilakukan di kedua lapis).
