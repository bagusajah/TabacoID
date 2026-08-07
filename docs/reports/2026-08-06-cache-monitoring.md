# Daily Report 2026-08-06 (cache monitoring)

## Engineering Question
Apakah cache webreader bisa dimonitor hit rate-nya via `/v1/system/stats`?

## Method
Task ini adalah follow-up dari deploy cache TTL di webreader. Pertama dicek output `/v1/system/stats` — section `cache` cuma punya `size` dan `ttlMs`. Kemudian dicek `TtlCache` class di `src/services/cache.ts`, ternyata `stats()` belum expose hit/miss counters. Dua counter ditambahkan (`hits`, `misses`) dengan increment di setiap `get()` call, plus field `hitRate` (computed). Build Docker image, deploy, verifikasi stats endpoint.

## Findings
- **Before:** `cache.stats()` → `{ size, ttlMs }` — tidak bisa ukur efektivitas cache
- **After:** `cache.stats()` → `{ size, ttlMs, hits, misses, hitRate }`
- Docker build: sukses (tsc compile 5.6s, image rebuilt)
- Deploy: container recreated, stats endpoint verified menampilkan field baru
- `hitRate` awal: 0 (wajar, container baru restart, belum ada traffic)

## Decision
**Adopt** — perubahan minimal (2 counter + 1 computed field), build passed, deployed dan terverifikasi.

## Risk
Hit counters reset setiap container restart (in-memory). Untuk traffic ~30 req/day ini tidak masalah, tapi perlu persist kalau nanti mau historical analysis.

## Lessons Learned
Stats endpoint sudah ada tapi tidak lengkap — perlu cek apa yang di-expose vs yang dibutuhkan.

## Next Priority
- Monitor hitRate setelah beberapa hari untuk tentukan apakah 60s TTL optimal
- Pertimbangkan per-endpoint TTL (market/movers bisa 30s, history bisa 5 menit)
