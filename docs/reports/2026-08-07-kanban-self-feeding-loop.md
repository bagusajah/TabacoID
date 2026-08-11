---
human_review: autonomous
---

# Daily Report 2026-08-07 — Kanban Self-Feeding Loop Root Cause Analysis

## Engineering Question
Kenapa engineering cycle cron menghasilkan 87 task dalam 24 jam, 53 di-mark done? Apakah ada infinite loop antara auto-followup creation → recompute_ready promotion → cron pick-up?

## Method
1. Audit kanban task_events hari ini (create, block, unblock, promote)
2. Trace lifecycle task yang seharusnya `blocked-needs_input` tapi malah `done`
3. Baca source code `_has_sticky_block()` di `kanban_db.py` vs skill template SQL
4. Cross-reference: task created_by, event kinds, status transitions

## Findings (with measurements)

### Problem Scope
| Metric | Value |
|--------|-------|
| Tasks created today | 87 (82 by hermes-cron, 6 backfill) |
| Tasks completed today | 53 |
| Engineering cycle executions today | 67 (firing every ~1 minute) |
| Tasks that leaked through blocked-needs_input → done | **7** |
| Blocked tasks that remain properly blocked | 34 |
| Disk usage of cron output | 1.3 MB |
| Kanban DB tasks total | 100 (66 done + 34 blocked) |

### Root Cause: Two Bugs

**Bug 1: Skill template uses `kind='comment'` for BLOCKED-needs_input**

Skill template (`tabacoid-daily-improvement`) Step 4B:
```sql
INSERT INTO task_events (task_id, kind, payload, ...)
VALUES ('<TASK_ID>', 'comment', 'BLOCKED-needs_input: ...', ...)
```

Tapi `_has_sticky_block()` di `kanban_db.py:4126-4132` cek:
```sql
SELECT kind FROM task_events WHERE task_id = ? AND kind IN ('blocked', 'unblocked')
```

`kind='comment'` **tidak terdeteksi** sebagai sticky block → `recompute_ready` auto-promote ke ready → cron pick up → execute → mark done.

**Bug 2: Cron session blocks AND completes in same turn**

Task `t_214BB956`: di menit yang sama, cron insert `kind='comment' BLOCKED-needs_input` DAN insert completion comment `DONE: audit complete`. Task berakhir `done` meskipun seharusnya menunggu human review. Cron ignore blocking-nya sendiri.

**Bug 3 (minor): Engineering cycle fires every 1 minute**

Schedule: `"kind": "interval", "minutes": 1`. Dengan 67 completions/hari, ini sangat agresif. Sebagian besar menit task kosong (semua blocked), tapi setiap execution tetap konsumsi LLM tokens untuk idle check.

### Bukti Tracing

**Task t_214BB956** (leaked through):
- 23:51:14 — `comment: BLOCKED-needs_input: code changes ready for review`
- 23:51:14 — `comment: Completed: removed hardcoded labStats[0]...` ← same second!
- 23:51:46 — `promoted` ← recompute picked it up
- 23:55:48 — `comment: BLOCKED-needs_input: changes committed (e0affa2)...` ← blocked again
- 23:55:48 — `comment: DONE: audit complete` ← done again, same second
- 23:56:47 — `promoted` ← recompute again

**Task t_5B222930** (properly blocked once, then leaked):
- 23:08:14 — `blocked: BLOCKED-auto_followup` ← correct kind
- 23:21:40 — `unblocked` ← auto-recovered by recompute (no parents!)
- 00:16:15 — `comment: BLOCKED-needs_input` ← wrong kind, not sticky
- 00:16:50 — `promoted` → done

**Task t_789D5147** (correctly blocked — still blocked):
- Uses `kind='blocked'` → sticky block works → stays blocked ✓

## Decision
**Needs Human Review** — fix memerlukan edit skill template DAN kemungkinan perubahan di cron schedule.

### Fix yang diperlukan:

1. **Skill template**: Ubah `kind='comment'` → `kind='blocked'` untuk BLOCKED-needs_input dan BLOCKED-auto_followup. Ini membuat `_has_sticky_block()` recognize them.

2. **Cron schedule**: Turunkan dari `every 1m` → `every 30m` atau `every 15m`. 67 executions/hari untuk max 1 meaningful task per run adalah pemborosan.

3. **Step 4 logic**: Pisahkan block dan complete — cron seharusnya TIDAK menandai task done di turn yang sama dia block. Tambahkan guard: if status='blocked' then stop, don't also complete.

### Estimated impact:
- Fix Bug 1 + 3: 7 tasks/day tidak akan bocor lagi
- Fix Bug 2: Cron tidak self-contradict (block + done dalam hitungan detik)
- Fix schedule (1m → 30m): 67 → ~48 executions/day, hemat ~30% LLM token consumption

## Risk
- Perubahan skill template bisa break existing cron runs yang sedang berjalan
- Interval 30m berarti task-based engineering cycle tidak se-responsif (max 30m delay sebelum pick up)
- Edit kanban DB schema/policy adalah core infra change — perlu testing

## Lessons Learned
- `kind='comment'` di task_events adalah penanda yang **tidak punya semantic effect** — hanya catatan. Untuk mengubah task lifecycle, harus pakai kind yang recognized oleh `_has_sticky_block()`.
- Cron interval 1m + auto-followup task creation = infinite loop risk. Setiap loop konsumsi tokens.
- Engineering cycle seharusnya **satu task per invoke**, tapi dalam praktek: claim → execute → complete → create followups → recompute → promote → next invoke picks followup → loop.

## Next Priority
- Fix skill template: `kind='blocked'` untuk semua BLOCKED variants (needs_input, auto_followup, reason)
- Reduce engineering cycle interval dari 1m → 30m (atau matikan auto-followup creation entirely)
- Pertimbangkan: matikan auto-followup task creation di skill — biarkan human yang decide follow-up
