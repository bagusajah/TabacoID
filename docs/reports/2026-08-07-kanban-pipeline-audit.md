# Daily Report 2026-08-07 — Kanban Board Pipeline Audit

## Engineering Question
Kenapa semua 37 blocked task stuck di board, tidak ada yang mengalir ke ready? Apakah pipeline kanban berfungsi atau sudah deadlock?

## Method
1. Query kanban board: status distribusi, block_kind, event kinds
2. Klasifikasi manual setiap 37 blocked task berdasarkan: actionability, freshness, duplikasi
3. Cross-reference dengan error log gateway (kanban dispatcher crash)
4. Trace lifecycle tasks yang bocor dari blocked ke done

## Findings (with measurements)

### Board Overview
| Metric | Value |
|--------|-------|
| Total tasks | 105 (68 done + 37 blocked) |
| Blocked tasks | 37 (semua block_kind=NULL) |
| Auto-generated follow-ups | 18 dari 37 blocked |
| Cron executions hari ini | ~67 (setiap 1 menit) |
| Meaningful work dari cron hari ini | 0 (semua turn kosong) |
| Deadweight monitoring tasks | 6 |

### Root Cause: Pipeline Stagnation

**Problem 1: Semua blocked task punya `block_kind=NULL`**

Skill template (cron prompt) memblokir task dengan SQL langsung:
```sql
UPDATE tasks SET status='blocked' WHERE id='<TASK_ID>';
INSERT INTO task_events ... VALUES (..., 'comment', 'BLOCKED-needs_input: ...');
```

Tapi `kanban_db._has_sticky_block()` hanya cek `kind IN ('blocked', 'unblocked')`. Event `kind='comment'` tidak terdeteksi sebagai sticky block. Hasilnya, `recompute_ready` bisa auto-promote task ini kembali ke ready.

**Problem 2: Cron 1-menit tanpa escape hatch**

Cron jalan setiap 1 menit. Turn dimana semua task blocked = LLM tokens terbuang untuk "IDLE CHECK" atau pencarian task ready yang kosong. 67 executions × kosong = ~67 LLM calls terbuang hari ini.

**Problem 3: Auto-followup creation menggandakan task**

Setiap report membuat 2-5 follow-up task via `Next Priority` section. 18 auto-generated task terakumulasi dalam 24 jam. Semua blocked, semua menunggu human review yang tidak datang.

### Klasifikasi 37 Blocked Tasks

| Kategori | Jumlah | Contoh |
|----------|--------|--------|
| Deadweight (stale monitoring, bisa ditutup) | 6 | Monitor backup.log "besok", Monitor RSS 24-48h |
| Butuh aksi human (web UI, credentials) | 3 | GitHub PAT, R2 bucket, rclone config |
| Actionable oleh Hermes | 14 | Fix swappiness, disable systemd, Docker cleanup |
| Low value / vague | 14 | "Pertimbangkan...", monitoring tasks tanpa deadline |

### Duplikat Teridentifikasi
- t_534744AE ↔ t_ADF6FC8D (disable systemd boot services)
- t_CRONINT01 ↔ t_9625E2B2 (cron interval 1m)
- t_FC81648F ↔ t_LDMPST01 (custom monitoring dashboard)
- t_853B7B24 ↔ t_CCB15693 (logrotate service failure)

### Timestamp Bug
- `t_DA0BBE96` punya `created_at='%s'` (literal string, bukan epoch timestamp)
- Disebabkan SQL template yang salah: `strftime('%s','now')` di dalam INSERT task oleh skill shell script — `%s` tidak dievaluasi karena di-quote

## Decision
**Needs Human Review** — audit ini menghasilkan actionable recommendations tapi perlu human approval untuk:
1. Menutup deadweight tasks
2. Menggabungkan duplikat
3. Mengapprove fix skill template (kind='comment' → 'blocked')
4. Mengapprove cron interval change (1m → 30m)

### Rekomendasi Prioritas:
1. **Fix skill template** — ubah `kind='comment'` → `kind='blocked'` untuk semua BLOCKED variants
2. **Kurangi cron interval** — 1m → 30m (hemat ~55 LLM calls/hari)
3. **Tutup 6 deadweight tasks** — stale monitoring, sudah tidak relevan
4. **Gabung 4 duplikat** — kurangi noise di board
5. **Unblock 14 actionable tasks** — biarkan cron pick them up secara natural

## Risk
- Menutup/menggabungkan task yang ternyata masih relevan → irreversible
- Fix skill template memerlukan edit cron prompt yang sedang berjalan
- Mengurangi cron interval ke 30m berarti max 30m delay sebelum pick up

## Lessons Learned
- Board yang 100% blocked + cron 1m = token sink. Auto-followup creation memperparah.
- `block_kind=NULL` artinya task di-block secara informal (direct SQL), bukan via proper `block_task()` API. Tidak ada semantic blocking.
- 14 dari 37 blocked task sebenarnya bisa dikerjakan Hermes — pipeline yang salah, bukan task yang salah.

## Next Priority
- Human review dan approval untuk rekomendasi di atas
- Setelah approval: fix skill template kind, kurangi interval, cleanup board
- Pertimbangkan: matikan auto-followup creation di skill, biarkan human yang decide follow-up items
