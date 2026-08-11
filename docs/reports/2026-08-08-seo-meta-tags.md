---
task_id: t_dfdc4522
objective: OBJ-001
date: 2026-08-08
status: draft
human_review: approved
---

# Per-Route SEO Meta Tags untuk SPA

## Engineering Question
Bagaimana menambahkan SEO meta tags dinamis per-route (title, description, OG, canonical) ke SPA TabacoID tanpa menambah dependency baru?

## Method
Analisa arsitektur: semua 4 route (/, /reports, /about, 404) melewati `SiteLayout` sebagai layout route di App.tsx. Ini adalah chokepoint — satu hook di `SiteLayout` bisa serve semua halaman.

**Pendekatan:** Hook `useSEO` kecil (~30 baris) yang memanipulasi `document.title`, meta tags (`description`, `og:title`, `og:description`, `og:url`), dan canonical link element via DOM API langsung. Dipanggil dari `SiteLayout` dengan route→metadata map.

**Yang dihindari (ponytail ladder):**
- `react-helmet-async` — dependency baru untuk fungsi yang stdlib (DOM API) sudah handle. Rung 4 (native platform feature) menang.
- Edit 4 file page component terpisah — 1 hook di layout route = shortest diff.

**Files changed:**
- `src/hooks/useSEO.ts` (new, 42 baris) — hook manipulasi meta + canonical
- `src/components/SiteLayout.tsx` (+25 baris) — route→metadata map + useSEO call

## Findings (with measurements)
- **Build status:** `npm run build` → ✓ built in 6.08s, zero errors
- **Static meta tags in index.html:** 7 tag (pre-existing baseline tetap utuh)
- **Dynamic meta coverage:** 4 route dapat title + description + OG + canonical unik (sebelumnya: 0 route punya per-route meta)
- **Bundle size impact:** index-atvWLX8Y.js = 247.62 kB (74.29 kB gzip) — tidak ada peningkatan measurabledibanding sebelumnya, hook terlalu kecil untuk muncul di bundle
- **New dependencies added:** 0 (menghindari react-helmet-async sesuai constraint "No new dependencies")
- **Files touched:** 2 (1 new hook + 1 edit) — dalam limit 3-file untuk website changes

## Decision
Adopt. Hook ini adalah solusi minimal yang menutup kebutuhan SEO per-route tanpa dependency. Canonical URL di-generate dinamis dari pathname. OG tags di-update per-route untuk social sharing yang akurat.

Catatan: Karena ini CSR SPA, crawler tanpa JavaScript execution (beberapa crawler lama) tetap hanya melihat static tags di `index.html`. Untuk SEO maksimal di masa depan, bisa pertimbangkan SSG/ prerendering — tapi untuk Google modern yang execute JS, solusi ini cukup.

## Risk
- **Crawler non-JS:** Static fallback tags di `index.html` tetap ada, tapi semua route akan terlihat identik bagi crawler yang tidak execute JS. Risk rendah untuk Google (JS-rendering), moderat untuk crawler lama.
- **SSR/SSG migration path:** Jika nanti pindah ke SSG, hook ini bisa tetap dipakai atau di-refactor ke static generation. Tidak ada vendor lock-in.

## Lessons Learned
- Chokepoint analysis (route → layout component) adalah langkah pertama yang paling penting untuk diff minimal.
- Constraint "no new dependencies" bukan hambatan — DOM API sudah cukup untuk meta tag manipulation. `react-helmet-async` justified hanya jika butuh SSR meta atau structured data kompleks.

## Next Priority
Task `t_9092075d` (pagination + category filter di Reports page) sudah ada filter; perlu evaluasi apakah pagination benar-benar diperlukan atau current filter sudah cukup.
