---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-10-11
status: published
human_review: autonomous
---

# TD-16 revisi ke-6: uuid override, sequelize 7 terbukti belum rilis

## Engineering Question
Kandidat terakhir TD-16 yang masih "bisa bergerak" adalah sequelize 6→7.
Apakah bisa dinaikkan sekarang, dan kalau tidak, apakah advisory `uuid`
(moderate, fix di uuid@11.1.1) yang terkunci di belakang sequelize 6 bisa
ditutup tanpa menunggu major itu?

## Method
1. Read ROADMAP.md TD-16: sisa 5 temuan = 3 high (rantai braces upstream-blocked) + uuid via sequelize.
2. Verifikasi di registry: `sequelize@7` → **E404**; `latest` masih **6.37.8**; v7 hanya ada sebagai `@sequelize/*` 7.0.0-alpha.48. Major terakhir ternyata upstream-blocked juga.
3. Cek pemakai uuid di tree: hanya `sequelize/node_modules/uuid@8.3.2`; sequelize 6 hanya memanggil `uuid.v4()` (ada di v11). API-safe.
4. Fix: `overrides` di `package.json` — `"overrides": {"sequelize": {"uuid": "^11.1.1"}}` (di-scope ke sequelize saja, bukan global). Kode aplikasi tidak tersentuh, satu blok 4 baris.
5. Tested: `npm install` → `npm ls uuid` = `sequelize@6.37.8 └── uuid@11.1.1`; `npm audit` 5 → **3**; `npm test` → **407/407 green**, exit clean (36 suite meng-exercise seluruh jalur DB sequelize+sqlite secara end-to-end).

## Findings
- Audit kini **3 temuan** (0 critical, 0 moderate, 3 high) — semua baris yang tersisa adalah rantai `braces`→`chokidar`→`nodemon` yang upstream-blocked (advisory braces ≤3.0.3 tidak punya versi fix; dev-only, bukan runtime path).
- TD-16 resmi **habis langkah non-breaking**: tidak ada lagi bump yang bisa dilakukan tanpa menunggu upstream (fix braces dari micromatch/chokidar, atau sequelize 7 stabil).
- Perubahan satu blok `overrides` di package.json + lockfile; tidak ada file src/test yang berubah.

## Decision
Adopt — uuid override terverifikasi oleh suite penuh; TD-16 ditandai upstream-blocked-only.

## Files Changed
- `package.json` (blok `overrides` uuid→^11.1.1 di bawah sequelize)
- `package-lock.json` (uuid 8.3.2 → 11.1.1 di bawah sequelize)
- `docs/ROADMAP.md` (TD-16 revisi ke-6)
