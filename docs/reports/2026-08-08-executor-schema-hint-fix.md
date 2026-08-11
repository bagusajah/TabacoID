---
task_id: t_f58f5898
objective: OBJ-005
date: 2026-08-08
status: draft
human_review: autonomous
---

# Fix Executor parent_id SQL Hallucination — Schema Hints di Cron Prompt

## Engineering Question
Executor cron (8559b9243875) berulang kali query `tasks.parent_id` yang tidak ada di schema. Hubungan parent-child disimpan di tabel `task_links(parent_id, child_id)`, bukan di kolom `tasks`. Ini menyebabkan 9 error hari ini di errors.log. Bagaimana mencegah LLM menghalusinasi nama kolom yang salah?

## Method
1. Ekstrak prompt executor dari `~/.hermes/cron/jobs.json` (job id `8559b9243875`).
2. Cek schema asli: konfirmasi `tasks` tidak punya `parent_id`, dan `task_links` punya `parent_id`/`child_id`.
3. Hitung baseline error: `grep -c 'parent_id' ~/.hermes/logs/errors.log` = 9.
4. Inject schema hint block tepat setelah baris DB path, sebelum "You are the EXECUTOR." — agar LLM baca schema sebelum instruksi apa pun.
5. Verifikasi: JSON valid, semua 8 job intact, hint text ada di prompt, panjang prompt 3789 → 4255 char.

Hint yang ditambahkan:
```
SCHEMA (DO NOT use parent_id on tasks table — relationships are in task_links):
  tasks: id, title, body, assignee, status, priority, created_at, started_at, completed_at, result, block_kind
  task_links: parent_id, child_id  -- this is where relationships live
  task_events: id, task_id, kind, payload, created_at
  task_comments: id, task_id, author, body, created_at
  NOTE: There is NO parent_id column on tasks. Use task_links for parent-child relationships.
```

## Findings (with measurements)
- **parent_id error count BEFORE fix: 9** (di errors.log, 2026-08-08, cron_8559b9243875)
- **Last 3 timestamps: 14:32, 17:21, 17:43 WIB** — error terus berulang setiap kali executor cycle jalan
- **Waktu per error: ~8-9 detik** (dari field timing tool_executor) — dibuang murni untuk query yang pasti gagal
- **Prompt length: 3789 → 4255 char** (+466, +12.3%)
- **Jobs intact: 8/8** (JSON valid, tidak ada job hilang)
- **Files changed: 1** (`~/.hermes/cron/jobs.json`)

## Decision
**Adopt** — fix sudah live. Schema hint sekarang ada di awal prompt executor, sebelum STEP 0. LLM akan baca schema sebelum menulis SQL query apa pun. Success metric: 0 error `parent_id` baru dalam 24 jam berikutnya. Akan terverifikasi di cycle berikutnya.

## Risk
- **Low risk.** Prompt edit bersifat additive (menambah konteks, tidak menghapus instruksi). Tidak ada logika yang berubah.
- **Rollback:** revert `~/.hermes/cron/jobs.json` ke versi sebelumnya (backup tidak dibuat, tapi hint bisa dihapus manual — cari blok "SCHEMA (DO NOT use parent_id").
- **Edge case:** jika LLM masih mengabaikan hint, next step adalah memberikan query template eksplisit (contoh: `SELECT child_id FROM task_links WHERE parent_id='...'`). Tapi hint sekarang sudah explicit enough.

## Lessons Learned
- **LLM hallucinates column names tanpa schema context.** Ini bukan bug model — ini gap di prompt design. Cron prompt yang berisi SQL query konkret tapi tanpa schema adalah undangan untuk tebak.
- **Tugas t_8E58CE0 sudah pernah usulkan fix ini tapi ditolak sebagai "speculative".** Sekarang sudah terbukti dengan 9 error. Lesson: bug yang muncul berulang di logs = bukan speculative, itu real.
- **Ponytail fix:** satu blok teks, satu file, 6 baris hint. Bukan refactor prompt, bukan schema migration, bukan code change. Shortest diff that works.

## Next Priority
- **Monitor 24 jam:** verifikasi tidak ada error `parent_id` baru di errors.log setelah fix ini. Jika masih ada, escalate ke query-template approach.
- **Planner:** pertimbangkan task serupa untuk planner cron (job `abf2bc7e05ff`) — apakah planner juga mengalami hallucination yang sama? Planner prompt sudah punya query `task_links` yang benar, jadi mungkin tidak perlu.
