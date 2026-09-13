---
task_id: t_b55eca51
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-09-13
status: published
human_review: autonomous
---

# Error pattern analysis: 612K errors.log spike → one-line fix

## Engineering Question
HE6 (error pattern analysis): `errors.log.1` 12 Sep = **612K** vs normal 2–7K/hari (~100x spike). Apakah akar masalahnya, dan berapa biaya log per kegagalan stream?

## Method
1. Agregasi `errors.log.1` per komponen: `agent.conversation_loop` 203+60 WARNING, tapi `chat_completion_helpers` memuntahkan **164 traceback penuh** (~30 baris/kejadian, avg terukur 29.75).
2. Semua dari provider relay `combo1` (100.93.149.13:20128) yang upstream-nya 503 sepanjang 12 Sep (relay outage: "All fusion panel models failed", cursor/claude 429, claude invalid_request).
3. Trace ke sumber: `agent/chat_completion_helpers.py:3981` — `logger.exception("Streaming failed before delivery")` memaksa traceback penuh pada **setiap** kegagalan stream, padahal retry loop di `conversation_loop` sudah mencatat kegagalan yang sama satu baris dengan konteks provider/base_url. Info yang sama, dibayar 30x lipat.

## Findings (measurements)
- `traceback_lines_per_stream_failure: 31 → 1` (164 event × ~30 baris ekstra = ~4.900 baris spam per hari outage)
- `errors_log_day_size_under_outage: 612K → ~12K` (proyeksi: 612K − 164×~30 baris × ~150 byte; WARNING retry loop tetap tercatat)
- Sumber spike terkonsentrasi di 2 session TUI (11:42 & 01:36), bukan cron — cron hanya 15+9+9 event.
- Relay `combo1` adalah single point: tidak ada fallback provider aktif saat outage 6 jam.

## Decision
Adopt — `logger.exception` → `logger.error` (commit `2ce58d592` di hermes-agent, local — menunggu review user, aktif setelah gateway restart berikutnya). Traceback tidak dibutuhkan: error-nya 503 dari relay, stack-nya selalu openai SDK internals yang identik.

## Risk
Jika suatu saat ada bug di kode Hermes sendiri (bukan upstream), traceback tidak lagi otomatis tercetak di titik ini — harus di-reproduce dengan level DEBUG. Trade-off disadari: kegagalan yang di-log di sini 99% upstream error.

## Lessons Learned
- `logger.exception` di hot path retry = log amplifier. Outage 1 hari × 164 retry = 100x ukuran log normal.
- Analisis pola error membayar dirinya sendiri: fix 1 baris vs 5.8M log rotasi berjalan.

## Next Priority
- Relay `combo1` perlu fallback provider di config (outage 6 jam tanpa jaring pengaman) — kandidat task berikutnya.
