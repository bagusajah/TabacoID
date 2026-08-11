---
task_id: t_87440710
objective: OBJ-005
date: 2026-08-08
status: draft
human_review: autonomous
---

# Enable tool_loop_guardrails hard_stop to Prevent 40-Turn Waste Loops

## Engineering Question

Apakah enabling `hard_stop_enabled: true` di `tool_loop_guardrails` config dapat mencegah executor dari looping sampai 40 turns (max_turns exhaustion) saat terminal command terkena security guard block?

## Method

1. Read audit report `docs/reports/draft/2026-08-08-executor-guard-antipattern-audit.md` (task t_bb3ad82e) untuk baseline data.
2. Verify current config state di `~/.hermes/config.yaml` line 74.
3. Apply config change: `hard_stop_enabled: false → true` (1-line sed edit).
4. Verify config parses correctly via `yaml.safe_load`.
5. Trace config loading path di source code untuk confirm no gateway restart needed.
6. Count baseline `max_turns` occurrences di agent.log sebagai before-metric.

## Findings (with measurements)

### Before State
- `hard_stop_enabled: false` — guard rails hanya warn, tidak pernah hard-stop
- **27 `max_turns` exhaustions** di `~/.hermes/logs/agent.log` (lifetime counter)
- Audit t_bb3ad82e documented: **2 max_turns exhaustions dalam ~7 jam** (Aug 8), masing-masing 40/40 turns = **~80 API calls wasted** dalam satu malam
- Total guard-related waste: **~101 GLM API calls** dalam 7 jam window

### Config Change Applied
```diff
 tool_loop_guardrails:
   warnings_enabled: true
-  hard_stop_enabled: false
+  hard_stop_enabled: true
   warn_after:
     exact_failure: 2
     same_tool_failure: 3
```

Threshold tetap: `hard_stop_after.exact_failure: 5` → executor akan berhenti setelah **5 exact-failure retries** (was: loop sampai 40 turns).

### Expected Impact (after → projected)
- Max_turns exhaustions dari exact-failure loops: **0** (5 retries → hard stop vs 40 turns → exhaustion)
- Wasted API calls per stuck session: **~5** (was: ~40) = **87.5% reduction**
- Config read per-session via `ToolCallGuardrailConfig.from_mapping()` — **no gateway restart needed**, takes effect on next cron run.

### Config Loading Verified
- `agent/tool_guardrails.py:85` — `from_mapping()` reads `tool_loop_guardrails` section dari config.yaml
- Called at session init, not cached di gateway process → next cron session (every 1min) picks up change automatically.
- Gateway PID 1857 tetap running, config change hot-loaded per-session.

## Decision

**Adopt.** Config applied immediately. Within Hermes self-improvement remit (tool usage policy). 1-line change, clear rollback path, addresses root cause identified di audit t_bb3ad82e.

Threshold 5 retries cukup untuk legitimate transient failures (2 retries untuk flaky network, 3 retries untuk rephrasing), tapi caps waste di ~5 API calls instead of ~40.

## Risk

- **Low.** If legitimate retry pattern needs >5 attempts (unlikely), executor akan hard-stop prematurely. Mitigation: threshold configurable, dapat dinaikkan ke 7-8 jika false-positive.
- **Rollback**: `sed -i 's/hard_stop_enabled: true/hard_stop_enabled: false/' ~/.hermes/config.yaml`
- Tidak ada impact ke normal operation — hanya fires kalau exact-same terminal command fails 5x berturut-turut, yang itu sendiri adalah anti-pattern.

## Lessons Learned

- Guard rails tanpa hard_stop = alarm tanpa sprinkler. Warning-only config adalah "security theater" untuk loop prevention — executor ignores warnings dan keeps retrying.
- Audit-first approach (t_bb3ad82e) sebelum fix (t_87440710) bekerja dengan baik: root cause analysis drove precise 1-line fix instead of speculative multi-layer refactor.

## Next Priority

Monitor agent.log selama 24-48 jam berikutnya. Jika max_turns exhaustions dari exact-failure pattern = 0 → fix confirmed. Jika masih ada → investigate apakah exhaustion berasal dari pattern lain (same_tool_failure, idempotent_no_progress) yang threshold-nya juga perlu review.
