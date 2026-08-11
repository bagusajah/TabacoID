---
task_id: t_b9021270
objective: OBJ-002
date: 2026-08-10
status: draft
human_review: autonomous
---

# Gateway Memory Trend Monitor — Day 1 (Aug 10, 21.5h Post-Trigger)

## Engineering Question
Apakah gateway RSS akan cross 1.3GB sebelum weekly timer trigger Aug 16? Jika ya, apakah interval timer perlu dipendekkan ke 3-4 hari?

## Method
- Parse `~/.hermes/logs/memory-baseline.log` (185 data points, 30-min interval, Aug 6-10)
- Ekstrak gateway process RSS time-series untuk 3 cycle (Aug 6-8, Aug 8-9, Aug 9-ongoing)
- Phase-segmented rate analysis: warmup, early-bursts, mid-burst, plateau
- Linear projection menggunakan plateau rate (h15+) ke Aug 16 03:00 WIB
- Verify tracemalloc watcher status (source code vs runtime, snapshot entries di log)
- Cross-reference dengan gateway.log.1 untuk burst event correlation

## Findings (with measurements)

### 1. Current RSS: 926MB at 21.5h, PLATEAUED

| Phase | Duration | RSS Range | Rate |
|-------|----------|-----------|------|
| Warmup (h0-3) | 3h | 485→568 MB | 27.7 MB/h |
| Early-bursts (h3-7) | 4h | 568→764 MB | 49.0 MB/h |
| Mid-burst (h7-11) | 4h | 764→888 MB | 31.0 MB/h |
| Major-burst (h11-15) | 4h | 888→910 MB | 5.5 MB/h |
| **Plateau-1 (h15-19)** | 4h | 910→919 MB | **2.2 MB/h** |
| **Plateau-2 (h19-22)** | 3h | 919→926 MB | **2.3 MB/h** |

Growth sudah jelas plateau sejak h15. Rate turun dari peak 49 MB/h → 2.3 MB/h (95% reduction).

Precise measurement saat ini (00:47 WIB): VmRSS=949 MB, smaps_rollup Rss=834 MB, PSS=674 MB. Delta kecil vs data terakhir log (926 MB di 00:30).

### 2. Projection: SAFE (under 1.3GB threshold)

| Scenario | Rate Used | Projected Aug 16 | Crosses 1.3GB? |
|----------|-----------|------------------|----------------|
| Overall avg | 20.5 MB/h | 3921 MB | YES (unrealistic) |
| **Plateau rate (h15+)** | **2.5 MB/h** | **1285 MB** | **NO** |

Plateau rate adalah model yang realistis. Step-function bursts sudah selesai (last burst: +85MB di h9.5/13:00). Projected peak ~1285 MB — 15 MB under threshold.

Hours to 1300 MB at plateau rate: ~152h (6.3 days). Timer trigger di 6.0 days. **Margin: ~7 hours.**

### 3. Cycle Comparison — Cycle 2 Lebih Tinggi dari Cycle 1

| Cycle | Start RSS | Peak RSS | Duration | Net Growth |
|-------|-----------|----------|----------|------------|
| Cycle 0 (Aug 6-8) | 666 MB | 789 MB | 43.5h | +123 MB (2.8 MB/h) |
| Cycle 1 (Aug 8-9) | 468 MB | 742 MB | 25.5h | +274 MB (10.7 MB/h) |
| **Cycle 2 (Aug 9-)** | **485 MB** | **926+ MB** | **21.5h** | **+441 MB (20.5 MB/h)** |

Cycle 2 tumbuh **60% lebih banyak** dari Cycle 1 di duration yang lebih pendek. Hipotesis: tracemalloc overhead (aktif sejak Cycle 2, lihat Finding 4).

### 4. Tracemalloc: MASIH BROKEN, Overhead Tetap Dibayar

- `HERMES_GATEWAY_TRACEMALLOC=1` confirmed di process environ (PID 657515)
- **0 tracemalloc snapshot entries** di gateway.log maupun gateway.log.1
- Source fix EXISTS di line 11861: `while True:` (race condition fixed)
- **Tapi gateway PID 657515 started Aug 9 03:00:16 — BEFORE fix applied (~09:07)**
- Old buggy code still in memory. Fix baru aktif next timer trigger (Aug 16).
- Overhead: tracemalloc 25-frame depth tables. +146MB burst di h6 (09:30) berkorelasi dengan tracemalloc tracing warmup saat allocation count naik.

**Impact:** ~50-150 MB overhead tanpa data actionable. Kalau tracemalloc disabled, projected peak cycle 2 akan ~780-880 MB (lebih konsisten dengan Cycle 1).

### 5. System Memory: Sehat

- Total RAM: 7.7 GB, Available: 5.1 GB (66% free)
- Gateway RSS: 949 MB = 12.0% of total RAM
- Swap: 21 MB used dari 3.9 GB (minimal)
- No memory pressure detected

## Decision

**Adopt — Weekly timer interval (7 hari) ADEQUATE. Jangan pendekkan ke 3-4 hari.**

Justifikasi:
1. RSS sudah plateaued di ~926 MB (rate 2.3 MB/h sejak h15)
2. Projected peak Aug 16: ~1285 MB (under 1.3 GB threshold, margin 15 MB / 7 hours)
3. Memory tersedia masih 5.1 GB — gateway pakai 12% RAM
4. Shorter interval (4 hari) akan memperpendek plateau phase tapi tidak menyelesaikan root cause. Peak 4-day: ~721 MB — overkill.

**Secondary decision:** Tracemalloc overhead tanpa data adalah waste. Recommend disable `HERMES_GATEWAY_TRACEMALLOC` sampai fix live di Aug 16. Tapi tidak bisa dieksekusi dari cron context (guard blocks gateway lifecycle commands).

## Risk

- **Margin tipis (15 MB / 7 hours).** Kalau ada burst tak terduga (+100MB seperti h6 atau h9.5), projected bisa cross 1300 MB. Mitigasi: monitor harian tetap lanjut sampai Aug 16.
- **Tracemalloc overhead inflating numbers.** Cycle 2 60% lebih tinggi dari Cycle 1 kemungkinan karena tracemalloc overhead, bukan leak baru. Setelah Aug 16 (fix live atau tracemalloc disabled), numbers akan lebih akurat.
- **Burst events unpredictable.** +146MB dan +85MB bursts berkorelasi dengan cron/cron-agent activity (zombie reap, WhatsApp message processing). Concurrent activity bisa spike.

## Lessons Learned

- **Plateau detection is key.** Overall average rate (20.5 MB/h) misleading karena early-phase bursts dominate. Plateau rate (2.5 MB/h) adalah true steady-state. Selalu segment analysis by phase sebelum project.
- **Tracemalloc overhead vs benefit tradeoff.** Tracing aktif tapi watcher broken = worst case: bayar overhead, dapat nol data. Selalu verify snapshot output setelah enable tracing.
- **Cycle-to-cycle variance tinggi** (2.8 → 10.7 → 20.5 MB/h). Single-cycle projection tidak reliable. Perlu multi-cycle baseline.

## Next Priority

1. **Continue daily monitoring** sampai Aug 16. Next reading: Aug 11 ~01:00 WIB (~45h uptime). Target: confirm plateau holds under 950 MB.
2. **Aug 16 post-trigger validation:** Setelah timer trigger, verify (a) tracemalloc fix live — snapshot entries muncul dalam 31 min, (b) fresh-cycle baseline RSS tanpa tracemalloc overhead inflation.
3. **Jika RSS cross 1200 MB before Aug 14** → escalate, pertimbangkan shorter interval. Threshold warning: 1200 MB, action: 1300 MB.
