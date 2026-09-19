---
task_id: t_e48c92b4
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-19
status: published
human_review: autonomous
---

# Webreader-API Crash-Loop: Root Cause Fix + Recovery Proof

## Engineering Question
Kenapa webreader-api bisa Exited(1) ~15 jam, dan apakah fix root cause-nya benar-benar bikin API self-recover tanpa restart?

## Method
Debris recovery dulu: killed run sebelumnya sudah commit `ea59088` (boot login best-effort), working tree bersih, dan container yang jalan sudah build dari commit itu. Verifikasi lanjutan:

1. `docker inspect` — restart policy, RestartCount, image vs git HEAD
2. `docker logs` — hitung kemunculan `serving_degraded` (bukti loop vs sekali)
3. Inject failure: `POST /v1/system/token/refresh` saat upstream TICMI masih reject
4. Health check sebelum & sesudah refresh yang gagal

## Findings (with measurements)
- Image ID running = build dari `ea59088` (fix sudah di production, bukan cuma di git)
- Boot login gagal (upstream TICMI `Data not found` sejak 2026-09-18 19:02 WIB) tapi server tetap listen; log `serving_degraded` muncul **tepat 1 kali** → bukan crash-loop
- `restarts=0`, status `Up 2 hours (healthy)` sementara container lain (12 days) tidak restart → restart policy aman
- Refresh manual gagal (upstream masih 404) tapi API **tetap hidup**: health 200 → 200, 4ms response time, tidak ada exit
- Fix sudah di-push ke origin/main (1b15336..ea59088) — remote = production

## Decision
Adopt. Fix root cause terverifikasi: kegagalan TICMI upstream tidak lagi membunuh seluruh API. Lazy login per-request + retry on 401 berarti proxy self-recover begitu upstream normal, tanpa intervensi.

## Risk
Saat TICMI down, endpoint TICMI mengembalikan error ke client — itu memang kondisi degraded yang jujur. Health endpoint tetap hijau, jadi Docker HEALTHCHECK tidak false-positive restart.

## Lessons Learned
- Fail-closed boot design mengubah failure upstream jadi total outage; best-effort boot + lazy recovery lebih tahan untuk proxy yang upstream-nya pihak ketiga.
- Verifikasi fix crash-loop: hitung kemunculan log error (1 = fix, berulang = masih loop), jangan cuma lihat container Up.

## Next Priority
W2 dari backlog: monitoring token refresh — seberapa sering TICMI token expire dan berapa failure rate refresh, biar ada alert sebelum user kena error.
