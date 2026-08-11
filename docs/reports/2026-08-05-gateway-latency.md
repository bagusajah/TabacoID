---
human_review: autonomous
---

# Daily Report 2026-08-05 — Gateway Latency Profile

## Engineering Question
Berapa distribusi response latency Hermes Gateway, dan apa yang menyebabkan variance-nya?

## Method
Parsing 8 hari gateway log (28 Jul – 5 Aug 2026), extract semua `response ready` entries. Analisis distribusi latency, korelasi dengan jumlah API calls per response.

## Findings

**101 response samples**, semua platform WhatsApp, 8 hari.

### Distribusi Latency

| Metric | Value |
|--------|-------|
| Mean | 32.5s |
| Median | 19.6s |
| p50 | 19.6s |
| p75 | 35.6s |
| p90 | 62.7s |
| p95 | 74.0s |
| p99 | 146.7s |
| Min | 3.5s |
| Max | 575.5s |

### Bucket Distribution

| Range | Count | Pct |
|-------|-------|-----|
| <10s | 24 | 24% |
| 10-20s | 28 | 28% |
| 20-30s | 16 | 16% |
| 30-60s | 21 | 21% |
| 60-120s | 10 | 10% |
| >120s | 2 | 2% |

**52% response selesai dalam 20 detik.** 12% memakan waktu lebih dari 60 detik (UX buruk untuk chat).

### API Calls vs Latency

Korelasi kuat: **Pearson r = 0.793**.

| API Calls | n | Avg Latency | Min | Max |
|-----------|---|-------------|-----|-----|
| 1 | 27 | 11.7s | 3.5s | 33.8s |
| 2 | 25 | 20.1s | 4.7s | 146.7s |
| 3 | 13 | 19.0s | 10.5s | 27.2s |
| 4 | 10 | 34.1s | 16.3s | 62.7s |
| 5-6 | 10 | 34.5s | 23.7s | 45.1s |
| 7-9 | 9 | 51.3s | 24.7s | 68.7s |
| 13+ | 7 | 101.0s | 47.6s | 575.5s |

**Rata-rata per API call: median 7.1s, mean 9.1s.** Setiap additional API call menambah ~7-9 detik latency.

### Outlier
- **575.5s** (29 API calls, ~10 menit) — kemungkinan agent stuck dalam tool-calling loop tanpa konvergen.

### Scope RuntimeError
7x `RuntimeError: invalid argument: scope handle is not at the top of the stack` di errors.log. Ini relay runtime bug yang bisa menyebabkan response failure. Belum ada fix.

## Decision
**Needs Experiment** — data baseline terkumpul. Langkah selanjutnya:
1. Benchmark per-API-call latency breakdown (LLM inference vs tool execution vs relay overhead)
2. Investigasi scope RuntimeError — root cause di nemo_relay scope stack
3. Pertimbangkan max_turns guard yang lebih agresif (saat ini 150, sangat jauh di atas typical 1-13 calls)

## Risk
- Data hanya dari WhatsApp (101 samples, 1 user pattern)
- Log rotation belum terkonfigurasi — data hilang setelah gateway restart

## Lessons Learned
- Latency kuat ditentukan oleh jumlah API calls, bukan intrinsic LLM speed
- 150 max_iterations terlalu longgar — response 29 calls (10 menit) seharusnya di-cut lebih awal
- Perlu latency budget per interaction (target: p95 < 30s)

## Next Priority
- Investigasi scope RuntimeError (7x dalam 8 hari = bisa trigger response failure)
- Tambahkan max_turns guard yang lebih reasonable (30-40 calls)
- Breakdown latency per API call type (LLM vs tool execution)
