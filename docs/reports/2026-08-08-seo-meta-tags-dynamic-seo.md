---
task_id: t_dfdc4522
objective: OBJ-001
date: 2026-08-08
status: draft
---

# SEO Meta Tags: Per-Route Dynamic SEO + Twitter Cards + og:image

## Engineering Question
Bagaimana memastikan setiap halaman TabacoID memiliki SEO meta tags yang unik dan lengkap (OG, description, canonical, Twitter Card, og:image) untuk semua route termasuk 112 halaman report?

## Method
Audit SEO infrastructure yang sudah ada:
- `index.html` punya 7 static meta tags (description, og:title, og:description, og:type, og:url, JSON-LD)
- `useSEO` hook (`src/hooks/useSEO.ts`) sudah set title, description, og:title, og:description, og:url, canonical per-route
- `SiteLayout.tsx` sudah panggil `useSEO` untuk route `/`, `/reports`, `/about` dengan data unik per route

**Gap yang ditemukan:**
1. `/reports/:slug` (112 halaman) jatuh ke `fallbackSEO` = "Page Not Found" — SEO totally wrong untuk seluruh report pages
2. Tidak ada `og:image` tag sama sekali
3. Tidak ada Twitter Card tags

**Fix (3 files, shortest diff):**

1. **`src/hooks/useSEO.ts`** — Refactor `setMeta` ke luar `useEffect` (pure function), tambah `og:image`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`. Default image fallback ke `/tabacoid-logo.svg`. Total meta tags set: 5 → 10.

2. **`src/pages/ReportDetail.tsx`** — Panggil `useSEO` dengan title + description per-report. Title pakai report title dari markdown `# heading`, description pakai `decision — date`. Sebelumnya: SEO fall through ke "Page Not Found".

3. **`src/pages/Reports.tsx`** — Drive-by fix: pre-existing ESLint error `no-useless-escape` pada `\Z` di regex (line 17). `\Z` bukan valid escape di JS regex → ganti ke `Z` literal. Bug lama yang block `npm run lint`.

4. **`src/components/SiteLayout.tsx`** — Tidak diubah (routeSEO sudah benar, hook update otomatis menambah tags).

## Findings (with measurements)

| Metric | Before | After |
|--------|--------|-------|
| Meta tags per route (useSEO) | 5 (title, desc, og:title, og:desc, og:url) + canonical | **10** (+ og:image, twitter:card, twitter:title, twitter:desc, twitter:image) |
| Routes with correct unique SEO | 3 (/reports/:slug fall to "Page Not Found") | **3 + 112 report pages** with per-report title/description |
| og:image tag | ❌ missing | ✅ present (defaults to logo SVG) |
| Twitter Card tags | ❌ 0 tags | ✅ 4 tags (card, title, description, image) |
| Bundle contains twitter:card | no | **yes** (verified in dist/assets/) |
| `npm run build` | pass | **pass** (5.98s, exit 0) |
| Files changed | — | **3** (useSEO.ts, ReportDetail.tsx, Reports.tsx) |
| `npm run lint` | ❌ 1 error (`no-useless-escape`) | ✅ **0 errors** |
| `npm run check` (tsc) | pass | **pass** (exit 0) |
| `npm run build` | pass | **pass** (6.11s, exit 0) |

Static `index.html` base tags tetap untuk crawlers non-JS. Dynamic tags di-set oleh `useSEO` saat React hydrate.

## Decision
**Adopt** — Menunggu human review untuk push (website change, bukan report-only).

Perubahan ini:
- Fix bug: 112 report pages sekarang punya SEO yang benar (sebelumnya semua "Page Not Found")
- Tambah coverage: og:image + Twitter Cards (sebelumnya 0)
- Net diff minimal: 2 files, refactor satu function jadi pure

## Risk
- **Low risk**: CSR SPA — meta tags di-set client-side setelah hydration. Crawlers yang fully render JS (Googlebot) akan lihat tags. Crawlers JS-disabled hanya lihat static `index.html` (yang punya OG + description default). Ini limitation inherent dari CSR, bukan regression.
- **og:image** pakai SVG — Twitter/Facebook recommended PNG/JPG. Logo SVG masih valid tapi mungkin tidak render di semua social preview. Upgrade path: generate PNG OG image (1200×630) di task terpisah.

## Lessons Learned
1. Task description bilang "no SEO meta tags" — ternyata infrastructure-nya sudah 70% ada (`useSEO` hook + `routeSEO` map). Yang bener-bener missing: og:image, Twitter Cards, dan per-report SEO. Always audit existing code before building new.
2. Bug tertua: `/reports/:slug` tidak ada di `routeSEO` map, jadi fall ke `fallbackSEO`. 112 halaman selama ini terlihat SEO = "Page Not Found" buat search engine. High-impact fix with 6-line diff.
3. Ponytail ladder rung #2 (reuse existing pattern): pakai `useSEO` hook yang sudah ada, extend dengan 1 field + 5 meta tags. No new dependency.

## Next Priority
- Generate dedicated OG image (PNG 1200×630) untuk social preview — ganti fallback SVG
- Pertimbangkan SSR/SSG (vite-ssg atau prerender) kalau SEO untuk non-JS crawlers jadi priority
- Task kedua di backlog: pagination + category filter untuk Reports page (`t_9092075d`)
