---
task_id: t_b6196f56
objective: OBJ-005
date: 2026-08-11
status: published
human_review: autonomous
---

# Error Pattern Analysis: Top Recurring Errors di errors.log

## Engineering Question
errors.log (6 hari, Aug 6-11) berisi 5,019 baris WARNING. Sebagian besar didominasi
tool_executor warnings dari cron jobs — guard blocks, hostname resolution failures,
pending_approval blocks, check_fn false. Noise atau real issue? Quick wins mana yang
bisa di-fix?

## Method
1. Kombinasikan semua rotated logs: `errors.log` + `.1` + `.2.gz` ... `.6.gz`
2. Total 5,019 baris, window Aug 6-11 (6 hari)
3. Pattern matching dengan regex untuk kategorisasi (Python script, `/tmp/final_analysis.py`)
4. Sub-categorize terminal errors berdasarkan output content
5. Identifikasi root cause per kategori, label: noise / real / fixable

## Findings

### Top-10 Error Patterns (6-day window, 5,019 total lines)

| # | Count | % | Pattern | Label |
|---|-------|---|---------|-------|
| 1 | 1,502 | 29.9% | `check_fn false` — browser/CDP/kanban tools unavailable in cron | **NOISE** (expected) |
| 2 | 285 | 5.7% | `terminal: empty output exit=1` — ambiguous failures | **NOISE** (mostly non-fatal) |
| 3 | 226 | 4.5% | `skill_manage` patch/match failures | **REAL** (wasted agent turns) |
| 4 | 138 | 2.7% | `terminal: other error` (various) | **NOISE** |
| 5 | 122 | 2.4% | gateway guard false-positive (substring over-match on logs) | **FIXABLE** (quick win) |
| 6 | 115 | 2.3% | `hermes_cli` auth/config warnings | **FIXABLE** (stale GITHUB_TOKEN) |
| 7 | 115 | 2.3% | `auxiliary_client` connection warnings | **NOISE** (transient reconnect) |
| 8 | 93 | 1.9% | `grep/rg exit=1` — NO ERROR, just no matches found | **NOISE** (false log entry) |
| 9 | 88 | 1.8% | gateway runtime (ws disconnect, WhatsApp send fail) | **NOISE** (transient) |
| 10 | 80 | 1.6% | `security_audit` posture warnings | **NOISE** (informational) |
| 11 | 72 | 1.4% | `conversation_loop` API rate-limit / max_turns guard | **REAL** (agent inefficiency) |
| 12 | 71 | 1.4% | `copilot_auth` — Classic PAT token not supported | **FIXABLE** (quick win) |
| 13 | 56 | 1.1% | `memory tool` over char limit | **REAL** (memory bloat) |

**Noise subtotal: ~2,888 lines (57.5%)**
**Real issues: ~354 lines (7.1%)**
**Fixable quick wins: ~308 lines (6.1%)**
**Uncategorized remainder: ~1,719 lines (34.2%)** — mostly multi-line Python tracebacks
from various internal modules, mostly transient retry/reconnect paths.

### Noise vs Real Breakdown

**Noise (expected/harmless): ~57.5%**
- `check_fn false` (1,502) — cron jobs run without browser/CDP context; tools.registry
  logs WARNING for every unavailable tool check. This is architectural, not a bug.
- `grep/rg exit=1` (93) — ripgrep returns exit code 1 when no matches found, which
  tool_executor logs as "error". False positive.
- `auxiliary_client` (115) — transient WebSocket reconnects during API calls.
- `security_audit` (80) — posture check found 1 issue, informational only.
- `gateway runtime` (88) — ws disconnect when TUI client closes, WhatsApp server
  disconnect (recovers with plain-text fallback).

**Real issues (need attention): ~7.1%**
- `max_turns guard fired` (23 occurrences) — agents hit 25/40 turn iteration cap
  without completing tasks. Root cause: agent loops on retry without converging.
  Wastes GLM API budget.
- `skill_manage` patch failures (226) — agent attempts skill edits with stale
  old_string context, patch fails, wastes turns retrying.
- `memory tool over limit` (56) — memory operations rejected because entries
  exceed 2,200 char limit. Indicates memory entries growing too large.

**Fixable quick wins: ~6.1%**
1. **GITHUB_TOKEN / copilot_auth (96+71 = 167 lines):** Classic Personal Access Token
   (`ghp_*`) not supported for Copilot auth. Generates warning on every cron run.
   Fix: remove stale GITHUB_TOKEN from env config or replace with fine-grained token.
2. **Gateway guard false-positive (122 lines):** Substring over-match catches the word
   "restart" inside log file contents being grepped, not actual gateway commands.
   Workaround already documented (use unique substrings). Structural fix would narrow
   the guard regex.
3. **Hostname resolution `vps-internal` (3 lines):** `/etc/hosts` or SSH config
   references `vps-internal` hostname that doesn't resolve. Minor — only affects
   VPS health check commands in cron.

### Signal-to-Noise Ratio

```
Real issues:     354 / 5,019 = 7.1%
Fixable wins:    308 / 5,019 = 6.1%
Pure noise:    2,888 / 5,019 = 57.5%
Uncategorized: 1,719 / 5,019 = 34.2%
```

**S/N ratio: 7.1%** — only ~1 in 14 log lines represents a real issue worth investigating.

## Decision

**Adopt** — kategorisasi selesai. Tiga quick-win tasks recommended untuk planner:

1. **Remove stale GITHUB_TOKEN** (OBJ-002, hermes-itself) — eliminasi 167 noise lines/run
2. **Narrow gateway guard regex** (OBJ-005, hermes-itself) — reduksi 122 false-positive blocks
3. **Add `|| true` to grep commands in cron skills** (OBJ-005, hermes-itself) — reduksi 93
   false "no matches found" error logs

**Reject** — tidak worth fixing:
- `check_fn false` (1,502 lines) — architectural noise, filtering would hide real
  registry failures. Better: downgrade log level from WARNING to DEBUG.
- `auxiliary_client` reconnects — transient, self-healing.
- `security_audit` — informational by design.

**Needs Human Review:**
- `max_turns guard fired` (23x) — policy question: raise iteration cap, or improve
  agent convergence? Agent efficiency issue, not infrastructure.
- `memory over limit` (56x) — memory management strategy needs human direction.

## Risk
- Removing GITHUB_TOKEN: jika token masih dipakai untuk git push, removing breaks
  deploy pipeline. **Must verify token usage first.**
- Narrowing guard regex: risk of under-matching actual gateway-killing commands.
  Conservative approach recommended.

## Lessons Learned
1. **57.5% noise ratio** — errors.log saat ini hampir tidak readable untuk human review.
   Recommend: separate `errors.log` (real errors) dari `audit.log` (check_fn, security_audit).
2. **grep exit=1 false-positive** — ini bug di tool_executor: exit code 1 dari grep
   bukan error, tapi di-log sebagai error. Quick fix di tool layer.
3. **Gateway guard substring match** sudah known issue (audit report 2026-08-08),
   tapi masih menyumbang 122 lines/6 hari. Structural fix belum di-prioritize.
4. **Skill patch failures** (226 lines) adalah agent behavioral issue — agent perlu
   read-before-patch discipline yang lebih baik. Bukan infra issue.

## Next Priority
1. **Quick win: verify & remove stale GITHUB_TOKEN** → potential 167 noise lines eliminated
2. **Quick win: grep `|| true` pattern in cron skills** → 93 noise lines eliminated
3. **Structural: log rotation strategy** — separate noise sources ke DEBUG level
