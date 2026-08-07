# Daily Report — Webreader Cache Hit Rate Monitoring

Tanggal: 2026-08-06
Task: t_441C7595

## Engineering Question

"Berapa cache hit rate webreader setelah traffic naik, dan apakah perlu implement per-endpoint features?"

## Method

1. Query live cache stats via `/v1/system/stats` — hits, misses, hit rate, size
2. Audit 5 hari nginx access log (webreader-nginx container, up 3 hari, 150 baris total)
3. Analisis pola traffic per sumber: cron jobs vs manual burst vs scattered
4. Hitung theoretical hit rate berdasarkan pattern request
5. Verifikasi cache behavior dengan live test (2x POST identik, ukur before/after)

## Findings

| Metric | Value |
|--------|-------|
| Total POST requests (5 hari) | 103 |
| Cache hits (live, since container restart ~2h) | 0 → 1 (setelah test) |
| Cache misses (live) | 1 → 2 (setelah test) |
| Cache size | 0 → 1 (setelah test) |
| Container uptime saat audit | ~2 jam (api), 3 hari (nginx) |

**Sumber traffic:**
- **IDX Daily Digest cron** (04:00 UTC, weekdays): ~20 requests, 4 endpoint/call, Python-urllib/3.11
- **IDX Insider Alert cron** (12:00 UTC, weekdays): ~5 requests, curl/7.81.0
- **Manual burst** (Aug 5, 19:03 UTC): 42 requests, 7 endpoints x 6 identik dalam 3 detik, curl/7.81.0
- **Scattered**: ~36 requests (testing, debugging, health checks)

**Cache effectiveness per scenario:**
| Scenario | Requests | Hit Rate | Alasan |
|----------|----------|----------|--------|
| Cron jobs (1x/hari) | ~25 | 0% | Interval >> TTL 60s |
| Aug 5 burst (rapid-fire) | 42 | ~83% | 6 identik dalam 3s |
| Scattered (testing) | ~36 | 0% | Unique endpoints/waktu |

**Live cache test:**
- POST /v1/ticmi/indices pertama: miss (cache kosong)
- POST /v1/ticmi/indices kedua (identik, <60s): **hit** ✓
- Cache berfungsi dengan benar untuk request body identik.

**Kesimpulan traffic:**
- Rata-rata: 20.6 POST/hari
- Burst terjadi sekali dalam 5 hari (0.2 burst/hari)
- Tanpa burst: hit rate = **0%** — semua request unik, interval > TTL
- Dengan burst: theoretical hit rate = 34% (35/103), tapi burst adalah anomali bukan pattern

## Decision

**Adopt (no-change)** — Cache sudah berfungsi dengan benar. Tidak perlu per-endpoint TTL atau per-endpoint features. Hit rate rendah bukan karena cache rusak, tapi karena workload tidak punya repeat pattern yang relevan untuk TTL 60s.

Cache hanya berguna kalau ada consumer yang polling endpoint yang sama berulang dalam interval < TTL. Workload saat ini (cron 1x/hari + testing sporadis) tidak punya pattern itu.

## Risk

Tidak ada risk — pure monitoring/audit, tidak ada code change.

## Lessons Learned

1. Cache hit rate = 0% bukan selalu berarti cache broken. Bisa jadi workload memang tidak punya repeat pattern.
2. Bursts (6x identical dalam 3s) memberikan 83% hit rate tapi terlalu jarang untuk meaningful overall impact.
3. Metrics yang penting bukan "berapa hit" tapi "apakah workload punya repeat pattern yang cache bisa serve."
4. Cache stats endpoint (`/v1/system/stats`) bekerja dan bisa dipakai untuk monitoring ke depan.

## Next Priority

- Jika nanti ada consumer yang polling (misal real-time dashboard), perlu naikkan TTL atau gunakan different strategy (longer TTL + background refresh)
- Pertimbangkan expose per-endpoint cache stats kalau ada debugging needs — tapi belum perlu sekarang
- Fokus engineering ke sistem lain — webreader cache sudah optimal untuk workload saat ini
