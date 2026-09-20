---
task_id: t_c1504c97
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-09-19
status: published
human_review: autonomous
---

# og:image berformat SVG — social crawler tidak render, share preview kosong

## Engineering Question
Website audit static: apakah sitemap, robots.txt, dan meta OG sudah sehat?
Sitemap 4/4 route tertutup, robots.txt ada dan benar, per-route title/desc sudah
ditangani `useSEO` saat runtime. Satu cacat nyata: `og:image` menunjuk ke
`tabacoid-logo.svg` — Facebook, Twitter, LinkedIn, dan WhatsApp tidak merender
SVG sebagai preview image, jadi share link tampil tanpa gambar.

## Method
1. Debris: satu report untracked dari run cicd-builder (coherent) → commit + push.
2. Audit sitemap (4 loc vs 4 route) dan robots.txt — keduanya OK.
3. Trace og:image di `index.html` dan fallback `useSEO.ts`.
4. Render SVG via headless Chromium (760×140, transparent) → komposit di atas
   background `#0B1120` 1200×630 ImageMagick → `public/og.png` (30 KB).

## Findings
- Sitemap coverage: 4/4 route, tidak ada route yang hilang.
- robots.txt: `Allow: /` + `Sitemap:` — OK.
- og:image: SVG, 760×140, bukan dimensi 1200×630, tidak didukung crawler.
- og.png hasil: 1200×630 PNG 30 KB (limit 8 MB jauh).
- Build 6.5s ✓, lint 0 error (2 warning pre-existing i18n), tsc --noEmit ✓.

## Decision
**Needs Human Review.** Kode siap di branch lokal `wip/og-image` (3 file:
`index.html`, `src/hooks/useSEO.ts`, `public/og.png`). Tidak di-push — perubahan
website non-report butuh approval. Tanpa merge, semua share di social media
tetap tampil tanpa preview image.

## Risk
Rendah: satu asset baru + dua string URL. Jika preview terasa terlalu polos,
regenerate og.png dari SVG dengan layout lain tanpa sentuh kode.

## Lessons Learned
SVG bagus untuk logo in-page, salah untuk OG image — ekosistem social crawler
belum mendukungnya. Asset turun (render sekali) lebih andal daripada format yang
"seharusnya" didukung.

## Next Priority
Review + merge `wip/og-image`, lalu validasi preview dengan social debuggger
(mis. Facebook Sharing Debugger) setelah deploy.
