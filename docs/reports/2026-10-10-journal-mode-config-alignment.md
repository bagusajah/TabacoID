---
task_id: daily-focus
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-10-10
status: published
human_review: autonomous
---

# Selaraskan config `database.journal_mode` dengan realita on-disk (delete → wal)

## Engineering Question
Error `hermes_state: database.journal_mode=delete is configured but the on-disk database is already WAL` muncul berulang di log gateway (state.db, tiap proses startup). Kenapa, dan apa fix yang benar — konversi DB atau ubah config?

## Method
1. Grep semua `journal_mode` di config: ketemu di 2 tempat — `~/.hermes/config.yaml:239` dan `~/.hermes/profiles/emailmanager/config.yaml:30`, keduanya `delete`.
2. Cek realita on-disk: `PRAGMA journal_mode` di state.db → `wal`.
3. Ikut pesan error sendiri: live downgrade WAL→delete di bawah koneksi terbuka berisiko korupsi, jadi DB jangan disentuh — config yang diselaraskan ke `wal`.
4. Setelah config fix, proses yang jalan otomatis menyelaraskan DB lain (kanban.db, cron/executions.db, cron/deliveries.db) ke WAL.

## Findings (with measurements)
- Error journal-mismatch di log setelah fix (window 30 menit): **3 → 0**
- DB yang selaras ke WAL otomatis oleh runtime pasca-fix: **4** (state.db, kanban.db, executions.db, deliveries.db)
- `PRAGMA integrity_check` keempat DB: **ok** semua
- Konfigurasi `delete` sisa di file config: **2 → 0**

## Decision
**Adopt.** Config adalah sumber kebenaran (setiap open re-applies mode dari config), jadi config disamakan dengan WAL yang sudah stabil di disk. Tidak ada konversi DB, tidak ada downtime, tidak ada restart — gateway guard juga aman karena fix murni file config + `hermes config set`.

## Risk
Rendah. Satu-satunya skenario di mana `delete` memang disengaja: mitigasi SQLite WAL-reset bug atau filesystem yang WAL-unsafe. NVMe lokal di Pi bukan kasus itu, dan WAL sudah jalan stabil di disk berminggu-minggu — config-lah yang keliru, bukan disk.

## Lessons Learned
- Saat config dan on-disk state bentrok, pesan error-nya sudah mengarahkan fix yang benar; ikuti diagnosa runtime sebelum nekat konversi.
- `patch` tool menolak `~/.hermes/config.yaml` (security-sensitive) — jalur resminya `hermes config set`. Profile config bisa diedit langsung.

## Next Priority
Ops onions berikutnya dari error log: Telegram transient network errors (Bad Gateway → auto-reconnect berhasil, tapi watchdog-deadline path-nya layak diamati); skill_manage error karena operasi tanpa `name` (pemakaian salah, bukan bug platform).
