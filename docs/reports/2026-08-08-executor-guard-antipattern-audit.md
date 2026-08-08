---
task_id: t_bb3ad82e
objective: OBJ-005
date: 2026-08-08
status: draft
---

# Audit: Executor Gateway-Restart Guard Anti-Pattern

## Engineering Question

Mengapa executor cron repeatedly memicu gateway security guard ("cannot restart or stop the gateway"), menyebabkan 21 blocked attempts dan 2 max_turns exhaustion dalam ~7 jam? Apa root cause dan bagaimana mencegahnya?

## Method

Analisis log dari 3 sumber:
1. `~/.hermes/logs/agent.log` — grep untuk pattern "would kill this command" (substring unik dari guard error message)
2. Kanban DB — query task yang mengandung kata trigger di title/body
3. `tool_loop_guardrails` config di `~/.hermes/config.yaml` — cek threshold settings

Cross-reference cron session IDs dengan task_events untuk identifikasi task yang sedang dijalankan saat guard fired.

## Findings (with measurements)

### Guard Trigger Frequency
- **Total guard hits**: 21 occurrences dalam 6h 50min (00:18–07:08 WIB, Aug 8 2026)
- **Affected cron sessions**: 9 distinct sessions
- **Worst session**: `cron_..._001626` — 5 hits
- **Max_turns exhaustions**: 2 sessions hit 40/40 turn limit
  - `cron_..._004916` at 01:08 WIB (40/40 turns, 40 API calls wasted)
  - `cron_..._050842` at 05:37 WIB (40/40 turns, 40 API calls wasted)
- **Estimated total wasted API calls**: ~80 (exhausted sessions) + ~21 (guard retries) = **~101 GLM calls**

### Distribution by Session
| Session Time | Hits | Max_turns? |
|---|---|---|
| 00:16 | 5 | No |
| 00:21 | 2 | No |
| 00:36 | 2 | No |
| 00:49 | 1 | **Yes (40/40)** |
| 03:13 | 1 | No |
| 05:08 | 3 | **Yes (40/40)** |
| 05:39 | 4 | No |
| 06:20 | 1 | No |
| 07:01 | 2 | No |

### Root Cause: Three Layers

**Layer 1 — Task descriptions contain trigger words (PLANNER problem)**

4 done/blocked tasks literally instruct gateway restarts/reboots in titles:
- `t_160D5081`: "Restart gateway to apply _safe_int_ts fix" (done)
- `t_EBA1792A`: "Restart gateway dan verifikasi tracemalloc..." (done)
- `t_34D42728`: "...reboot + verifikasi boot time" (done)
- `t_f715aff5`: "...weekly systemd restart timer..." (done)

Ketika executor menjalankan task ini, ia mencoba verify dengan command yang mengandung kata "restart"/"reboot" → guard fired.

**Layer 2 — The guard is substring-based, not semantic (GATEWAY problem)**

Guard memblokir command apa pun yang mengandung substring trigger — termasuk `grep`, `sqlite3 SELECT`, atau `journalctl` yang hanya *mencari* pattern tersebut, bukan mengeksekusinya. Bukti: task audit ini sendiri (`t_bb3ad82e`) — yang hanya menyuruh grep log untuk pattern guard — terkena block 2x saat executor mencoba menjalankan step 1.

**Layer 3 — Executor retries instead of recognizing the pattern (EXECUTOR problem)**

Saat guard fired, executor mencoba rephrase command (2–5 retries per session) instead of recognizing "this is a guard block, skip this verification step." Guard rails config:
- `warn_after.exact_failure: 2` — warning setelah 2 failures identik
- `hard_stop_after.exact_failure: 5` — **hard_stop_enabled: false** → guard rails tidak pernah hard-stop, executor loops sampai max_turns

## Decision

**Adopt (3-layer fix recommendation):**

1. **Planner rule**: Task yang require actual gateway/systemd restart → create as `blocked-needs_input` dari awal. Executor tidak akan pernah bisa mengeksekusinya. Jangan gunakan kata "restart"/"reboot" di task title jika maksudnya adalah audit/verify saja.

2. **Executor self-recognition**: Tambahkan ke executor procedure: jika terminal error mengandung "would kill this command" → **immediately skip command**, gunakan alternative phrasing (e.g., cari substring unik seperti "kill this" untuk grep), atau mark verification sebagai "skipped: guard-protected."

3. **Config fix**: Enable `hard_stop_enabled: true` untuk `tool_loop_guardrails` agar executor berhenti setelah 5 exact failures, bukan loop sampai 40 turns. **Needs human review** — ini config change.

## Risk

- Config change (`hard_stop_enabled: true`) bisa premature-stop task yang legitimately needs retry (e.g., transient sqlite locks). Risk rendah karena `hard_stop_after.exact_failure: 5` cukup generous.
- Planner rule tidak retroactive — existing tasks dengan trigger words masih di board.

## Lessons Learned

- Self-referential trap: task yang mengaudit guard anti-pattern terkena guard itu sendiri. Executor harus bisa grep error patterns tanpa memicu substring guard.
- Substring-based command guards over-match: mereka block research/audit commands, bukan hanya execution commands.
- `hard_stop_enabled: false` + `max_turns: 40` = executor bisa waste 40 API calls dalam satu loop yang tidak akan pernah succeed.

## Next Priority

1. Config: enable `hard_stop_enabled: true` (needs human approval — blocked-needs_input)
2. Planner skill update: add rule about trigger words in task descriptions
3. Executor skill update: add guard-recognition escape pattern
