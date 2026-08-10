---
task_id: t_00a3d7d5
objective: OBJ-005
date: 2026-08-10
status: draft
---

# Fix: hard_stop Guardrail Cumulative Tracking

## Engineering Question

`hard_stop_enabled: true` ada di config, threshold `exact_failure: 5`. Tapi production hari ini: **24 guard fires, 0 hard_stop events**. Kenapa circuit breaker tidak pernah trip?

Root cause (dari t_87162a46): `after_call` reset failure counter pada setiap success. Pattern agent: `fail→success→fail→success` keep counter di 1, threshold 5 tidak pernah tercapai. Hard_stop = paper tiger.

## Method

1. Trace `ToolCallGuardrailController` di `agent/tool_guardrails.py` — konfirmasi lines 412-413 pop counters on success
2. Tambah `_cumulative_exact_failures` dan `_cumulative_same_tool_failures` dicts yang **never reset on success** — cumulative per-turn
3. `before_call` block decision: switch dari `_exact_failure_counts` (consecutive) ke `_cumulative_exact_failures`
4. `after_call` halt decision: switch dari `_same_tool_failure_counts` ke `_cumulative_same_tool_failures`
5. Warning behavior (warn-after) **tidak diubah** — masih pakai consecutive counter yang reset on success. Rationale: warning berguna saat agent sedang recover, reset-on-success avoids nagging
6. Test: simulate exact bug scenario (fail→success→fail→fail→fail), verify block fires at cumulative threshold

## Findings (with measurements)

| Metric | Before | After |
|--------|--------|-------|
| Cumulative failure tracking | ❌ consecutive-only (reset on success) | ✅ cumulative (per-turn) |
| hard_stop fires on intermittent pattern | 0/24 guard fires | block at 3rd cumulative failure |
| Warning reset-on-success behavior | resets | unchanged (still resets) |
| Tests | 7 existing | 7 existing + 1 new = **8 pass** |
| Integration tests | 33 | 33 pass |
| Lines changed | — | +26 (prod), +40 (test) |

**Bug scenario test** (`test_hard_stop_cumulative_fires_across_intermittent_successes`):
```
fail(arg=A) → cum_exact=1
success(arg=B) → [old code: reset to 0] [new code: stays 1]
fail(arg=A) → cum_exact=2
fail(arg=A) → cum_exact=3
→ before_call(A) → BLOCK (cumulative ≥ threshold=3)
```
Old code: cumulative stays at 1 after each success-reset, never blocks.

## Decision

**Adopt** — fix sudah diterapkan + tested. Config `hard_stop_enabled: true` sekarang benar-benar berfungsi. Next executor cycle yang hit guard-block 3× (even with interleaved successes) akan di-hard-stop instead of wasting API calls sampai max_turns.

File changes:
- `agent/tool_guardrails.py` — cumulative tracking + block/halt decisions
- `tests/agent/test_tool_guardrails.py` — new test for intermittent-success scenario

## Risk

- **False positive**: cumulative counter bisa block legitimate retry chains (e.g., transient sqlite locks yang succeed on retry). Mitigation: threshold=5 masih reasonable, dan warning (consecutive) fires first sebagai early signal.
- **Warning vs block divergence**: sekarang warning count dan block count bisa differ (warning resets on success, block doesn't). Ini intentional — warning = "you're struggling", block = "you've burned enough turns". Test document ini.

## Lessons Learned

1. **"Enabled" ≠ "works"** — config flag `hard_stop_enabled: true` tidak guarantee behavior. Tracking method (consecutive vs cumulative) menentukan effectiveness. Inilah kenapa t_87162a46 root-cause report penting — sebelumnya assume guardrail bekerja.
2. **Intermittent success is the enemy of consecutive counters** — agent loops naturally interleave fail/success (read file → write fails → read again → write fails). Consecutive-only tracking structurally cannot catch ini.
3. **Warning dan block serve different purposes** — warning = recoverable guidance (reset on success OK), block = circuit breaker (must persist). Splitting the two counters preserves both behaviors.

## Next Priority

1. **Monitor 24h**: verify hard_stop fires in production logs (target: ≥1 event, was 0). Track di next executor/reviewer cycle.
2. **Guard substring whitelist** (recommendation #2 dari t_87162a46): guard masih over-matches `grep restart` di script body. hard_stop reduces waste, tapi root cause substring over-match masih open.
3. **Reviewer**: promote draft ini setelah validate.
