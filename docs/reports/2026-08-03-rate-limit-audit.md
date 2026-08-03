# Engineering Report: z.ai API Rate-Limit (429) Audit

**Date:** 2026-08-03
**Category:** Operations — Reliability & Cost Analysis
**Decision:** Adopt (methodology fix) + Needs Human Review (cron reschedule)

## Engineering Question

Seberapa sering dan seberapa parah rate-limit (429) errors dari z.ai API? Apakah ada pattern temporal yang bisa dioptimalkan?

## Method

Investigasi dimulai dari signal di `~/.hermes/logs/errors.log`: 17 baris berisi "429" dalam 7 hari terakhir, dengan cluster 6 hit tepat jam 14:00 WIB hari ini (saat cron cycle ini berjalan).

Tiga subagent paralel dispatched untuk investigasi mendalam:
1. **Root cause burst analysis** — analisis 429 cluster di jam 21:00 (1 Agustus) dan 14:00 (3 Agustus)
2. **Temporal & impact analysis** — distribusi temporal, retry behavior, user-visible impact
3. **Config & concurrency audit** — rate limit config, concurrent API callers, cron vs peak hours

Data diverifikasi sendiri dengan precise grep patterns.

## Findings (with measurements)

### Finding 1: Diagnostic Methodology Bug — 93.8% False Positive

| Grep Pattern | Match Count | Real 429? |
|---|---|---|
| `grep "429"` (bare) | 228 | ❌ 93.8% false positive |
| `grep -E "RateLimitError\|status=429\|HTTP 429"` | 14 | ✅ precise |

**Root cause:** Session ID `20260801_084542_4295b1` mengandung literal "429" di hex suffix. Setiap log line untuk session itu match `grep "429"`. Tambahan 17 hits dari token counts (misal `total=42902`).

**Impact:** Initial scan (skill step 2) melaporkan "17 rate-limit errors" — sebenarnya hanya **2-3 real 429 events** di `errors.log`. Diagnostic signal palsu yang bisa mengarah ke investigasi yang tidak perlu atau false alarm.

**Fix:** Gunakan `grep -E "RateLimitError|status=429|HTTP 429|Too Many Requests"` untuk scan rate limits, bukan bare `grep 429`.

### Finding 2: Real 429 Events — Rare and Fully Recovered

| Metric | Value |
|---|---|
| Real 429 events (7 hari) | 14 |
| Main-loop 429 (true throttle) | 2 (both pada 2026-08-03 14:00 WIB) |
| Auxiliary-vision 429 (code 1311) | 8 (GLM-5V-Turbo not in plan, auto-fallback) |
| Credential-pool exhaustion rotations | 4 |
| Retry sequences triggered | 1 |
| Retry success rate | **100%** (attempt 3/3 succeeded) |
| User-visible failures | **0** |
| Total turns analyzed | 319 |

**Latency cost:** Turn yang kena 429 (bg-review, 14:00 WIB) selesai dalam ~23 detik. Backoff dead time: ~6.9 detik (2.89s + 4.01s). Dibanding normal turn di session yang sama (~37s untuk 4 API calls), overhead 429: **~7 detik — negligible.**

### Finding 3: Finance Crons Run During z.ai Peak Hours ⚠️

z.ai Coding Plan: peak hours **14:00-18:00 UTC+8** = **13:00-17:00 WIB**. Off-peak preferred (3x quota cost during peak).

| Cron Job | Schedule (WIB) | UTC+8 | In Peak? |
|---|---|---|---|
| Hermes daily engineering | 07:00 daily | 06:00 | ✅ Off-peak |
| IDX Daily Digest | 16:00 weekdays | **15:00** | ❌ **PEAK** |
| IDX Insider Alert | 18:00 weekdays | **17:00** | ❌ **Peak boundary** |

Kedua finance crons mengkonsumsi 3x quota selama peak hours. IDX Daily Digest tepat di tengah peak window.

### Finding 4: Concurrency Surface

| Metric | Value |
|---|---|
| Unique `bg-review:` threads (7 hari) | 43 |
| Distinct ThreadPoolExecutor pools | 18 |
| Total threads touching API | 285 |
| `max_concurrent_children` config | unset (default: 3) |
| Client-side RPM throttle | **none** configured |
| GLM API keys | 1 (single key, no pool) |

Concurrency tidak menjadi masalah selama 7 hari terakhir (hanya 2 main-loop 429s), tapi surface area-nya besar: 43 background review workers + 18 thread pools, semua sharing satu API key.

## Metrics

```
429_grep_artifact_rate: 93.8% (228 bare grep → 14 real)
real_429_events_7d: 14
main_loop_429_throttle: 2
user_visible_failures: 0
retry_success_rate: 100%
429_latency_overhead: ~7s (single turn)
finance_crons_in_peak: 2/2 (100%)
daily_cron_in_peak: 0/1 (0%)
concurrent_api_callers_max: ~285 threads, 43 bg-review workers
api_keys: 1 (no pool)
```

## Decision

1. **Adopt** — Methodology fix: ganti diagnostic grep pattern dari bare `grep 429` ke `grep -E "RateLimitError|status=429|HTTP 429"`. Akan di-update di skill diagnostic commands.

2. **Needs Human Review** — Reschedule finance crons ke off-peak:
   - IDX Daily Digest: 16:00 → **11:00 WIB** (04:00 UTC+8, deep off-peak). IDX data untuk hari trading tersedia setelah market close (~15:30 WIB), jadi digest bisa jalan pagi hari berikutnya atau pre-market.
   - IDX Insider Alert: 18:00 → **19:00 WIB** (18:00 UTC+8, off-peak). Atau pindah ke 12:00 WIB siang.
   
   Catatan: IDX Insider Alert butuh data hari ini (same-day insider activity), jadi tidak bisa di-shift ke besok. 19:00 WIB aman — masih hari yang sama, off-peak, setelah market close.

3. **Reject (for now)** — Capping `max_concurrent_children` atau menambah RPM throttle. Evidence tidak menjustifikasi: hanya 2 throttle events dalam 319 turns (0.6%). Premature optimization.

## Risk

- **Cron reschedule** tidak otomatis dilakukan — ini mengubah workflow user (mungkin butuh digest tepat jam 16:00). Perlu konfirmasi.
- **Methodology fix** tidak ada risk — hanya mengubah cara kita membaca log.

## Lessons Learned

1. **Grep substring matching adalah pitfall klasik di log analysis.** Session IDs, hex hashes, dan token counts bisa mengandung angka yang match pattern kita. Selalu gunakan pattern yang precise (`status=429`, bukan bare `429`). Lesson ini applicable untuk semua future log analysis di skill ini.

2. **Skill constraint "avoid 14:00-18:00 UTC+8" benar tapi tidak lengkap.** Constraint itu ada untuk daily engineering cycle (07:00 WIB ✅), tapi **finance crons** violasi constraint yang sama. Constraint harus di-apply ke semua cron jobs, bukan hanya engineering cycle.

3. **Retry logic Hermes bekerja dengan baik.** 3-attempt exponential backoff (2.9s → 4s) recover 100% dari 429 events. Tidak perlu client-side RPM throttle dengan volume saat ini.

## Next Priority

1. **User decides on finance cron reschedule** (11:00 + 19:00 WIB recommended)
2. **Update skill diagnostic commands** — replace bare `grep 429` dengan precise pattern di step 2 signal scan
3. TICMI API caching experiment (backlog item 5) — baseline data sudah ada

## Files Changed This Cycle

1. `docs/reports/2026-08-03-rate-limit-audit.md` — laporan ini (baru)
2. `CHANGELOG.md` — entry rate-limit audit

## Subagent Usage

3 subagents paralel digunakan untuk investigasi:
- Task A: Root cause burst analysis (82s, 6 API calls)
- Task B: Temporal & impact analysis (88s, 8 API calls)
- Task C: Config & concurrency audit (64s, 5 API calls)

Subagent A dan B independently discovered grep artifact, yang kemudian diverifikasi sendiri. Subagent C menemukan cron peak-hour overlap — temuan engineering yang actionable.
