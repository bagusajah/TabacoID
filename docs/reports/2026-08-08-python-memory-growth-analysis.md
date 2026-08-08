---
task_id: t_782b0de2
objective: OBJ-002
date: 2026-08-08
status: draft
---

# Memory Growth Analysis: Hermes Python Processes (43h Trend)

## Pertanyaan Engineering
Prior task t_53A33484 concluded "no leak" pada gateway memory, tapi hanya sample 4 jam window (670→638 MB transient drop). memory-baseline.log menunjukkan dua Hermes Python processes (dashboard + gateway) tumbuh signifikan: 1050→1464 MB combined dalam 43h. Apakah ini genuine leak atau bounded growth? Kapan OOM pressure terjadi?

## Method
1. Parse `memory-baseline.log` (87 data points, 43h span, 30-min intervals) untuk trend analysis
2. Identify step-jumps (>10MB/30min) untuk membedakan linear leak vs event-driven growth
3. Cross-reference dengan `/proc/<pid>/smaps_rollup` untuk PSS yang akurat (bukan ps RSS yang misleading)
4. Bandingkan dengan prior report t_53A33484 (Aug 7) yang sample hanya 4 jam
5. Project OOM timeline berdasarkan growth pattern

## Findings (with measurements)

### Process Identification
| Process | PID | Uptime | RSS (ps) | PSS_Anon (smaps) | Shared |
|---------|-----|--------|----------|-------------------|--------|
| Dashboard (`hermes_cli dashboard`) | 48118 | 5d 2h | 790 MB | 784 MB | 24 MB |
| Gateway (`hermes_cli gateway run`) | 515158 | 4d 2h | 674 MB | 666 MB | 25 MB |

### Growth Pattern: Step-Function, NOT Linear Leak

**Gateway (384→674 MB, +290 MB / 43h):**
- Flat at 384 MB for 5h, then **+176 MB jump at Aug 6 11:30** (correlates with agent task execution)
- Gradual +12-13 MB steps during evening activity (Aug 6 20:30, Aug 7 00:30, 08:30, 09:30)
- **FLAT at 671-674 MB for last 11 hours** (Aug 7 13:00 → Aug 8 00:00, zero growth)

**Dashboard (666→790 MB, +124 MB / 43h):**
- Gradual growth, not step jumps (+6-15 MB per active period)
- **FLAT at 728 MB for 16 hours** (Aug 7 00:00 → 16:00, zero growth)
- Then +62 MB during evening cron activity (Aug 7 16:00-00:00)

### Prior Report Error
t_53A33484 sampled gateway at 670→638 MB (4h window Aug 7 00:00-04:00) and saw -32 MB drop → concluded "no leak." **This was a transient GC dip.** The actual 43h trend shows +290 MB growth. However, the prior report's *conclusion* was partially correct: it's NOT a linear leak — it's event-driven residual allocation that doesn't fully GC.

### smaps_rollup vs ps RSS Discrepancy
Prior report claimed dashboard smaps RSS (600 MB) << ps RSS (790 MB). **Re-reading smaps_rollup fresh shows they match: smaps RSS = 809 MB, ps RSS = 809 MB.** The 190 MB "discrepancy" in the prior report was a measurement artifact (smaps_rollup is read-once; stale cached reads give wrong numbers).

### OOM Projection
Combined Python RSS: 1464 MB now. System has 7934 MB total, 4846 MB available.

- If growth were linear at 9.6 MB/h: OOM pressure (~1GB free) in ~15 days
- Actual pattern: growth correlates with agent task count, flattens during idle periods
- **Realistic projection: 7-14 days until dashboard exceeds 1 GB**, gateway may stabilize around 700 MB
- Risk level: **Medium-Low** — not immediate, but dashboard is the primary concern (unbounded upward trajectory)

## Decision
**Needs Monitoring + Scheduled Restart**

Bukan acute leak yang butuh immediate fix. Tapi ada residual allocation yang tidak ter-GC setelah agent sessions selesai — terutama di dashboard process. Mitigasi:

1. **Weekly scheduled restart** of both processes (recommended — systemd timer already has Restart=always, just need periodic trigger)
2. **Threshold-based restart**: jika RSS > 1 GB, auto-restart via health check
3. **Update memory-baseline.sh** untuk record PSS (bukan ps RSS) agar trend lebih akurat

Tidak ada code change needed. Ini operational decision.

## Risk
- **Low risk of immediate OOM** (system has 4.8 GB available)
- **Medium risk dalam 7-14 hari** jika dashboard growth pattern continues
- Restart will cause ~5 second downtime (acceptable — both have Restart=always)
- Tracemalloc drop-in exists for gateway (HERMES_GATEWAY_TRACEMALLOC=1) tapi belum produce snapshots karena gateway belum restart sejak drop-in added

## Lessons Learned
1. **4-hour sampling window is insufficient** untuk memory leak detection — prior report's false-negative came from sampling during a transient GC dip. Minimum 24h+ needed.
2. **Step-function growth ≠ leak**: jumps correlate dengan task/activity, then memory flattens. This is residual allocation (session state, caches) yang tidak fully released, bukan unbounded accumulation.
3. **smaps_rollup is read-once**: stale reads give misleading low numbers. Always fresh-read.
4. **ps RSS is adequate** untuk trend monitoring — discrepancy dengan smaps minimal (<25 MB shared pages)

## Next Priority
- Restart gateway + dashboard untuk activate tracemalloc snapshot (will reset growth to baseline)
- Set up weekly restart timer atau threshold-based auto-restart
- After restart, collect 7-day tracemalloc data untuk confirm growth pattern
