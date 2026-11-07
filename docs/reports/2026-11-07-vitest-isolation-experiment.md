---
task_id: t_ed044cbe
objective: OBJ-005
experiment: null
category: Experiments
date: 2026-11-07
status: published
human_review: autonomous
---

# Eksperimen vitest `isolate: false` di cicd-console — Reject

## Engineering Question
Vitest 5 menyarankan `isolate: false` dengan estimasi hemat ~3.9s pada suite cicd-console (modul di-evaluasi berulang per test file, total 67s import time). Pertanyaannya: apakah mematikan isolasi antar test file aman dan berapa hemat real-nya?

## Method
A/B kecil di `console/new-cicd-console` (Node 18, vitest 5.0.5, 36 test file / 407 test):
1. Baseline: 3 run default config (isolate: true) → catat wall-clock.
2. Eksperimen: tambah `isolate: false` di `vitest.config.js` (1 baris), 1 run.
3. Rollback config, 1 run verifikasi hijau lagi.

## Findings (with measurements)
| Kondisi | Wall-clock | Hasil |
|---------|-----------|-------|
| Baseline run 1–3 (isolate default) | 20.07 / 19.97 / 20.40 s (~20.1 s mean) | 407/407 pass, konsisten |
| `isolate: false` | 11.16 s (−44%) | **14 test FAIL di 13 file**, 95 skipped |

Failure pattern: test yang bergantung pada state per-modul rusak saat modul dishare antar file — `vault-replicator` (11 kasus), `drivers` registry, `oidc`, `app` registry, `booking-sync`, `build-polling`, dll. Ini singleton per module-eval (model sqlite, registry plugin), jadi kontaminasi state antar file memang inherent, bukan flake.

Estimasi hemat vitest (~3.86s) understated — realnya ~9s — justru karena lebih banyak file kebagian worker yang sama. Tapi itulah sisi yang merusak test.

## Decision
**Reject.** `isolate: false` tidak diadopsi. Isolasi antar file adalah load-bearing untuk suite ini; mengadopsi berarti refactor cleanup state di 13+ test file — biayanya jauh lebih mahal dari 9s per run (suite cuma jadi ~20s, dijalankan beberapa kali sehari).

Rollback sudah diverifikasi: config kembali ke semula, suite hijau 407/407 (20.40 s), working tree bersih.

## Risk
Nol pada produksi — tidak ada perubahan yang persist. Satu-satunya jejak adalah laporan ini.

## Lessons Learned
- Saran perf dari tool runner (`~3.86s faster with isolate: false`) itu tekad murah untuk diuji: 2 menit, 1 baris, dapat jawaban definitif.
- Hemat 44% wall-clock tetap bukan argumen kalau yang ditrade adalah correctness test suite. "Fast but red" bukan kandidat adopt.
- Estimasi tool bisa understated atau overstated; hanya A/B yang menunjukkan biaya sebenarnya (di sini justru lebih besar).

## Next Priority
- Kalau suatu saat suite membengkak (>60s), opsi yang benar adalah per-file cleanup state / `poolMatchGlobs`, bukan mematikan isolasi global.
- Open items lain menunggu approval user (dari laporan tadi): push branch `qa/dashboard-a11y`, cert apex cleanup.
