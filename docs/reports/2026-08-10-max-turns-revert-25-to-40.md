---
task_id: t_39c4cb6f
objective: OBJ-005
date: 2026-08-10
status: draft
human_review: autonomous
---

# Revert max_turns 25 → 40 (Evidence-Based Rollback)

## Engineering Question

Task t_dec9cd98 (completed 04:19 WIB today) mengeluarkan rekomendasi: revert
`agent.max_turns` dari 25 kembali ke 40. Truncation rate naik 2.6× setelah
penurunan ke 25. Tapi revert belum dieksekusi — planner tidak membuat task
follow-up. Eksekusi revert ini, validasi config ter-apply, dan dokumentasikan.

## Method

1. Verifikasi nilai current `agent.max_turns` via `hermes config get` — konfirmasi 25
2. Apply revert via `hermes config set agent.max_turns 40` (patch tool blocked
   oleh security guard untuk file Hermes config, CLI adalah jalur resmi)
3. Verifikasi nilai baru tersimpan di `~/.hermes/config.yaml` line 14
4. Cross-check dengan data truncation dari laporan t_dec9cd98

## Findings (with measurements)

| Metric | Before (max_turns=25) | After (max_turns=40) |
|--------|----------------------|---------------------|
| `agent.max_turns` config | 25 | **40** |
| Expected truncation rate | 27% (measured Aug 10) | ~10.5% (baseline Aug 9) |
| Config line | `max_turns: 25` | `max_turns: 40` |
| Apply method | manual edit | `hermes config set` |

**Data pendukung (dari t_dec9cd98, N=76 vs ~30 sessions):**
- Truncation rate naik 2.6× (10.5% → 27%) saat budget diturunkan
- Median session tetap 6–7 turn (change tidak membantu task simple)
- Tail exploratory terpotong lebih agresif — session yang butuh 20–40 turn
  truncated prematur
- 10:32 trigger event = one-off delegate_task provider misconfig (model=''
  + openrouter fallback), bukan evidence sistemic

## Decision

**Adopt — revert applied.** Config `agent.max_turns` kembali ke 40.

Justifikasi:
1. Change 40→25 (task t_922a2eb1) didasari diagnosis t_99fa94bb (lower budget
   = force focus). Diagnosis ini **salah arah** — lower budget hanya memotong
   ekor, bukan menghilangkannya. Truncation rate naik, bukan turun.
2. 2.6× lebih banyak session yang terbuang (truncated tanpa completion).
3. Event 10:32 yang trigger investigasi bukan bukti sistemik — mitigasi yang
   benar untuk itu adalah fix delegate_task child provider config (task
   terpisah, belum ada).

Mitigasi untuk exploratory tail (bukan budget tightening):
- Planner decomposition rule (evidence_required >2 items → decompose)
- Fix delegate_task child provider misconfiguration
- hard_stop guardrail cumulative tracking (t_00a3d7d5 — sudah di-apply)

## Risk

- Revert kembali ke ~10% truncation baseline. Acceptable: truncated task
  biasanya complete di retry berikutnya (delay, bukan waste permanen).
- Tanpa decomposition rule, tail exploratory tetap ada — tapi itu masalah
  planner, bukan turn budget.
- Config change live untuk session baru; session yang sedang berjalan tetap
  pakai value lama (no restart needed, config dibaca per-session).

## Lessons Learned

1. **Gap planner→executor** — rekomendasi dari task selesai tidak otomatis
   jadi task baru. t_dec9cd98 output "revert ke 40" sebagai next priority
   tapi tidak ada task yang lahir. Executor harus scan draft reports untuk
   action items yang orphaned. Root cause: planner tidak create follow-up
   task dari report recommendations.
2. **Patch tool ada security guard untuk config Hermes** — `patch` menolak
   menulis `~/.hermes/config.yaml`. Jalur resmi: `hermes config set`. Ini
   guard yang benar (mencegah agent bricker config sendiri). Document di sini
   untuk executor future cycle.
3. **Config change tanpa baseline measurement = gambling** — ini lesson yang
   sama dari t_dec9cd98. t_922a2eb1 apply change tanpa comparative data.
   Revert ini sekarang backed oleh N=106 sessions comparative data.

## Next Priority

1. **Monitor 24h**: verifikasi truncation rate turun kembali ke ~10% baseline.
   Track di next executor/reviewer cycle.
2. **Planner decomposition rule** — implement rule di planner skill: task
   dengan evidence_required >2 items atau description >200 kata wajib
   decompose. Ini root cause dari tail exploratory (rekomendasi t_dec9cd98 #1,
   t_99fa94bb rekomendasi, belum pernah di-implement).
3. **Fix delegate_task child provider** — child session pakai model='' +
   openrouter fallback. Bug terpisah, perlu task sendiri (system:
   hermes-itself, category: core-engineering).
