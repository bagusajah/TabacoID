---
task_id: t_5e732525
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-05
status: published
human_review: autonomous
---

# Docker daemon health: build cache prune + log rotation audit (OS4)

## Engineering Question
`docker system df` menunjukkan build cache 604MB (403MB reclaimable) dan
images 10.68GB (200.5MB reclaimable). Berapa yang bisa direclaim aman, dan
apakah rotasi log kontainer sudah dikonfigurasi — atau ada kontainer yang
log-nya tumbuh tanpa batas?

## Method
1. Audit `docker system df -v` per image/container/volume.
2. Cek log driver + limit per kontainer via `docker inspect`.
3. Ukur ukuran json-log aktual di `/var/lib/docker/containers/`.
4. Prune selektif: `docker builder prune --filter until=24h` + `docker image
   prune` (dangling only). Sengaja TIDAK pakai `docker system prune` — akan
   menghapus container exited cicd-console-app/db beserta volume MySQL-nya
   (213MB data).
5. Root-cause fix untuk gap rotasi log.

## Findings
- **Reclaimed: 244.1MB** — build cache 43.6MB (filter 24h; sisanya 360MB
  adalah cache hangat dari build 11 hari terakhir, sengaja dipertahankan
  karena disk cuma 19% dan prune akan memperlambat build berikutnya) +
  dangling image 200.5MB (`new-cicd-console-app` lama, 0 container pakai).
- **Rotasi log tidak seragam:** webreader-nginx 5m/3, webreader-api 10m/3 —
  tapi crawl4ai, cicd-console-app, cicd-console-db **json-file tanpa limit**
  (unbounded). Ukuran saat ini masih kecil (max 2.2MB) jadi belum darurat,
  tapi crawl4ai adalah kontainer paling aktif — kandidat tumbuh terbesar.
- Docker daemon sehat: 0 error/fail di journal 48 jam terakhir.
- Disk: 44G terpakai dari 234G (19%) — tidak ada tekanan disk.

## Decision
**Adopt** — dua perbaikan kelas, nol disrupsi:
1. `logging: json-file 10m×3` ditambahkan ke service crawl4ai di
   `/home/orangepi/crawl4ai/docker-compose.yml` (`docker compose config`
   valid; berlaku saat re-create berikutnya, kontainer jangan diganggu).
2. Default kelas-dunia di `/etc/docker/daemon.json`: `log-driver json-file`
   + `max-size 10m, max-file 3` — berlaku untuk semua kontainer *baru* pada
   restart daemon berikutnya. Backup: `daemon.json.bak-20260905`. JSON
   divalidasi setelah tulis (daemon.json rusak = docker gagal start).

## Risk
Rendah. Tidak ada restart daemon/kontainer dilakukan. daemon.json baru
berlaku saat restart berikutnya; JSON sudah divalidasi + backup ada. Cache
560MB yang tersisa disengaja (warm build cache).

## Lessons Learned
`docker system df` agregat menyesatkan: "reclaimable 403MB" ternyata
sebagian besar cache hangat yang layak dipertahankan. Reclaim nyata yang
aman datang dari dangling image, bukan cache. Rotasi log per-kontainer di
compose file adalah satu-satunya cara limit apply deterministik — default
daemon.json hanya menjangkau kontainer yang dibuat setelah restart daemon.

## Next Priority
Saat jadwal maintenance mengizinkan restart: `systemctl restart docker`
untuk mengaktifkan default log-opts, lalu `docker compose up -d` re-create
crawl4ai agar limit per-service aktif. Item backlog berikutnya yang menarik:
OS3 (APT security audit) atau H2 (gateway memory trend).
