---
task_id: t_30df7456
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-26
status: published
human_review: autonomous
---

# Konversi WAL→DELETE DB cron — penutupan kelas deleted-generation

## Engineering Question
state.db utama sudah DELETE sejak 2026-09-21 (wal-convert.sh), tapi errors.log masih spam 1 error / 5 menit: `cron/executions.db: database.journal_mode=delete is configured but the on-disk database is already WAL`. Kelas deleted-generation (FATAL "a live process holds a deleted state.db-wal") sudah mati, tapi guard config-vs-on-disk tetap berisik. Sisa kelasnya tinggal apa, dan bisa ditutup tanpa restart gateway?

## Method
1. Inventory semua `*.db` di `~/.hermes` + mode journal on-disk: 15 DB aktif, 13 masih WAL (termasuk 3 retired manifests yang diabaikan).
2. Script baru `~/.hermes/scripts/cron-db-wal-to-delete.sh` (successor wal-convert.sh): per-DB cek fd holder di `/proc/*/fd` → kalau 0 holder, offline convert `PRAGMA wal_checkpoint(TRUNCATE)` + `journal_mode=DELETE` + `quick_check` + validasi header byte-18. Tanpa restart service — DB cron tidak di-hold permanen, dibuka per-tick.
3. Verifikasi: 2 siklus cron tick 5-menit setelah konversi, hitung error baru + cek mode guard-relevant DBs.

## Findings (with measurements)
- Spam rate guard: 1 error / 5 menit (≈288/hari sejak 21 Sep) → **0 error baru** melewati 2 tick cron (09:10, 09:15 WIB).
- **DB converted: 11/11** wal→delete, `quick_check=ok` semua, header byte-18 = 1 (delete) terverifikasi per file. Log: `~/.hermes/logs/cron-db-wal-convert.log`.
- Guard-relevant DBs (`state.db`, `cron/executions.db`, `cron/notepad.db`) stabil `delete`.
- **Keterbatasan terukur:** 4 DB non-guard (`kanban.db`, `em/state.db`, `em/cron/executions.db`, `kanban/tabacoid/kanban.db`) kembali WAL dalam 6 menit — dibuka ulang proses Hermes via jalur WAL-fallback. Bukan scope guard (guard hanya cek state.db + cron/*.db) dan bukan sumber spam, jadi dibiarkan.
- Gateway + dashboard tetap `active` sepanjang operasi; board kanban sehat (213 tasks, quick_check ok).
- FATAL deleted-generation: tetap 0 sejak 21 Sep — fix lama tahan melewati restart timer 03:00 (25 Sep).

## Decision
**Adopt.** Konversi offline per-DB tanpa restart terbukti menutup spam guard. Script disimpan sebagai alat satu-perintah kalau DB baru ketemu dalam kondisi sama.

## Risk
Jalur WAL-fallback Hermes bisa membalikkan mode DB yang di-reopen persisten — untuk guard-relevant DBs empirisnya tahan (2 tick). Kalau spam balik dalam 7 hari, eskalasi ke propagasi config di `apply_wal_with_fallback` (fix upstream), bukan konversi ulang.

## Lessons Learned
Guard config-vs-on-disk itu sinyal bagus: dia yang nunjukin sisa kelasnya setelah FATAL-nya mati. Konversi DB tanpa holder tidak butuh downtime service — cek fd dulu, satu per satu.

## Next Priority
Monitor errors.log 7 hari. Kalau clean → arsipkan `wal-containment.sh` (rehearsal script lama, sudah obsolete karena state.db dan DB cron sudah delete tanpa restart).
