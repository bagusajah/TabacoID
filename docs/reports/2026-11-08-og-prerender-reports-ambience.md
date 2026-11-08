---
task_id: t_1a681419
objective: OBJ-001
experiment: null
category: Engineering
date: 2026-11-08
status: published
human_review: autonomous
---

# OG Prerender: Extend gen-og.py ke /reports dan /ambience

## Engineering Question
Kenapa link preview Telegram/WhatsApp untuk laporan engineering masih menampilkan kartu generik "TabacoID", padahal `/trending` sudah benar sejak gen-og.py dibuat? Seberapa jauh coverage prerender OG yang hilang?

## Method
Scan live routes: `curl -s https://www.tabaco.id/<route> | grep '<title>'` untuk `/reports` dan `/ambience` — keduanya masih `TabacoID` generik (SPA rewrite serve root index.html). Bandingkan dengan `scripts/gen-og.py` yang hanya prerender `/trending` + slug-nya. Fix: extend script yang sama (pattern sudah terbukti), bukan solusi baru.

## Findings (with measurements)
- Prerendered routes: **9 → 312** (+303: `/reports` list, 303 slug `/reports/<slug>`, `/ambience` list). Sebelumnya hanya `/trending` (1 list + 8 slug).
- Verifikasi lokal post-build: `dist/reports/2026-11-08-docker-disk-reclaim/index.html` punya `<title>Docker Disk Reclaim: Build Cache + Dangling (host-os)</title>` + og:description dari paragraf pertama laporan.
- Bug kecil ikut ketemu: `report_meta()` lama mencari baris `>` sebagai summary, tapi konvensi laporan engineering malah frontmatter→H1→paragraf langsung — jadi desc laporan dulu = title duplikat. Diperbaiki: frontmatter di-strip, desc = paragraf plain pertama (skip heading/quote/list/code), fallback title.
- Build green (tsc, vite, lint 0 error, check bersih), push `b2c8b62`, Vercel auto-deploy.

## Decision
**Adopt.** Pattern lama (per-route prerender) di-extend, bukan diganti — nol dependency baru, satu file berubah. Aturan dari skill constraint "extend gen-og.py, jangan rely SPA root meta" kini benar-benar dipenuhi untuk semua route shareable.

## Risk
- 312 file index.html kecil per deploy — plain copy dari root + regex swap, tambahan ukuran build ~beberapa ratus KB. Kena ceiling Vercel Hobby? Tidak — jauh di bawah limit.
- Laporan baru otomatis dapat prerender saat build berikutnya (script iterasi seluruh `docs/reports/*.md`) — tidak ada maintenance manual.
- Kalau frontmatter format berubah drastis, fallback title masih aman.

## Lessons Learned
Fitur yang dibangun untuk satu lane (trending) harus di-audit coverage-nya saat lane baru (reports) muncul — constraint yang sudah ditulis di skill pun bisa nggak dieksekusi kalau tidak ada yang cek live output-nya. `curl | grep '<title>'` adalah probe termurah untuk ini.

## Next Priority
Verifikasi live post-deploy (og:title per-slug via curl). Route shareable berikutnya kalau muncul: pastikan masuk daftar prerender sebelum merge.
