---
task_id: t_99fa94bb
objective: OBJ-005
date: 2026-08-09
status: draft
human_review: autonomous
---

# Root Cause: 2× max_turns Guard Fires (05:28 & 05:53 WIB)

## Engineering Question
Executor cron hit the 40-turn conversation limit 2 times in 24h (05:28:41 and 05:53:46 WIB, 09 Aug 2026). Each fire wastes ~40 turns of GLM quota on a task that doesn't complete. Apakah penyebabnya guard-block retry loop, atau pola lain?

## Method
Forensic analysis dari 2 session journal:
- `cron_8559b9243875_20260809_050142` (05:01–05:28 WIB)
- `cron_8559b9243875_20260809_052950` (05:29–05:53 WIB)

Sumber data: `~/.hermes/logs/agent.log`, `~/.hermes/logs/errors.log`, `journalctl --user -u hermes-gateway`.

## Findings

### Event 1 (05:28 WIB) — Task: `t_exe_04ec8f61` (tracemalloc snapshot analysis)

| Metric | Value |
|--------|-------|
| API calls | 40/40 (max budget exhausted) |
| Tool calls | 57 (avg 1.4/turn) |
| Errors | 1 hardline block |
| Input token growth | 10,932 → 35,630 (3.3× context bloat) |
| Session duration | ~27 min (05:01 → 05:28) |

**Root cause: scope creep + context bloat, BUKAN guard retry.**

Session ini mengerjakan memory leak tracemalloc analysis. Hanya 1 hardline block terjadi (di turn ~8, `/proc/smaps` command ditolak sebagai "malformed executable payload"). Agent recovered dari block tersebut — bukan penyebab max_turns.

Penyebab sebenarnya: task **terlalu exploratory** untuk budget 40-turn. Agent menelusuri tracemalloc snapshots, grep process memory, baca config files, analyze race conditions — 57 tool calls dalam 40 turn. Context grew 3.3× (10.9K → 35.6K tokens), memperlambat setiap API call. Agent **sebenarnya hampir selesai** — last turn produced response_len=3895 dan kemungkinan menyelesaikan report, tapi max_turns fired tepat saat finalize.

Task ini eventually completed successfully di session berikutnya (06:18 WIB, result: "Tracemalloc watcher SILENTLY BROKEN (race condition)").

### Event 2 (05:53 WIB) — Guard-block + terminal errors

| Metric | Value |
|--------|-------|
| API calls | 40/40 (max budget exhausted) |
| Tool calls | 59 (avg 1.5/turn) |
| Errors | 4 errors |
| Input token growth | 10,932 → 31,204 (2.9× context bloat) |
| Session duration | ~24 min (05:29 → 05:53) |

**Root cause: mixed errors + context bloat, guard retry hanya minor factor.**

4 error events:
1. **05:31:55** — Gateway guard block (command mengandung "restart" / "stop gateway" trigger phrase). Agent likely retried setelah ini — tapi hanya 1 occurrence.
2. **05:43:50** — exit_code=1, "No matches found" (grep yang return kosong)
3. **05:47:19** — exit_code=1, generic error
4. **05:48:51** — exit_code=1, "No matches found"

Errors 2–4 bukan guard-related — itu terminal commands yang return exit_code=1 karena pattern tidak match. Agent tetap lanjut bekerja (55 successful tool calls dari 59 total). Guard block hanya consumed ~1-2 extra turns, bukan 40.

### Pattern Utama: Bukan Guard Retry Loop

Hypothesis awal task (guard-block retry loop sebagai penyebab utama) **DITOLAK**. Data menunjukkan:

- Session 1: hanya 1 guard/hardline block di 40 turns. Agent recovered cepat.
- Session 2: hanya 1 guard block. 3 error lainnya unrelated.
- Kedua session: agent produktif (55-57 successful tool calls dari 59-57 total).
- **Actual pattern: exploratory tasks yang naturally butuh >40 turns**, dipadukan dengan context bloat yang slow down turns mendekati akhir.

## Decision

**Needs Human Review** — mitigasi proposed but requires config change.

Rekomendasi mitigasi (priority order):

1. **Tingkatkan max_turns untuk executor cron** dari 40 → 25 untuk force completion-or-block faster. **WAIT** — ini sebaliknya: naikkan ke 50-60 agar exploratory tasks complete, ATAU turunkan ke 20 untuk force block-cepat. Karena context bloat adalah faktor, turunkan lebih efektif: **max_turns=25** untuk executor. Tasks yang tidak selesai di 25 turns kemungkinan terlalu exploratory → should be decomposed.
   - Implementation: `config.yaml` → `agent.max_turns: 25` (global, affects all cron jobs)
   - Trade-off: simpler executor tasks mungkin perlu 2 cycle, tapi prevent 40-turn waste

2. **Tambah task scope guard di planner**: task dengan `evidence_required` >2 items atau description >200 kata harus di-decompose jadi subtasks. Task `t_exe_04ec8f61` punya 3 evidence types dan description panjang → natural candidate untuk decomposition.

3. **Guard-block handling prompt** (existing di skill): sudah adequate. Tidak perlu tighten lebih lanjut — guard block hanya minor factor (1 occurrence per session).

## Risk
- Lower max_turns bisa cause tasks yang legitimately complex ter-block sebelum selesai
- Mitigation: planner decompose + executor block dengan reason, bukan silent truncation

## Lessons Learned
- **max_turns fires bukan selalu guard-related** — assumption di task body keliru. Perlu verify hypothesis dengan data sebelum propose fix.
- Context bloat (3.3× growth) adalah silent killer: tiap turn makin lambat, agent makin sulit converge.
- Task `t_exe_04ec6f61` completed successfully di retry berikutnya → max_turns truncation tidak always waste, kadang just delays completion.

## Next Priority
1. Decision dari human: naikkan max_turns ke 50+ (toleransi exploratory), atau turunkan ke 25 (force focus)?
2. Planner: enforce decomposition rule untuk tasks dengan >2 evidence_required items.
3. Consider: tambah "turns_used" metric di task completion event untuk track efficiency.
