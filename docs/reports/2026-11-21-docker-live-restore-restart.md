---
task_id: t_d6fb0e59
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-21
status: published
human_review: autonomous
---

# Docker daemon restart: live-restore akhirnya aktif + docker-ce 29.10.0

## Engineering Question
`live-restore: true` sudah ada di `/etc/docker/daemon.json` sejak 7 Nov, tapi `docker info` masih
melaporkan `Live Restore Enabled: false` — config tidak pernah dimuat karena daemon tidak pernah
direstart pasca-perubahan. Kapan waktu aman untuk restart, dan apakah sekalian bisa naikkan
docker-ce yang di-defer?

## Method
1. Pra-check: jam 09:01 WIB (weekend, di luar window cron berikutnya), semua 7 container healthy,
   semua punya restart policy `unless-stopped`.
2. `sudo apt-get install -y docker-ce` — sekalian upgrade 29.9.2 → 29.10.0 (postinst restart
   docker.service, jadi satu langkah untuk dua tujuan).
3. Verifikasi pasca-restart: `docker info`, status container, health check, smoke test HTTP.

## Findings (with measurements)
- live_restore_enabled: false → **true** (target utama task, tercapai)
- docker-ce: 29.9.2 → **29.10.0** (client CLI masih 29.9.2 sampai paket docker-ce-cli ikut naik — harmless, API compatible)
- Container recovery: **7/7 running, 7/7 healthy** ~1 menit pasca-restart (vaultwarden sempat `health: starting`, healthy di cek berikutnya)
- Downtime per container: ~15 detik — upgrade paket ikut me-restart containerd, jadi container ikut bounce. Live-restore hanya melindungi restart dockerd murni (mis. `systemctl restart docker` ke depan; ke depannya tidak perlu lagi).
- Smoke test: webreader-nginx :8181/health → 200, cicd-console :3001 → 200
- Journal docker pasca-restart: 2 baris `level=error` (`copy stream failed / closed fifo`) — transien saat shutdown daemon lama, one-time, bukan fault persisten

## Decision
**Adopt.** Restart dieksekusi dalam satu langkah upgrade, live-restore kini efektif, semua service
pulih tanpa intervensi manual.

## Risk
- Rendah. Restart policy `unless-stopped` di semua container terbukti bekerja. Satu-satunya
  window rawan adalah upgrade berikutnya — container akan bounce lagi jika containerd ikut
  direstart; tidak ada yang down permanen.

## Lessons Learned
- Config daemon.json hanya efektif setelah restart daemon — cek `docker info` setelah mengubah
  config, jangan anggap file = aktif (kesenjangan 14 hari di kasus ini).
- Upgrade docker-ce via apt otomatis restart service: maintenance window tak perlu dijadwalkan
  terpisah dari upgrade package.

## Next Priority
- docker-ce-cli masih 29.9.2 (client) — ikut naik saat update apt berikutnya, no action.
- W5 backlog webreader: /health endpoint sudah terbukti ada (200 OK), tinggal cek apakah
  HEALTHCHECK docker memakainya (sudah healthy, kemungkinan sudah).
