---
human_review: autonomous
---

# Daily Report — Per-Endpoint TTL Rejected

Tanggal: 2026-08-06
Task: t_D47BF786

## Engineering Question

"Apakah TTL cache per-endpoint di webreader memberikan nilai tambah dibanding TTL global 60s?"

## Method

1. Audit arsitektur cache webreader: satu `TtlCache` global dengan TTL 60s, semua POST endpoint TICMI share satu cache instance
2. Query cache stats via `/v1/system/stats` — hits, misses, size
3. Hitung traffic total dari Docker logs 7 hari terakhir
4. Evaluasi apakah per-endpoint TTL punya basis engineering yang kuat

## Findings

| Metric | Value |
|--------|-------|
| Requests 7 hari terakhir | 4 |
| Cache hits (sejak container restart) | 0 |
| Cache misses (sejak container restart) | 1 |
| Hit rate | 0% |
| Cache size | 0 |
| Container uptime saat audit | ~59 menit |
| Unique endpoints per 7 hari | ~3 (GET /movers x2, POST /insider-activity x1, GET /movers x1) |

**Traffic webreader: 0.57 requests/hari.** Cache tidak pernah terpakai karena:
- Setiap request punya URL/body yang berbeda (different secCode, different date ranges)
- Interval antar request jauh melebihi TTL 60s (jam hingga hari)
- Tidak ada consumer yang polling endpoint yang sama secara berulang

## Decision

**Reject** — Per-endpoint TTL tidak memberikan nilai tambah. Cache tidak pernah hit pada traffic saat ini. Menambah complexity per-endpoint TTL (routing table, config, conditional logic) untuk cache yang kosong adalah YAGNI.

Langkah yang benar jika traffic naik: pertama ukur apakah cache 60s global actually hits, baru pertimbangkan per-endpoint differentiation. Jika hit rate masih 0% setelah traffic naik, masalahnya bukan TTL — tapi apakah cache strategy yang tepat untuk workload ini sama sekali.

## Risk

Tidak ada risk — task ditolak, tidak ada code change.

## Lessons Learned

1. Cache optimization hanya relevant kalau cache actually terpakai. Check hit rate dulu sebelum optimasi TTL.
2. Follow-up tasks yang di-auto-generate dari report sebelumnya bisa tidak relevant kalau tidak divalidasi konteksnya — backlog item ini lahir dari rekomendasi "pertimbangkan TTL berbeda" tapi tidak memperhitungkan traffic reality.

## Next Priority

- Investigasi kenapa webreader traffic sangat rendah — apakah cron jobs yang seharusnya consume webreader sudah tidak berjalan?
- Jika webreader akan digunakan lebih intensif, monitorkan cache hit rate setelah traffic naik sebelum implement per-endpoint features
