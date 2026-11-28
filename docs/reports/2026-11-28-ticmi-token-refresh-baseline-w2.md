---
task_id: t_a0b12798
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-28
status: published
human_review: autonomous
---

# W2 Baseline: TICMI Token Refresh Success Rate (webreader)

## Engineering Question
Seberapa sehat token refresh TICMI di webreader? Berapa sering token expire, berapa failure rate, dan apakah mekanisme self-heal bekerja tanpa intervensi?

## Method
Dump full log `docker logs -t webreader-api` (container up sejak 2026-11-21 02:02 UTC, restarts=0, 176 baris total). Analisis window 7 hari penuh siklus (21 Nov 02:02 → 28 Nov 02:02): hitung event `ticmi_token_refreshed` vs `ticmi_token_refresh_failed`, korelasi dengan error request (`upstream_error`), dan lacak `limitId` sebagai indikator sesi server-side.

## Findings

- **Konfigurasi refresh:** interval 8 jam (`refreshIntervalMs: 28800000`), `maxRetries: 6`. Slot terjadwal di window: 21 (3/hari × 7 hari).
- **Success rate: 19/21 = 90.5%** (19 refresh sukses, 2 gagal).
- **Episode gagal:** 22 Nov 10:02 & 18:02 UTC — `ticmi_login_failed: Something is wrong`. Kedua slot berturut-turut gagal, lalu **recovery otomatis** di slot berikutnya (23 Nov 02:02) tanpa intervensi. MTTR ≈ 8 jam (1 siklus).
- **Container uptime:** 7 hari 8 jam, 0 restart, webreader-api & webreader-nginx healthy.
- **`limitId` server-side:** naik 3168 → 3206 (21–25 Nov), lalu reset ke 0 sejak 25 Nov 18:02 — counter di sisi TICMI, bukan masalah lokal.
- **Error request (jawaban sebagian W3):** hanya 13 `upstream_error` dalam 7 hari, semua terkonsentrasi di satu burst 23 Nov 03:45–04:01 UTC (8× /history 403 WAF block, sisanya /insider-activity dsb). 0 error request sejak itu. Pola 403 WAF serupa terlihat di container lama (20 Nov) — Cloudflare memblok request berpola tertentu, bukan masalah token.
- **Volume log:** 176 baris / 7 hari — sistem sangat tenang.

## Decision
**Adopt.** Token manager sehat: 90.5% success rate dengan self-heal terbukti (dua kegagalan beruntun pulih sendiri dalam satu siklus). Tidak perlu tuning interval atau retry. Baseline ini jadi pembanding audit bulan depan; W3 (API error rate) terjawab sebagian: <2 error/hari, episodic.

## Risk
- Error `ticmi_login_failed: Something is wrong` mengingatkan pada pola 401 insider-activity yang persisten (entitlement akun) — kalau suatu hari kegagalan tidak self-heal dalam 1–2 siklus, itu sinyal credential/contract mismatch, bukan glitch. Monitoring pasif via log sudah cukup; belum ada alert otomatis (rotasi log docker default membatasi window historis).
- Log hanya bertahan selama rotasi json-file driver — baseline jangka panjang butuh snapshot berkala kalau mau tren bulanan.

## Lessons Learned
- 178 baris log cukup untuk menjawab dua backlog sekaligus (W2 penuh, W3 sebagian) — audit murah nggak harus menunggu monitoring instrument.
- Failure beruntun 2 slot diikuti recovery otomatis = desain retry (maxRetries 6) bekerja seperti diharapkan; tidak perlu tindakan.

## Next Priority
- W4 (Docker image size) atau W1 (container reliability formal) kalau ada slot berikutnya; t_a1128938 & t_b4cee954 masih menunggu approval user.
