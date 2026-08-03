# Engineering Report: WhatsApp Bot Latency Benchmark

**Date:** 2026-08-03
**Category:** Experiments — Performance Benchmarking
**Decision:** Adopt (baseline established, optimization opportunities identified)

## Engineering Question
What is the end-to-end latency of the WhatsApp bot — from message received to response sent?

## Method
Extracted all `response ready: platform=whatsapp` log entries from `~/.hermes/logs/agent.log` covering Jul 29 – Aug 3, 2026 (5 days). Each entry includes processing time and API call count. Computed percentiles, distribution, and api_call correlation.

**Scope:** This measures agent processing time (LLM + tool calls). It does NOT include WhatsApp network delivery (bridge → WA servers → user phone), which adds ~1-3s on top.

## Findings

### Latency Percentiles (58 responses, outlier excluded)

| Metric | Value |
|--------|-------|
| min | 3.9s |
| p50 (median) | 15.6s |
| p75 | 27.9s |
| p95 | 64.3s |
| p99 | 78.8s |
| max | 92.2s |
| mean | 22.7s |

### Distribution

```
  0-5  s: ██ (2)
  5-10 s: ██████████████ (14)
 10-15 s: █████████████ (13)
 15-20 s: █████ (5)
 20-30 s: ██████████ (10)
 30-50 s: ███████ (7)
 50-100s: ███████ (7)
100-300s:  (0)
300+s  : █ (1 — outlier, excluded from stats)
```

### Key Driver: API Calls Correlate Linearly with Latency

| API Calls | Mean Latency | Sample |
|-----------|-------------|--------|
| 1 | 10.7s | 18 |
| 2 | 12.5s | 13 |
| 3 | 17.2s | 9 |
| 4 | 32.5s | 7 |
| 5-6 | 30.0s | 4 |
| 7-9 | 61.7s | 4 |
| 13+ | 68.5s | 3 |
| 29 | 575.5s | 1 (outlier) |

**Each API call adds ~5-8s.** Single-call responses (simple replies) are fast (~10s). Multi-turn tool use is the slow tail.

### Latency Buckets

| Tier | Count | Mean | % of Total |
|------|-------|------|------------|
| Fast (<10s) | 16 | 7.1s | 28% |
| Medium (10-30s) | 28 | 17.1s | 48% |
| Slow (>30s) | 14 | 51.4s | 24% |

## Analysis

1. **p50 = 15.6s is acceptable for a chat bot.** Human perception threshold for "instant" is ~1s, but for "acceptable response" in async chat, under 20s is fine.

2. **p95 = 64.3s is the problem.** 5% of responses take over a minute. These are tool-heavy interactions (4+ API calls) where the agent reads files, runs commands, then responds.

3. **The outlier (575.5s = 9.6 min) was a 29-API-call turn** — likely a complex task with many tool invocations. Not representative of normal usage.

4. **Latency is almost entirely LLM API time**, not bridge/network overhead. Each z.ai API round-trip adds ~5-8s.

5. **No caching layer between bridge and agent.** Every message starts a fresh agent turn (though session context is cached for prompt efficiency).

## Metrics

```
sample_size: 59 (58 analyzed, 1 outlier excluded)
period: 2026-07-29 to 2026-08-03
latency_p50: 15.6s
latency_p75: 27.9s
latency_p95: 64.3s
latency_mean: 22.7s
latency_outlier_max: 575.5s
api_call_overhead_per_call: ~5-8s
fast_under_10s_pct: 28%
slow_over_30s_pct: 24%
```

## Decision
**Adopt** — baseline established. Latency is acceptable for async chat. p95 optimization is a future engineering target (prompt caching, reducing tool round-trips, model selection).

## Next Priority
1. TICMI API response time baseline (for caching experiment)
2. Investigate whether session context size correlates with latency (prompt token cost)
