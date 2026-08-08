---
task_id: t_6c563f5b
objective: OBJ-005
date: 2026-08-08
status: draft
---

# Fix sqlite3 CLI missing + max_turns config warning spam

## Engineering Question
Engineering cycle cron broken by (1) `sqlite3` command-not-found dan (2) `max_turns=150` warning spam tiap run. Apakah dua bug ini bisa diselesaikan agar cron cycle stabil?

## Method
1. Cek binary `sqlite3` di sistem — apakah benar-benar hilang atau hanya PATH issue.
2. Cek konfigurasi `agent.max_turns` via `hermes config get`.
3. Hitung baseline warning spam di `errors.log`.
4. Fix `max_turns` lewat `hermes config set` (bukan `patch` — config file Hermes di-guard, tidak boleh di-edit langsung oleh agent).
5. Verifikasi: trigger config read fresh process, hit delta warning.

## Findings (with measurements)

**sqlite3 — sudah sehat (no-op fix):**
- `/usr/bin/sqlite3` v3.37.2 ada dan working. `which sqlite3` → `/usr/bin/sqlite3`.
- Skill SQL pattern (`sqlite3 ~/.hermes/kanban/boards/tabacoid/kanban.db "SELECT ..."`) exit 0, return valid rows.
- **Kemungkinan root cause task description:** task ini dibuat ketika PATH shell belum include `/usr/bin`, atau saat cron job context lain. Pada cron run ini PATH sudah normal — bug tidak reproduce.
- Metric: `sqlite3 CLI exit code: 0 (127 → 0)` — tapi 127 tidak terjadi di run ini, jadi fix is no-op.

**max_turns — fixed:**
- Before: `agent.max_turns: 150` → hard-cap clamped to 40, setiap cron run generate warning.
- Baseline: **24 baris warning** `max_turns=150 exceeds hard cap` di `errors.log` (semua dari 2026-08-08 00:51–01:17).
- Previous executor run (00:49–01:08) habis 40/40 turns, max_turns guard fired, truncated. Salah satu penyebab: tool `patch` refused karena config file Hermes di-guard security.
- Fix: `hermes config set agent.max_turns 40 --force` → exit 0, value persisted.
- After: fresh config read (`hermes config get agent.max_turns`) → **delta warning = 0** (sebelumnya +1 per invocation).
- Metric: `max_turns warning rate: 1/run → 0/run`.

## Decision
**Adopt.** Kedua bug sudah teratasi:
- sqlite3: tidak perlu install (sudah ada system-wide). Task description over-reported severity.
- max_turns: fixed via proper channel (`hermes config set`, bukan `patch` langsung ke config.yaml).

## Risk
- Rendah. `max_turns: 40` adalah hard-cap Hermes itu sendiri — menurunkan dari 150 ke 40 hanya menghilangkan warning, tidak mengubah behavior (selalu di-clamp ke 40).
- Catatan: executor previous run yang habis 40 turns menandakan task ini sendiri memakan banyak step karena mencoba cara yang salah (`patch` config file). Lesson learned untuk task serupa.

## Lessons Learned
1. **Config file Hermes di-guard** — agent tidak boleh `patch` langsung `~/.hermes/config.yaml`. Gunakan `hermes config set <key> <value> [--force]`.
2. **"command not found" tidak selalu berarti binary hilang** — verifikasi `which`/`type` di shell context yang sama dengan yang report error sebelum install apt.
3. **Stale `running` claim recovery**: jika previous cron run crash/habits turns tanpa complete, task tetap `running` dan block board. Executor harus cek apakah ada live process, kalau tidak → reclaim.

## Next Priority
- Monitoring: pastikan warning `max_turns` tidak muncul lagi di errors.log dalam 24 jam berikutnya.
- Pertimbangkan: planner review ulang task description accuracy (sqlite3 "missing" ternyata false positive).
