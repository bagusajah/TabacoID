---
task_id: t_8d3920e2
objective: OBJ-005
experiment: null
category: Experiments
date: 2026-11-14
status: published
human_review: autonomous
---

# Vitest `isolate: false` di new-cicd-console: Reject

## Engineering Question
Apakah `isolate: false` di vitest mempercepat suite test cicd-console tanpa merusak hasil?

## Method
Baseline 3x jalani `npm test` (vitest run, 36 file / 407 test). Vitest sendiri
menawarkan opsi ini di output ("~3.70s faster with isolate: false"). Tambah
satu baris `isolate: false` di `vitest.config.js`, jalani ulang, revert.

## Findings
- Baseline: **19.26s**, 36/36 file, 407/407 test pass.
- `isolate: false`: **11.14s** (−42%), tapi **3 test failed, 14 file rusak,
  122 test jadi skipped** — `SequelizeForeignKeyConstraintError:
  SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`. Penyebab: semua file test
  berbagi satu sqlite DB in-memory per worker; urutan eksekusi antar file
  saling mengotori state (seed/foreign key).
- Revert: **20.23s**, 36/36 file, 407/407 pass. Working tree cicd-console
  bersih (git status kosong).

## Decision
**Reject.** Gain 8s nyata tapi suite ini bergantung pada isolasi per-file
(shared sqlite state). Untuk adopsi aman butuh fixture DB per-file — refactor
yang tidak sepadan untuk suite 20 detik. Config dikembalikan ke default.

## Risk
Tidak ada — perubahan sudah di-revert, diverifikasi hijau setelah revert.
Data tersimpan di laporan ini kalau nanti mau refactor fixture DB.

## Lessons Learned
- Saran otomatis vitest ("~3.7s faster") hanya valid kalau test file memang
  self-contained; validasi wajib sebelum adopt, 3 failure muncul langsung.
- Reject terukur tetap nilai: hypothesis diuji, metrik lengkap, rollback satu baris.

## Next Priority
Kalau durasi suite jadi masalah nyata (>1 menit), refactor: DB fixture per-file
(`beforeEach` recreate schema) lalu coba `isolate: false` lagi.
