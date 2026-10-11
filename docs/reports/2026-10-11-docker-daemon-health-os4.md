---
task_id: t_25c73d01
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-11
status: published
human_review: autonomous
---

# OS4: Docker Daemon Health Audit — Orange Pi

## Engineering Question
Apakah Docker daemon di Orange Pi sehat: log rotation aktif, dan berapa disk yang bisa direclaim tanpa risiko data?

## Method
1. `docker system df` + `docker system df -v` untuk breakdown images/volumes/build cache.
2. Verifikasi log rotation: `daemon.json` + `HostConfig.LogConfig` per container.
3. Mapping anonymous volumes → container pemakai (sebelum sentuh apa pun).
4. Prune terbatas: `docker image prune -f` (dangling only) + `docker builder prune -f --filter until=168h`. Tanpa volume prune, tanpa `system prune -a`.
5. Post-check: semua container tetap up + healthy.

## Findings

**Log rotation: SEHAT.**
- `daemon.json` default: `json-file`, max-size 10m, max-file 3 → capped 30MB/container.
- 4/6 container eksplisit (10m×3); webreader-nginx 5m×3; `new-cicd-console-db-1` dan `crawl4ai` config kosong → mewarisi default daemon.json. Semua bounded, tidak ada json.log yang bisa membesar tak terbatas.

**Disk usage before:**
- Images: 14 total, 12.42GB (reclaimable 1.39GB / 11%)
- Build cache: 79 entries, 1.949GB (reclaimable 1.10GB)
- Volumes: 3, 638.6MB (2 anonymous volume 427.7MB unreferenced)
- df `/`: 63G used / 234G (27%)

**Prune result (after):**
- 11 dangling images deleted → 116.2MB (termasuk 3× webreader-api lama @2.45GB yang layer-nya shared, jadi reclaim riil kecil)
- Build cache tua (>7 hari): 1.306GB reclaimed, 79 → 50 entries (1.949GB → 643.8MB)
- **Total reclaim: ~1.42GB** (df: 63G → 61G)
- Semua 6 container tetap up, 5 healthy, 0 restart.

**Temuan yang TIDAK dihapus (butuh keputusan human):**
- 2 anonymous volume (dibuat 2026-09-19, ±427MB) tidak direferensasi container manapun — kemungkinan orphan data mysql lama. Isi bisa jadi data DB; delete irreversible → dibiarkan.
- Images tagged tapi tak terpakai: `passbolt/passbolt` (559MB), `mariadb:11` (357MB), `mysql:8.0` (795MB) — dipertahankan sebagai rollback capability, bukan dangling.

## Decision
Adopt. Prune terbatas (dangling images + build cache >7d) aman dan terukur; dijadikan pola baku. Volume anonymous tidak disentuh otomatis.

## Risk
- Rendah: hanya cache/image tanpa tag yang dihapus. Rollback tidak diperlukan (build cache memang regenerable, dangling images tidak dipakai container).
- Image build berikutnya lebih lambat sekali (cache layer hilang).

## Lessons Learned
- "Reclaimable 1.39GB" pada images itu misleading — sebagian besar shared layers milik image aktif; reclaim riil dari image prune cuma 116MB. Build cache yang benar-benar memakan 1.3GB.
- Cron guard memblok `sudo` + `docker` kombinasi; semua inspect cukup via docker API user-level, tak perlu akses /var/lib/docker langsung.

## Next Priority
- Keputusan user: 2 anonymous volume (427MB) — inspect isinya lalu hapus, atau biarkan.
- Pertimbangkan `mysql:8.0` + `mariadb:11` + `passbolt` (1.7GB combined) — kalau memang tidak dipakai lagi, hapus manual.
