# TabacoID Changelog

All notable changes to tabaco.id engineering laboratory.

## [Unreleased]

### 2026-08-04 — Host Memory Reclamation + Journal Cap
- **[Operations]** Cleanup idle desktop applets (nm-applet, blueman-applet, update-manager) di headless XFCE. Hemat 236 MB.
- **[Operations]** Set `RuntimeMaxUse=100M` di journald.conf — volatile journal growth sebelumnya unbounded (~19M/hr).
- **[Metric]** Available RAM: 3.9G → 4.1G (+200 MiB). Desktop applet processes: 3 → 0.
- **[Finding]** TUI dashboard orphan sessions: 3 Node.js processes (~494 MB) dari browser tab yang ditutup tanpa WebSocket detach. Reaper logic (30min TTL) tidak trigger karena detach event tidak ter-register.
- **[Decision]** Adopt cleanup + journal cap. TUI orphan perlu code fix — Needs Human Review.
- Files: `docs/reports/2026-08-04.md`, `CHANGELOG.md`, `/etc/systemd/journald.conf`

### 2026-08-03 — Rate-Limit (429) Audit
- **[Operations]** Audit z.ai API 429 rate-limit patterns dari log analysis. Tiga subagent paralel dispatched untuk root cause, temporal analysis, dan config audit.
- **[Finding]** Diagnostic grep artifact terdeteksi: bare `grep "429"` menghasilkan 93.8% false positive (228 hits → 14 real) karena session ID `4295b1` match literal "429". Fix: gunakan `grep -E "RateLimitError|status=429|HTTP 429"`.
- **[Finding]** Real 429 events: 14 dalam 7 hari, hanya 2 main-loop throttle. Retry success rate 100%, zero user-visible failures, latency overhead ~7s.
- **[Finding]** Finance crons (IDX Daily Digest 16:00, IDX Insider Alert 18:00 WIB) jalan di z.ai peak hours (13:00-17:00 WIB). Needs Human Review untuk reschedule ke off-peak.
- **[Decision]** Adopt methodology fix; Reject premature concurrency throttling (0.6% throttle rate tidak justifikasi).
- Files: `docs/reports/2026-08-03-rate-limit-audit.md` (baru), `CHANGELOG.md`

### 2026-08-02 — Phase 0 Kickoff
- **[Reframe]** Aligned codebase with Vision doc — tabaco.id is now an engineering laboratory, not a studio portfolio
  - Files: `docs/VISION.md`, `.hermes/plans/improvement-pipeline.md`, Hermes skill, `src/pages/Home.tsx`, `index.html`
  - Impact: hero copy, SEO meta tags, operating cycle, and improvement backlog now match Vision
  - Build: passing (1650 modules, 0 errors)

### 2026-08-02 — Cycle 2: Navigation & Agency Copy Cleanup
- **[Fix]** Broken `/experiments` link in About hero → pointed to nonexistent route, caused 404. Corrected to `/work`.
- **[Reframe]** Footer copy still said "digital product studio" — contradicted hero ("Not a studio"). Rewritten to lab framing.
- **[Reframe]** Contact page stripped of agency remnants ("website redesigns", "project brief", `/services` orphan link). Rewritten to engineering-lab framing.
  - Files: `src/pages/About.tsx`, `src/components/SiteLayout.tsx`, `src/pages/Contact.tsx`
  - Build: passing (1650 modules, 4.97s, lint clean)

### 2026-08-02 — Cycle 3: Dead Dependency Removal
- **[Cleanup]** Hapus dead code yang di-tambah masa studio tapi gak pernah dipakai setelah Phase 0 reframe:
  - `framer-motion` (^11.18.2) — 0 import di seluruh `src/`. Dependency paling berat di daftar (drag transitive deps).
  - `zustand` (^5.0.3) — 0 import. Dead state-management code.
  - `src/hooks/useTheme.ts` — orphaned hook, 0 caller. Ngapain pertahankan kalau gak terhubung ke UI apa pun.
- Files: `package.json` (deps removed), `package-lock.json` (regen oleh npm), `src/hooks/useTheme.ts` (deleted).
- Outcome terukur: `npm install` bersih 4 package (framer-motion + 3 transitive deps hilang), audit surface turun, install time lebih cepat, CVE tracking lebih ringan.
- Build: passing (1650 modules, 5.07s). Lint: clean.
- Bundle size unchanged (`index-BAQpD0Im.js` 219.66 kB) — expected, karena dead deps gak pernah masuk import graph. Win-nya di install footprint + maintenance, bukan runtime bundle.

### 2026-08-02 — Cycle 4: SEO JSON-LD Organization
- **[SEO]** Tambah `Organization` JSON-LD structured data di `index.html` — menutup item terakhir Phase 0.4 (SEO basics). Meta tags + Open Graph sudah ada dari Phase 0 kickoff; JSON-LD belum.
- Alasan: mesin pencari (Google, Bing) mengkonsumsi JSON-LD untuk rich results dan entity recognition. Untuk situs lab yang ingin ditemukan sebagai entitas yang jelas (bukan studio ambigu), structured data adalah baseline, bukan opsional. Tanpa ini, crawler cuma lihat teks meta description biasa.
- Schema fields: `@type: Organization`, name (TabacoID), url, description (lab framing), email (dari `src/data/site.ts` contactEmail).
- Risiko: sangat rendah. JSON-LD adalah data statis di `<head>`, gak ada runtime cost, gak nge-hook ke React lifecycle. Rollback = hapus satu `<script>` block.
- Validasi: build passing (1650 modules, 4.90s). Lint clean. `index.html` naik 1.06 kB → 1.46 kB (gzip 0.52 → 0.63 kB).
- File: `index.html`

### 2026-08-03 — Phase 1.1: robots.txt + sitemap.xml
- **[SEO]** Tambah `public/robots.txt` dan `public/sitemap.xml` — item pertama Phase 1 (Lab Infrastructure). Modal crawlability: search engine sekarang tahu URL mana yang boleh di-crawl dan kapan terakhir diupdate.
- Alasan: tanpa robots.txt, crawler tidak punya signal allow/disallow dan tidak ada referensi ke sitemap. Tanpa sitemap, penemuan URL (terutama SPA CSR) lambat dan tidak terjamin. Dua file statis ini adalah baseline infrastruktur SEO, bukan optimisasi.
- Routes di sitemap: `/`, `/work`, `/about`, `/contact` (4 nav items dari `src/data/site.ts`). Route `/services` sengaja tidak dimasukkan — itu orphan route (tidak ada di nav), perlu keputusan content terpisah.
- Risiko: sangat rendah. Dua file statis di `public/`, Vite copy apa adanya ke `dist/`. Zero runtime cost, zero dependency. Rollback = hapus 2 file.
- Validasi: build passing (1650 modules, 4.90s). Lint clean. Kedua file terverifikasi ter-copy ke `dist/`.
- Files: `public/robots.txt`, `public/sitemap.xml`

### Planned (Phase 0 — Foundation)
- ~~Rebrand from "digital product studio" to "Hermes Engineering Laboratory"~~ ✓ (hero done, remaining pages next)
- ~~Remove dead deps (framer-motion, zustand, useTheme)~~ ✓ (Cycle 3)
- ~~SEO basics (meta tags, OG, JSON-LD Organization)~~ ✓ (meta/OG in Phase 0, JSON-LD in Cycle 4)
- Rewrite Services/Work/About/Contact pages to lab framing
- New page structure: Dashboard / Experiments / Reports / Architecture / Notes
- Static site generation (vite-ssg)
