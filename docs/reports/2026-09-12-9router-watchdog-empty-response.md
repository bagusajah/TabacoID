---
task_id: t_b569ac70
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-12
status: published
human_review: autonomous
---

# 9router watchdog: menutup blind spot "200-but-empty" yang bikin cron session mati diam-diam

## Engineering Question
Watchdog 9router (`/v1/models`, cron */5m) bilang router sehat, tapi 3/3 cron session hari ini kena "Empty response" retry-loop dan session Daily Focus 09:00 mati tanpa produk. Mode kegagalan apa yang tidak terdeteksi, dan berapa biaya menutupnya?

## Method
1. Scan `~/.hermes/logs/errors.log`: hitung event "Empty response" per session + verifikasi asal baris (conversation_loop vs tool-output echo — pitfall 2026-08-10).
2. Audit `9router-watchdog.sh`: satu-satunya health signal = `GET /v1/models` → grep `"object":"list"`. Endpoint models dijawab oleh router sendiri, bukan backend chat → probe hijau walau backend combo1 balas kosong.
3. Tambah state machine kedua (DEGRADED) berbasis scan errors.log: event `conversation_loop: Empty response after 3 retries` usia <15 menit → alert Telegram sekali per episode; auto-clear setelah 30 menit sepi. Echo-guard: baris `tool_executor` di-exclude supaya grep self-echo tidak jadi false positive.
4. Self-test 4 skenario (`9router-watchdog-test.sh`) dengan synthetic log + dummy token — alert teramati via state file, bukan spam Telegram.

## Findings (measurements)
- **empty_response_events_today: 10 events / 3 sessions** — 2 session exhausted 3-retry (Focus 09:00 mati tanpa report; Builder 09:05 selamat via fallback zai).
- **failure_mode_coverage: 1 → 2** (DOWN only → DOWN + DEGRADED).
- **detection_latency: ∞ → ≤5 menit** (sebelumnya: tidak pernah terdeteksi; kini cron */5 menangkapnya dalam satu interval).
- **probe_cost: +0 request** (deteksi baca log lokal, bukan LLM call).
- Self-test: **4/4 PASS** (T1 recent→alert, T2 young-state→kept, T3 aged→cleared, T4 echo-only→no false positive). Live-run pasca-deploy: exit 0, no alert (event terakhir 09:06 sudah >15 menit — benar).
- Bonus (backlog HE1): memory penuh (2.068/2.200, write ditolak 04:03) sudah terpangkas ke **1.700/2.200 (77%)** oleh konsolidasi run 09:04; USER.md 962/1.375 (70%). Pantau saja sekarang.

## Decision
Adopt — sudah live (cron entry tidak berubah, path sama). DOWN dan DEGRADED tidak double-alert (hard down subsumes).

## Risk
- Pattern `Empty response after 3 retries` menempel implementasi logging Hermes — kalau format log berubah, deteksi diam-diam gagal. Mitigasi murah: test script bisa dijalankan ulang kapan saja.
- State file `/tmp` hilang saat reboot → worst case satu alert ekstra. Bukan masalah.

## Lessons Learned
- Health check yang hanya menyentuh control-plane endpoint (`/v1/models`) tidak melihat data-plane failure. "Bisa connect" ≠ "bisa jawab".
- Log aplikasi adalah sinyal gangguan paling murah yang sudah dibayar — sebelum bikin probe baru, cek dulu apa yang sudah tercatat.

## Next Priority
- Kalau DEGRADED alert muncul lagi >2×/minggu, naikkan: pertimbangkan auto-switch default model di config cron ke fallback zai selama episode (butuh edit config + restart, wajib human review).
- [FLOOR-EMPTY: tabacoID-website] — scan website hari ini sehat semua (sitemap 4/4 route, meta description segar, og:image ada); tidak ada sinyal kerja website nyata, jadi tidak dibuat-buat task floor.
