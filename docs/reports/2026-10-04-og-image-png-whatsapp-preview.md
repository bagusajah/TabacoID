---
task_id: t_79db69cb
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-10-04
status: published
human_review: autonomous
---

# Og-image SVG → PNG: Link Preview WhatsApp/FB/X Sekarang Render

## Engineering Question
Kenapa share link www.tabaco.id di WhatsApp tampil polos tanpa gambar preview?

## Method
Audit head HTML + meta pipeline:
1. `index.html` dan `useSEO.ts` (default image) sama-sama mengarah ke `https://www.tabaco.id/tabacoid-logo.svg` — SVG 760×140.
2. Cek fakta platform: WhatsApp, Facebook, dan X tidak merender SVG sebagai `og:image` — mereka butuh raster (PNG/JPG/WebP) dengan rasio ~1.91:1 (rekomendasi 1200×630).
3. Generate `public/og-image.png` 1200×630 via PIL: background navy + grid halus, tile gradient brand (#5A4DFF→#111827) dengan glyph "T" dari logo SVG, teks "TabacoID / AI does real software engineering." Font DejaVu (satu-satunya TTF tersedia di Pi).
4. Patch: `index.html` (og:image → PNG + `og:image:width/height`, `twitter:card` → `summary_large_image`), `useSEO.ts` (default image + twitter:card).
5. Validasi: `npm run lint` (0 errors), `npm run check` (tsc bersih), `npm run build` ✓ 6.7s, `dist/og-image.png` ikut ter-build.

## Findings
- `og_image_format`: SVG 760×140 (unrenderable di WA/FB/X) → **PNG 1200×630, 20.5 KB** (spesifikasi og:image compliant)
- `twitter:card`: summary → **summary_large_image** (preview besar di X)
- Audit sampingan: i18n lengkap 101/101 keys EN=ID; sitemap sinkron dengan routes; `metrics.json` live = repo (deploy Vercel fresh); dead deps framer-motion/zustand sudah tidak ada — backlog item lama basi.

## Decision
**Adopt.** PNG og-image adalah satu-satunya cara link preview muncul di WhatsApp — dan WhatsApp adalah kanal share utama user. Perubahan kode (index.html, useSEO.ts, og-image.png) **tidak di-push**: menunggu review manusia, konsisten dengan push policy (non-report changes). Report ini publish via pipeline biasa.

## Risk
Rendah. PNG 20 KB, tidak menyentuh bundle JS. Kalau desain og-image kurang pas, tinggal regenerate script yang sama (`/tmp/gen_og.py` — sebaiknya dipindah ke `scripts/` saat review). Crawler WA/FB bisa cache preview lama beberapa hari; kalau masih tampil polos setelah deploy, itu cache, bukan bug.

## Lessons Learned
- SVG adalah pilihan default yang salah untuk og:image — semua crawler utama menolaknya. Logo SVG tetap dipakai untuk favicon dan nav (itu benar), hanya preview image yang butuh raster.
- Board sempat kosong total; floor check 7-hari menunjukkan `tabacoID-website` = 0 — task ini juga mengisi floor tersebut.

## Next Priority
- `<html lang="en">` statis padahal situs bilingual — toggle bahasa sebaiknya update `document.documentElement.lang` (a11y + SEO). Satu baris di LanguageToggle.
- Pindahkan `gen_og.py` ke `scripts/` agar og-image bisa diregenerate.
