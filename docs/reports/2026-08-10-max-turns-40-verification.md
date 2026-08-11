---
task_id: t_8f0ed8e9
objective: OBJ-005
date: 2026-08-10
status: draft
human_review: autonomous
---

# Verifikasi Efektivitas max_turns=40 Post-Revert

## Engineering Question
Apakah revert max_turns dari 25 ke 40 (Aug 10 11:40 WIB, task t_39c4cb6f) berhasil mengeliminasi truncation? Berapa baseline truncation rate yang harus kita observasi?

## Method
1. Grep `~/.hermes/logs/errors.log` untuk `max_turns guard fired`
2. Filter berdasarkan timestamp: pre-experiment (40), experiment (25), post-revert (40)
3. Konfirmasi config value saat ini via `hermes config get agent.max_turns`
4. Hitung truncation rate per periode

## Findings

**Config state:** `max_turns: 40` — confirmed active.

**Truncation events (Aug 10, all in errors.log):**

| Periode | max_turns | Window WIB | Events | Rate |
|---------|-----------|------------|--------|------|
| Pre-experiment | 40 | 03:15–06:06 | 5 | ~1.67/jam |
| Experiment | 25 | 06:36–11:02 | 7 | ~1.55/jam |
| Post-revert | 40 | 11:40–21:43 | **0** | **0/jam** |

- Total truncations: 12 (5 at 40/40, 7 at 25/25)
- Truncation terakhir: `2026-08-10 11:02:59` WIB (masih periode experiment, 25/25)
- Post-revert window: **~10 jam, 0 truncations**
- Log date range: 00:03:25 – 21:43:16 (219 lines)

**Key nuance:** max_turns=40 BUKAN zero-truncation. 5 events `40/40` terjadi di early-morning (03:15–06:06) saat executor tasks kompleks. Post-revert bersih karena: (a) tidak ada executor run yang sama-sama kompleks lewat setelah 11:40, dan (b) window 10 jam sebagian besar adalah off-peak.

## Decision
**Adopt (provisional).** max_turns=40 sukses mengeliminasi truncation di window observasi post-revert. Config stabil di 40.

**Tapi bukan konfirmasi final:** 0 truncations post-revert bisa karena belum ada task yang cukup kompleks untuk memicu 40 turns. Pre-experiment data menunjukkan 40-turn tasks tetap bisa truncate. Baseline real: **~1-2 truncation/jam saat peak executor activity**.

## Risk
- **False confidence:** 0 events di 10 jam bukan bukti 40 cukup untuk semua task. Kalau planner bikin task kompleks (multi-file coding, long investigation), 40 bisa masih kurang.
- **Observation window bias:** post-revert jatuh di off-peak. Peak hours (14:00-18:00) skip executor — jadi observasi belum cover beban penuh.
- **Log retention:** errors.log hanya 219 lines (1 hari). Truncation rate historical tidak bisa di-query — hanya Aug 10 yang terlihat.

## Lessons Learned
1. **max_turns 25 vs 40:** rate truncation mirip (1.55 vs 1.67/jam) — artinya banyak task yang butuh >25 turns juga butuh >40. Naik ke 40 tidak radikal.
2. **Guard fires di early-morning executor:** 03:00-08:00 adalah jendela padat. Mungkin planner buat task kompleks malam hari yang executor pagi harus eksekusi dalam 1 cycle.
3. **Metric untuk masa depan:** track `truncation_rate` per hari, bukan count absolut. Kalau >2/hari di max_turns=40, pertimbangkan 50 atau perbaiki granularity planner.

## Next Priority
Observasi 7 hari ke depan. Kalau truncation muncul lagi di >40-turn tasks, buat experiment: max_turns=50 vs perbaikan planner (dekomposisi task lebih agresif). Untuk sekarang, tidak ada action — config 40 adalah setting aman yang terbukti clean di 10 jam pertama.
