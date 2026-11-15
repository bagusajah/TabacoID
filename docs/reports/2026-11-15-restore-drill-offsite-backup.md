---
task_id: t_d88142d6
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-15
status: published
human_review: autonomous
---

# Restore Drill: Backup Offsite Terbukti Bisa Di-restore End-to-End

## Engineering Question
Backup lapis offsite (rclone → `vps:backups` di host.tabaco.id via Tailscale) baru saja diaktifkan (report 2026-11-15-offsite-backup-activation). Backup yang tidak pernah di-restore adalah percaya-diri, bukan bukti. Pertanyaan: apakah satu archive offsite benar-benar bisa ditransfer balik, terverifikasi integrity, dan diekstrak penuh?

## Method
1. Download `hermes-hermes-20261115_030001.tar.gz` (120M, dibuat 2026-11-15 03:00) dari `vps:backups` via `rclone copyto` terbalik → scratch. Transfer 40 detik.
2. Bandingkan sha256 dengan archive lokal yang jadi sumber upload.
3. `tar -tzf` listing penuh + `tar xzf` ekstraksi penuh ke scratch.
4. Spot-check: parse `config.yaml` (secret di-redact di output), parse JSON session key WhatsApp, diff sha256 config restored vs live config.
5. Bersihkan scratch segera (isi mengandung .env + WA session — tidak boleh menetap).

## Findings
- **sha256-match: PASS** — `b93e4032ef81b39373d95e24742219f8cd9a70dff2705ffc50aecb784aa4f801` identik remote-download vs lokal asli. Round-trip upload→VPS→download tidak mengubah satu byte pun.
- **tar-listing: PASS** — 3653 entry, struktur `home/orangepi/.hermes/{config.yaml,.env,whatsapp/session/...}` sesuai desain backup script (snapshot tree untuk DB panas).
- **extracted-sample: PASS** — 3287 file terekstrak tanpa error; config.yaml restored identik dengan config live (sha256 sama); pre-key WhatsApp ter-parse sebagai JSON valid.
- Debris dari sesi executor zombie (percobaan drill yang mati di tengah jalan) dibersihkan sebelum ekstraksi fresh; tidak ada file drill yang tertinggal.

## Decision
**Adopt.** Restore path offsite terbukti bekerja end-to-end. Kedua lapis backup (lokal 7 hari + offsite) kini punya bukti restore, bukan hanya bukti upload.

## Risk
- Drill ini read-only terhadap sumber dan semua di scratch — risiko produksi nol.
- Yang belum dibuktikan: restore ke *lokasi asli* (bukan scratch) dan drill untuk lapis `cicddb`. Frekuensi drill berikutnya tidak ada jadwalnya — backup script jalan harian, drill harusnya periodik.

## Lessons Learned
- Zombie task 56 menit meninggalkan setengah-drill di scratch; sha256 masih match untuk archive, tapi debris dibersihkan dulu supaya bukti ekstraksi tidak bercampur percobaan lama.
- sha256 lokal-vs-VPS sekaligus membuktikan kesehatan rclone config (sftp, key `backups/offsite-ssh/`) — dua hal terverifikasi dengan satu command.

## Next Priority
- Jadwalkan restore drill periodik (mis. bulanan) — tambah ke `backup-healthcheck.sh` sebagai reminder, atau task kanban berulang.
- Drill cicddb lapis offsite (861K, cepat) kalau mau cakupan penuh kedua backup stream.
