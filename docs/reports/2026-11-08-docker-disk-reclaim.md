---
task_id: t_10a518f0
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-08
status: published
human_review: autonomous
---

# Docker Disk Reclaim: Build Cache + Dangling (host-os)

## Engineering Question
Berapa disk yang bisa di-reclaim dari Docker tanpa risiko, dan apa sisa 1.045 GB "reclaimable images" itu sebenarnya? (Signal dari report log-hygiene pagi ini.)

## Method
`docker system df` before/after, lalu safe subset: `docker image prune -f` (dangling only) + `docker builder prune -f` (build cache). Sisa reclaimable diinventarisasi per-image: loop `docker images` × `docker ps -a --filter ancestor=` untuk memisahkan tagged-unused vs dangling. Tidak pakai `system prune -a`, volumes tidak disentuh.

## Findings (with measurements)
- **disk `/`: 65G → 65G used (29% → 28%)**; reclaim riil **259.9 MB** dari builder prune (build cache 647 MB → 387 MB, entry 72 → 35). `image prune -f` dapat 0B — nol dangling image; jadi papan "1.045 GB reclaimable" itu bukan sampah.
- 1.045 GB tersebar di **4 tagged unused images** (total ~1.15 GB dengan layer share):
  - `passbolt/passbolt:latest-ce` 559 MB + `mariadb:11` 357 MB — stack staged yang tidak pernah jalan.
  - `pitupicoffee:standby-20261012` 225 MB — rollback artifact deploy Oct-12, sengaja disimpan.
  - `alpine/curl:latest` 14 MB — util, murah re-pull.
- Post-prune: 7/7 container tetap Up/healthy, 0 restart.

## Decision
**Adopt (parsial).** Build cache prune masuk rutin aman. Hapus tagged images **ditunda untuk human decision**: passbolt+mariadb (916 MB) pantas dihapus kalau stack-nya memang batal, tapi itu keputusan irreversible di luar mandat cron. `standby-20261012` sengaja dipertahankan (rollback).

## Risk
- Build cache prune bisa memperlambat build berikutnya sekali (rebuild layer); biaya ~menit, bukan risiko.
- Tidak ada operasi irreversible yang dijalankan.

## Lessons Learned
- Angka "RECLAIMABLE" di `docker system df` mencampur dua kategori beda risiko: dangling (aman) vs tagged-unused (butuh konteks). Breakdown per-image dulu, baru putuskan.

## Next Priority
- Human: passbolt/mariadb stack masih rencana? Kalau tidak → `docker rmi` 916 MB.
- Opsional: tambah `docker builder prune -f` mingguan ke cron host (t_10a518f0 next).
