---
task_id: t_dec9cd98
objective: OBJ-005
date: 2026-08-10
status: draft
human_review: autonomous
---

# Root Cause: 10:32 max_turns=25 Fire — Bukan Guard-Block, Bukan Budget Terlalu Longgar

## Engineering Question

Task t_922a2eb1 menurunkan `max_turns` dari 40 → 25 jam 07:20 WIB. Tiga jam
kemudian (10:32), executor cron `cron_8559b9243875_20260810_101018` tetap
kena truncation di 25/25. Pertanyaan: ini one-off model degradation event,
atau max_turns=25 yang keliru? Diagnosis awal t_99fa94bb (guard-block retry)
sudah ditolak di task body — perlu root cause yang benar.

## Method

Forensic analysis session journal `cron_8559b9243875_20260810_101018` di
`~/.hermes/logs/agent.log` (lines 3028–3165). Lalu bandingkan truncation
rate **before vs after** config change menggunakan semua session Aug 9
(`agent.log.1`) vs Aug 10 post-change (`agent.log`).

## Findings

### Event 10:32 — Bukan guard-block, bukan budget problem

Session ini sebenarnya **produktif selama 22 turn pertama**:
- Turn 1–14: baca config, verifikasi t_922a2eb1 result, baca laporan
  t_99fa94bb, eksekusi beberapa terminal command.
- Turn 15–22: apply 5× patch tool calls (config edits + dokumen), semua
  sukses (46–48s each, output 892–2544 chars).
- Turn 23 (10:29:16): parent issue delegate_task → spawn child session
  `20260810_102928_56c60c`. **Child pakai openrouter dengan model kosong**
  (`model=''`), web_search return `{"error":"boom"}` 5×, guardrail block 3×.
  Model reuse tool-call IDs (`call_1`, `x`, `c`, `call_x`) — tanda degradasi.
- Turn 24–25: parent lanjut kerja (write_file, terminal verify), lalu
  truncation di 25/25.

**Root cause sebenarnya:** delegate_task child session mengalami provider
misconfiguration (model kosong → openrouter fallback → "boom" errors) dan
membakar budget parent via noisy failure loop. Parent sendiri produktif.
Ini **one-off infra event**, bukan bukti max_turns=25 terlalu longgar.

### Data comparative: max_turns=25 memperburuk truncation

| Metric | Aug 9 (max_turns=40) | Aug 10 post-change (max_turns=25) |
|--------|---------------------|------------------------------------|
| Total sessions | 76 | ~30 (setelah 06:22 WIB) |
| Sessions hit limit | 8 (40/40) | 8 (25/25) |
| **Truncation rate** | **~10.5%** | **~27%** |
| Median turns used | 6–7 | 6–7 |
| Tail (exploratory) | butuh 20–40 | terpotong di 25 |

Truncation rate **naik 2.6×** setelah change. Median session tetap 6–7 turn
(unchanged — change tidak membantu task simple), tapi tail exploratory
sekarang terpotong lebih agresif. Change ini **tidak mencapai tujuannya**.

## Decision

**REJECT max_turns=25.** Rekomendasi: revert ke 40 (atau kompromi 35).

Alasan:
1. Diagnosis t_99fa94bb yang mendasari change (lower budget = force focus)
   salah arah — lower budget hanya memotong ekor, bukan menghilangkannya.
2. Truncation rate naik 2.6× (10.5% → 27%). Lebih banyak session yang
   terbuang, bukan lebih sedikit.
3. 10:32 event adalah one-off delegate_task provider misconfiguration,
   bukan bukti sistemik. Mitigasi yang benar untuk event itu: fix provider
   config child session, bukan tighten turn budget.

Mitigasi yang **benar** untuk exploratory tail (priority order):
1. **Planner decomposition rule** — task dengan `evidence_required` >2 items
   atau description >200 kata wajib di-decompose jadi subtasks. Ini sudah
   di-rekomendasi t_99fa94bb tapi belum pernah di-implement.
2. **Fix delegate_task child provider** — child session pakai
   `model=''` + openrouter fallback, harusnya inherit parent config
   (`glm-5.2`/`zai`). Bug terpisah, perlu task sendiri.
3. Biarkan max_turns=40 — median 6–7 turn, change tidak menghemat apa pun.

## Risk

- Revert ke 40 akan kembali ke ~10% truncation baseline. Itu acceptable
  karena truncated task biasanya complete di retry berikutnya (bukan waste,
  delay).
- Tanpa decomposition rule, exploratory tail akan tetap ada — tapi itu
  masalah planner, bukan turn budget.

## Lessons Learned

- **Config change tanpa baseline measurement adalah gambling.** t_922a2eb1
  apply change tanpa data comparative; baru sekarang (post-hoc) terlihat
  kalau truncation rate naik 2.6×. Harus measure before, bukan after.
- **Satu truncation event bukan signal.** 10:32 adalah infra event
  (provider misconfig), bukan behavioral pattern. Jangan generalize dari
  N=1.
- Diagnosis t_99fa94bb (guard-block) sudah ditolak task body, tapi action
  yang lahir dari diagnosis itu (lower max_turns) tetap dijalankan tanpa
  re-verify. Disconnect antara diagnosis dan action.

## Next Priority

1. **Revert `agent.max_turns` 25 → 40** (task terpisah, needs config change).
2. **Implement planner decomposition rule** di skill (task terpisah).
3. **Investigate delegate_task child provider misconfiguration** — child
   session `model=''` + openrouter fallback adalah bug, perlu task sendiri
   (system: hermes-itself, category: core-engineering).
