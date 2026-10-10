---
task_id: t_c97b7ea8
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-10-10
status: published
human_review: autonomous
---

# TD-16 Increment: simple-git 3→4 di CICD Release Console

## Engineering Question
Apakah major bump `simple-git` 3→4 aman untuk suite CICD Release Console, dan berapa delta npm audit findings yang dihasilkan?

## Method
1. Board kosong + floor check: `cicd-console` 0 task dalam 7 hari → task TD-16 dibuat dan di-claim (`t_c97b7ea8`).
2. Baseline audit (`npm audit --json`): **17 findings** (3 critical, 9 high, 3 moderate, 2 low) — cocok dengan catatan TD-16 di ROADMAP.
3. `npm install simple-git@4` → 4.0.2, lalu full vitest suite (tanpa flag — flag `--forceExit` dilarang, TD-5).
4. Delta audit diukur ulang, advisories critical yang hilang diverifikasi per-paket.
5. Baris TD-16 di `console/new-cicd-console/docs/ROADMAP.md` diupdate, commit + push ke `docs/multi-session-tracking`.

## Findings (with measurements)
- **npm_audit_findings: 17 → 15** (critical 3 → 1, high 9, moderate 3, low 2)
- **Critical yang hilang:** seluruh critical `simple-git` (multiple advisories di 3.x). Critical tersisa hanya `tar` via chain sqlite3→node-gyp (build tooling, bukan runtime path) — sesuai catatan TD-16.
- **Test suite: 406/406 green** (36 files, 19.7s), clean exit tanpa flag.
- `package.json` sekarang `"simple-git": "^4.0.2"`; `SimpleGitDriver` tidak perlu perubahan kode — API 4.x kompatibel dengan pemakaian saat ini.
- Commit `222581c4` pushed ke `github.com/bagusajah/cicd-release-console` (branch `docs/multi-session-tracking`).

## Decision
Adopt — simple-git 4.0.2 dipakai, TD-16 row diupdate dengan baseline baru 15 findings. Sisa major bumps (`aws-sdk` v2→v3, `sequelize` 6→7, nodemon-chain `braces`/`semver`, `node-gyp` 11) tetap deferred ke increment berikutnya sesuai strategi TD-16.

## Risk
Major bump semestinya bisa mengubah perilaku edge-case git (output parsing, auth). Mitigasi: suite mencakup git driver tests dan semuanya hijau tanpa perubahan kode. Risiko residual rendah karena driver git dormant di deployment aktif (belum ada `DRIVER_GIT` produksi yang berjalan di luar test).

## Lessons Learned
- Skill menulis `references/cicd-console-deployment.md` + ROADMAP di root repo — keduanya ternyata tidak ada di path itu (ROADMAP ada di `console/new-cicd-console/docs/`). Probe path dulu sebelum percaya dokumentasi.
- Error log pagi ini (journal_mode=delete vs WAL, 3 baris) ternyata sisa pre-fix jam 08:12 — config ketiga profil sudah `wal` dan tidak ada sisa `journal_mode: delete` di disk. Tidak ada aksi lanjutan.

## Next Priority
TD-16 sisa: `aws-sdk` v2→v3 (paling besar, sekalian drag `uuid`) atau `sequelize` 6→7 (risiko API change tertinggi). Builder cron berikutnya bisa lanjut dari baris TD-16 yang sudah terupdate.
