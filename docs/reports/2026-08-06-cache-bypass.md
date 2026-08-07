# Daily Report 2026-08-06 (Cache Bypass)

## Pertanyaan Engineering
Bagaimana menambahkan cache bypass parameter `?nocache=1` pada webreader TICMI endpoints supaya caller bisa mendapatkan fresh data tanpa menunggu cache TTL expire?

## Metode
- Membaca existing cache implementation di `webreader/src/routes/ticmi.ts` dan `webreader/src/services/cache.ts`
- Cache menggunakan dua hooks: `preHandler` (cache read) dan `onSend` (cache write)
- Menambahkan pengecekan query parameter `nocache` di `preHandler` hook — jika `nocache=1` atau `nocache=true`, skip cache read dan set flag `__nocache`
- Menambahkan pengecekan flag `__nocache` di `onSend` hook — skip cache write juga
- Build Docker image, restart container, benchmark

## Temuan (dengan pengukuran)
- **Cached response**: 8-10ms (rata-rata ~8.8ms)
- **Nocache (fresh upstream)**: 464ms pertama, 11-14ms berikutnya (rate limiter/queue effect)
- **Latency ratio**: cached 47x lebih cepat dari upstream miss
- Docker build sukses (tsc clean dalam container)
- Container restart healthy (`/health` → `{"ok":true}`)
- Cache stats setelah test: `size: 2, ttlMs: 60000` (correct — nocache requests tidak populate cache)

**Perubahan code**: 2 baris logic di `src/routes/ticmi.ts` — pengecekan `req.query.nocache` di preHandler + pengecekan `req.__nocache` di onSend. Total diff: +6 baris (termasuk comment).

## Keputusan
**Adopt** — feature sudah di-deploy ke container `webreader-api`, verified working.

## Risiko
- Minimal. Query param tambahan tidak mengubah behavior existing calls (backward compatible).
- `nocache` juga skip write — caller nocache tidak "poison" cache dengan fresh data yang mungkin beda. Ini intentional: jika butuh fresh data, biarkan cache tetap serve stale untuk caller normal sampai TTL expire.

## Pelajaran
- Query param `nocache` pada POST request — valid di HTTP spec, Fastify parses-nya otomatis.
- Skip write juga penting: jika nocache response masuk cache, caller normal berikutnya dapat fresh data sementara cache lama replaced — ini bisa menyebabkan inconsistency timing antara caller yang pakai nocache vs tidak.

## Prioritas Berikutnya
- Monitoring cache hit/miss ratio di system stats (task t_41EB9B9C di kanban)
- Pertimbangkan TTL per-endpoint (t_D47BF786)
