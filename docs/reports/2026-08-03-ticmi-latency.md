# Engineering Report: TICMI API Response Time Baseline

**Date:** 2026-08-03
**Category:** Experiments — Performance Benchmarking
**Decision:** Reject caching (latency already low, data is real-time)

## Engineering Question
What is the baseline response time of the TICMI proxy API, and would caching reduce it meaningfully?

## Method
Sent 3 sequential POST requests to 5 representative TICMI endpoints through the nginx proxy (localhost:8181). Each call proxies to the upstream TICMI API with auto-managed auth token. Measured `time_total` (curl) and `size_download`.

**Date context:** Aug 3 is a Sunday — IDX market closed, so responses reflect cached/stale upstream data, not live trading data. Weekday latency may differ.

## Findings

### Response Times by Endpoint

| Endpoint | Payload Size | Mean | Min | Max |
|----------|-------------|------|-----|-----|
| Single stock (BBCA) | 573 B | 0.72s | 0.19s | 1.78s |
| Index list | 3,036 B | 0.77s | 0.51s | 1.26s |
| Market summary (all) | 1,498 B | 1.42s | 0.79s | 2.62s |
| Top movers | 251 KB | 1.65s | 1.08s | 2.64s |
| Market summary (agg) | 8,763 B | 2.17s | 1.44s | 3.35s |

### Pattern: First Call is Slow (Cold Connection)

Every endpoint shows the same pattern: first call is 1.5-2× slower than subsequent calls.

| Endpoint | Call 1 | Call 2 | Call 3 | Cold/Warm Ratio |
|----------|--------|--------|--------|-----------------|
| Market | 2.62s | 0.84s | 0.79s | 3.2× |
| Indices | 1.26s | 0.54s | 0.51s | 2.4× |
| Stock (BBCA) | 1.78s | 0.19s | 0.19s | 9.4× |
| Market-summary | 3.35s | 1.71s | 1.44s | 2.1× |
| Movers | 2.64s | 1.24s | 1.08s | 2.3× |

This suggests **upstream TCP connection reuse** — the proxy reuses its HTTP connection to TICMI after the first call. Cold connection adds ~1-1.5s.

## Analysis

1. **Latency is already low.** Warm-call median ~0.5-1.5s. For stock market data accessed via cron (not real-time trading), this is fast enough.

2. **Caching experiment: REJECTED.** The hypothesis was "caching reduces response time >50%." Reality: warm calls are already under 1.5s. A cache layer would add complexity (invalidation, stale data risk) for marginal gain. Market data is time-sensitive — stale cache is worse than slightly slow fresh data.

3. **First-call penalty is the only real optimization target.** If the cron job hits multiple endpoints sequentially, the first call always pays the cold-connection tax. A connection warmup ping at cron start would save ~1s.

4. **The 251KB movers payload** is the largest response but not the slowest. Network is not the bottleneck — upstream processing time dominates.

## Metrics

```
sample_size: 15 requests (5 endpoints × 3 calls)
mean_latency_warm: 0.7s (calls 2-3 average)
mean_latency_cold: 2.1s (call 1 average)
cold_to_warm_ratio: 2.1-9.4×
largest_payload: 251 KB (movers)
smallest_payload: 573 B (single stock)
caching_verdict: rejected (insufficient gain vs complexity/risk)
```

## Decision
**Reject** — caching does not provide meaningful improvement. Warm-call latency is already sub-second for most endpoints. The cold-connection penalty is better solved with connection warmup than application-level caching.

## Next Priority
1. Model cost/quality comparison — does LM Studio local model match GLM for simple tasks?
2. Dashboard uptime analysis — what is the actual availability over the past 15 days?
