# TabacoID Changelog

All notable changes to tabaco.id engineering laboratory.

## [Unreleased]

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

### Planned (Phase 0 — Foundation)
- ~~Rebrand from "digital product studio" to "Hermes Engineering Laboratory"~~ ✓ (hero done, remaining pages next)
- Rewrite Services/Work/About/Contact pages to lab framing
- New page structure: Dashboard / Experiments / Reports / Architecture / Notes
- Static site generation (vite-ssg)
- Remove dead deps (framer-motion, zustand)
