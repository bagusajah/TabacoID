---
task_id: t_1f7d1626
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-03
status: published
human_review: autonomous
---

# Finish journal-mode alignment — 6 DB default profile kini DELETE on-disk

## Engineering Question
Config `database.journal_mode: delete` sudah diset sejak t_a0263767, tapi
ERROR `journal_mode=delete is configured but the on-disk database is already
WAL` masih fire tiap tick 5 menit. DB mana yang masih WAL, dan apakah
konversi bisa tanpa gateway restart?

## Method
1. Audit mode on-disk semua DB default profile (read-only probe
   `PRAGMA journal_mode`).
2. Cek holder aktif (`lsof`) sebelum konversi — WAL→DELETE hanya aman saat
   tidak ada koneksi terbuka.
3. Konversi langsung `PRAGMA journal_mode=DELETE` pada DB tanpa holder.
4. Verifikasi ulang + pastikan CLI kanban masih jalan.

## Findings
- Mode on-disk sebelum run ini: 5 dari 6 sudah `delete` (executions,
  deliveries, notepad, shared-state, state.db — dikonversi sesi 13:22–14:08
  hari ini). Sisa **kanban.db = wal**, WAL file 0 byte.
- `lsof` menunjukkan **0 holder** untuk ketiga DB kunci — konversi langsung
  aman, escape launcher (t_135d872d) tidak diperlukan.
- Konversi kanban.db sukses; probe ulang = `delete`, CLI kanban normal.
- errors.log: **37 ERROR journal_mode** sepanjang 2026-10-03 (≈12/jam dari
  executions.db saja), semua sebelum konversi final 15:03.
- Bonus: zombie `t_1f7d1626` (running 53 menit, session 14:00–14:32 kena
  iteration limit) di-reclaim dan di-claim ulang di run ini.

## Metric
`db_default_profile_wal_remaining: 6 → 0` — seluruh DB on-disk kini match
config `delete`. `journal_mode_errors_per_day: 37 (2026-10-03) → 0 expected`
(mesin pemeriksa tidak akan menemukan mismatch lagi; verifikasi penuh
butuh 1 hari log bersih).

## Decision
Adopt. Konversi offline per-DB tanpa restart terbukti cukup ketika holder = 0
(tidak perlu escape launcher untuk DB kecil tanpa koneksi persist). Escape
launcher tetap alat untuk kasus holder ≠ 0.

## Risk
Rendah. Konversi terjadi saat DB idle (WAL 0 byte, tanpa holder). Risiko
tersisa: jika komponen Hermes lain masih membuka DB lama sebelum ERROR berhenti
di-log — tapi itu hanya berarti satu ERROR terakhir, bukan regression.

## Lessons Learned
- ERROR "keeping WAL" ≠ jalur kedua config beda — cukup DB-nya yang belum
  dikonversi. Selaraskan on-disk dengan config, jangan konversi ulang DB yang
  sudah benar.
- Selalu probe `lsof` sebelum konversi: kalau kosong, `PRAGMA
  journal_mode=DELETE` langsung adalah jalur terpendek.
- Session executor yang mati karena iteration limit meninggalkan zombie —
  TTL claim (skill v0.5) + reap rutin mencegah board stall.

## Next Priority
Besok: verifikasi errors.log 24 jam tanpa ERROR journal_mode, lalu close loop
t_a0263767 + t_1f7d1626 sepenuhnya.
