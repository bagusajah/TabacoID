---
task_id: daily-focus
objective: OBJ-002
experiment: null
date: 2026-08-12
status: published
human_review: autonomous
---

# Docker Log Rotation & Build Cache Prune

## Engineering Question
Container logs webreader tumbuh tanpa batas (no log rotation config). Berapa besar waste-nya dan bagaimana mencegahnya?

## Method
1. Audit Docker disk usage: `docker system df` + build cache breakdown
2. Inspect container log files di `/var/lib/docker/containers/`
3. Check `docker-compose.yml` untuk logging config (tidak ada)
4. Prune build cache + dangling images
5. Add `json-file` log rotation ke docker-compose.yml
6. Force-recreate containers, verify health

## Findings (with measurements)
- **Build cache:** 267.5 MB → 0 MB (reclaimed 267.5 MB)
- **Dangling image:** deleted 1 layer, reclaimed 151 MB
- **Total disk reclaimed:** ~418 MB
- **Container log cap BEFORE:** ∞ (unlimited growth) → **AFTER:** api 30 MB max (3×10MB), nginx 15 MB max (3×5MB)
- **Docker images:** 3 → 2 (1 dangling removed)
- **Container health:** both `healthy` post-recreate, `/health` endpoint responds `{"ok":true}`

## Decision
Adopt — log rotation aktif, containers recreated dengan config baru.

## Risk
Minimal. Force-recreate menyebabkan downtime ~5 detik saat container restart. Tidak ada data loss (containers stateless, session via bind mount).

## Lessons Learned
- Docker default `json-file` driver tidak punya log rotation — harus eksplisit di compose atau `daemon.json`
- Build cache menumpuk 267 MB dalam 5 hari dari 25 cache entries
- Webreader container baru berjalan 2 hari, log belum besar (1.5 MB total), tapi akan tumbuh tanpa cap

## Next Priority
- Pertimbangkan set log rotation global via `/etc/docker/daemon.json` untuk semua container (bukan per-container di compose)
- Schedule periodic `docker builder prune` via cron (weekly)
