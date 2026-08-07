# Daily Report — Cache Polling Strategy Assessment

Tanggal: 2026-08-06
Task: t_59A87804

## Engineering Question

"Apakah perlu mengubah cache strategy (raise TTL / long polling / SSE) untuk mendukung polling consumer seperti real-time dashboard?"

## Method

1. Audit codebase: cari polling consumer, SSE, WebSocket, EventSource di webreader dan TabacoID
2. Cek Kanban board untuk task terkait dashboard/real-time
3. Review cache implementation saat ini (TtlCache, 60s TTL, env-configurable)
4. Verifikasi live cache stats via `/v1/system/stats`
5. Analisis apakah workload saat ini atau yang terencana membutuhkan strategy change

## Findings

| Metric | Value |
|--------|-------|
| Polling consumers di codebase | **0** — tidak ada setInterval/polling/SSE/WebSocket ke webreader |
| Kanban tasks tentang dashboard/real-time | **0** (selain task ini sendiri) |
| Live cache size | 0 (fresh start, container up ~32 min) |
| Cache TTL | 60.000 ms (env-configurable via `TICMI_CACHE_TTL_MS`) |
| Traffic pattern | ~20 POST/hari, semua cron 1x/hari + testing sporadis |
| Webreader consumers | IDX Daily Digest cron, IDX Insider Alert cron, manual testing |

**Codebase scan results:**
- TabacoID: 0 match untuk polling/SSE/EventSource/WebSocket
- Webreader: 0 match — hanya internal setInterval (token refresh, cache sweep, heartbeat)
- Satu referensi "metrics dashboard" di `site.ts` sebagai roadmap item, tapi belum ada implementasi

**Architecture assessment:**
Cache saat ini sudah env-configurable (`TICMI_CACHE_TTL_MS`). Jika nanti ada polling consumer, satu env var change sudah cukup — tidak perlu code change, tidak perlu SSE/WebSocket infrastructure.

Alasan ini cukup:
- IDX data (TICMI) update-nya per menit di market hours, tapi cron jobs hanya 1x/hari
- Dashboard yang polling per menit hanya berguna kalau user nonton live — tidak ada requirement itu
- Long polling/SSE adalah complexity yang tidak perlu untuk 20 req/hari
- TTL raise (misal 300s) = satu env var, tanpa code change, tanpa new infrastructure

## Decision

**Adopt (no-change)** — Tidak perlu mengubah cache strategy saat ini. Tidak ada polling consumer yang ada atau terencana. Prerequisite untuk strategy change (consumer yang polling) belum terpenuhi.

Jika nanti muncul polling consumer:
1. Pertama: coba raise `TICMI_CACHE_TTL_MS` (env var, zero code change)
2. Kalau TTL raise tidak cukup: baru pertimbangkan SSE atau background refresh
3. Jangan build infrastructure untuk consumer yang belum ada

## Risk

Tidak ada risk — pure assessment, tidak ada code change.

## Lessons Learned

1. Task follow-up yang investigasi prerequisite (apakah ada polling consumer?) bisa resolve dengan "tidak ada" — itu jawaban valid, bukan waste.
2. Cache yang env-configurable sudah future-proof untuk scenario TTL change. Tidak perlu code change untuk raise TTL.
3. Jangan implement SSE/WebSocket sampai ada concrete consumer yang membutuhkannya. YAGNI.

## Next Priority

- Fokus engineering ke sistem lain — webreader cache sudah optimal dan flexible
- Jika ada consumer baru yang polling, handle sebagai task terpisah dengan ukuran workload aktual
