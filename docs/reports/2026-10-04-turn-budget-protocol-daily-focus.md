---
task_id: t_52c74ebe
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-10-04
status: published
human_review: autonomous
---

# Turn-Budget Protocol untuk Daily Focus

## Engineering Question
Kenapa 2 dari 7 run Daily Focus (2026-10-04) kena iteration limit dan deliver
fallback response tanpa hasil? Bagaimana mencegahnya tanpa mengubah governance?

## Method
- Query `state.db sessions` untuk semua run cron `bf05fd0ca059` 30 hari terakhir:
  hitung `end_reason`, tool_call_count per run.
- Baca `errors.log` untuk identifikasi pola pemborosan turn pada run yang kena limit.
- Tambah protokol budget di SKILL.md (bukan config global — scope-nya memang
  perilaku skill ini saja).

## Findings (with measurements)
- **iteration_limit 2026-10-04: 2/7 run** (sesi 09:00 dan 13:00) — kejadian
  pertama; 30 hari sebelumnya: 0 dari 52 run (semua `cron_complete`).
- Baseline tool-calls per run: avg 33.9 (9/26) → 31.3 (10/03) → 34.3 (10/04).
  Run yang efisien selesai di 15–24 tools; yang kena limit mencapai 46–47.
- Ceiling keras: `max_turns: 40` di config.yaml. Fallback response = kerja
  buang (token keluar, tidak ada report, tidak ada kanban close).
- Pola pemborosan di run yang gagal: sweep skema arsip kanban (kolom
  `archived_at` tidak ada), probing command yang di-block guard, scan ulang
  sinyal yang sudah diambil di run yang sama.
- Catatan pengukuran: errors.log rotate tiap restart gateway (03:00), jadi
  baseline historis hanya dari state.db — itu yang dipakai.

## Decision
**Adopt.** Protokol turn-budget ditambahkan ke SKILL.md `tabacoid-daily-improvement`:
checkpoint turn 25 (mulai eksekusi atau shrink scope) dan turn 33 (finish-or-close
dengan bukti parsial), plus daftar budget-sink yang harus dihindari. Ini kategori
prompt-engineering pada Hermes itself — diizinkan Self-Improvement Rules.

## Risk
- Protokol berbasis teks; kepatuhan model tidak terjamin 100%. Mitigasi: review
  metrik iteration_limit di retrospective mingguan; kalau masih >0 per weekend,
  eskalasi ke mekanisme keras (turunkan `max_turns` khusus cron ini via config).
- `max_turns` 40 dibiarkan — menurunkannya global berisiko memutus task sah
  yang butuh turn lebih.

## Lessons Learned
- Failure mode baru muncul bersamaan dengan naiknya beban eksplorasi run
  (weekend 7 slot/hari). Budget guard harus eksplisit di skill, bukan diasumsikan.
- state.db lebih tahan rotate daripada errors.log untuk baseline metrik.

## Next Priority
Verifikasi minggu depan: iteration_limit per weekend harus 0. Kalau tidak,
pertimbangkan max_turns terpisah untuk cron Daily Focus.
