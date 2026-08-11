---
task_id: t_4dc98e9a
objective: OBJ-002
date: 2026-08-09
status: draft
human_review: autonomous
---

# Webreader Health Check & Baseline Metrik (30 jam uptime)

## Engineering Question
Apakah webreader (TICMI proxy API) punya health monitoring yang memadai, dan berapa error rate-nya selama ~30 jam pertama runtime?

## Method
1. `curl http://localhost:8787/health` — verifikasi endpoint health
2. `docker inspect webreader-{api,nginx} --format .Config.Healthcheck` — cek Docker HEALTHCHECK
3. Analisis `docker logs` (full container lifetime ~30h) untuk HTTP status codes dan TICMI token refresh success/failure
4. Mapping nginx 404 ke endpoint path untuk identifikasi rotte yang missing

## Findings (dengan pengukuran)

### Health Endpoint
- `/health` **ada dan sehat**: `200 OK` dalam **6.3 ms**, response `{"ok":true}`
- Endpoint source: `src/server.ts:166`

### Docker HEALTHCHECK
- **Tidak ada** di kedua container (`Config.Healthcheck: null` untuk api & nginx)
- Container tidak punya volume mounts — log hanya ada di stdout/stderr Docker

### HTTP Status Codes (nginx, ~30h, 137 total requests via :8181)
| Status | Count | % |
|--------|-------|---|
| 200 | 119 | **86.9%** |
| 404 | 18 | **13.1%** |
| 4xx/5xx lainnya | 0 | 0% |

Error rate: **13.1%** (semua 404, zero 5xx).

### 404 Breakdown (route yang missing)
| Path | Hits |
|------|------|
| `/v1/ticmi/listed-companies` | 5 |
| `/v1/ticmi/ihsg` | 5 |
| `/v1/ticmi/sector-indices` | 4 |
| `/v1/ticmi/ihsg-history` | 1 |
| `/v1/ticmi/cache-stats` | 1 |
| `/v1/market/overview` | 2 |

Route-route ini return 404 — kemungkinan belum diimplement atau ada mismatch path antara client dashboard dan API.

### TICMI Token Refresh — **INI TEMUAN UTAMA**
Interval refresh: 28800000 ms = **8 jam**. Timeline lengkap (8 events):

| Waktu (UTC) | Status | Limit ID |
|-------------|--------|----------|
| 2026-08-06 15:43 | ✅ refresh (boot) | 2358 |
| 2026-08-06 23:43 | ✅ refresh | 2359 |
| 2026-08-07 07:43 | ✅ refresh | 2366 |
| 2026-08-07 15:43 | ❌ **Over Limit User Login** | — |
| 2026-08-07 18:37 | ✅ refresh (restart boot) | 2367 |
| 2026-08-08 02:37 | ❌ **Over Limit User Login** | — |
| 2026-08-08 10:37 | ❌ **Over Limit User Login** | — |
| 2026-08-08 18:37 | ❌ **Over Limit User Login** | — |

**Refresh success rate: 4/8 = 50%.** 4 failure berturut-turut terakhir (sejak 2026-08-07 15:43).

Pada saat audit (2026-08-09 07:10 WIB), token terakhir yang berhasil adalah 2026-08-07 18:37 — sudah **~36 jam** stale. Proxy `/v1/ticmi/*` return **404** saat dites live, konsisten dengan token expired.

**Root cause dugaan:** "Over Limit User Login" = TICMI rate-limit login. Refresh interval 8 jam tapi session TICMI mungkin hanya valid untuk durasi tertentu, atau ada concurrent session di tempat lain yang menghabiskan quota login. Limit ID meloncat dari 2359→2366 (skip 7) antara refresh ke-2 dan ke-3 — mengindikasikan login dari client lain.

## Decision
**Needs Human Review** — ini audit pure-measurement, tapi temuannya critical:

1. **Token refresh 50% failure rate** bukan masalah webreader code — ini account-level issue (TICMI rate limit / concurrent login). Perlu investigasi: apakah credential dipakai di tempat lain?
2. **Docker HEALTHCHECK belum di-wire** — gap operasional, container restart policy `unless-stopped` tidak menangkap dead-but-up state
3. **6 route 404** — kemungkinan dashboard client panggil endpoint yang belum exist

## Risk
- **High**: Token stale 36 jam = semua request `/v1/ticmi/*` gagal diam-diam. User-facing impact tergantung siapa konsumsi webreader.
- **Medium**: Tanpa Docker HEALTHCHECK, orchestrator tidak bisa auto-restart kalau API hang tanpa crash.

## Lessons Learned
- Container "Up 30 hours" di `docker ps` **tidak berarti sehat** — uptime hanya berarti process belum crash, bukan service functional.
- Log terstruktur (JSON pino) sangat memudahkan analisis. Webreader sudah bagus di sini.
- Error rate 13.1% (nginx layer) understated real problem — semua 404 adalah route-missing, bukan downstream failure. Token failure tidak terlihat di nginx karena request tidak sempat mencapai TICMI.

## Next Priority
1. **Investigasi TICMI "Over Limit User Login"** — apakah credential dipakai concurrent di tempat lain? Rate limit TICMI berapa login/day?
2. **Wire Docker HEALTHCHECK** di kedua Dockerfile (api: `curl /health`, nginx: `curl /`)
3. **Fix atau remove 6 route 404** — validasi dashboard client vs API routes yang tersedia
