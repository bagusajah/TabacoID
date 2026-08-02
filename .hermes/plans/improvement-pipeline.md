# TabacoID Daily Self-Improvement Pipeline

## Vision (authoritative — see docs/VISION.md)
tabaco.id is a **living engineering laboratory** documenting Hermes, an autonomous AI Platform Engineering Agent. The website is the transparent interface into Hermes' engineering activities — not a portfolio or agency site.

**Success metric:** measurable engineering outcomes, NOT commit counts or appearance of productivity.

## Architecture

```
Daily Cron (Hermes, off-peak GLM hours)
  └─ 1. Review objectives + unfinished work
  └─ 2. Assess project health (build status, open tasks)
  └─ 3. Research (answer a specific engineering question)
  └─ 4. Select ONE meaningful task (never multiple unrelated)
  └─ 5. Implement (reason, risk, validation, rollback)
  └─ 6. Validate (npm run build must pass)
  └─ 7. Document (why, what changed, risks, lessons)
  └─ 8. Publish report → user reviews → approve → push
```

## Constraints (hard limits)
- **Vercel Hobby:** 6000 build min/mo, 100 deploys/day, 100GB BW, 1 custom domain
- **GLM Coding Plan:** off-peak preferred (avoid 14:00-18:00 UTC+8 3x quota). One meaningful task per cycle.
- **GCP Cloud Run/Build:** available, strict budget gate, free tier first
- **Max 3 file changes per run** — reversible, reviewable diffs
- **Never auto-push** — human reviews every change

## Hermes Operating Cycle (per Vision doc)
1. Review objectives  2. Review unfinished work  3. Assess health
4. Research  5. Decide priority changes  6. Select ONE task
7. Plan  8. Implement  9. Validate  10. Document  11. Publish report

## Engineering Philosophy
Prefer: simplicity, reliability, automation, documentation, small iterations, reversible changes, evidence-based decisions.
Avoid: feature bloat, premature optimization, unnecessary frameworks, cosmetic work without value, AI busywork.

## Website Sections (target state)
Phase 0: Reframe from studio → engineering lab
Phase 1: Current Objective, Hermes Status, Daily Reports
Phase 2: Architecture, Experiments, Engineering Notes
Phase 3: Metrics dashboard, Failure Reports, Research Library

## Current State (audit date: 2026-08-02)
- **Stack:** Vite + React 18 + TS + Tailwind 3 (CSR SPA)
- **Pages:** Home, Services, Work, About, Contact, 404 — all studio/portfolio framing
- **Critical gaps:** No SEO meta, no SSR/SSG (Google sees empty div), dead deps (framer-motion, zustand unused), useTheme hook exists but unwired
- **Content:** all placeholder/fictional agency copy — needs full rewrite per Vision

## Backlog (re-prioritized for Vision alignment)

### Phase 0: Foundation Reframe (immediate)
1. **Reframe hero + nav** — "engineering laboratory" not "digital product studio"
2. **Strip placeholder agency content** — Services/Work/About rewrite to lab framing
3. **Remove dead deps** — framer-motion, zustand (unused), useTheme (unwired)
4. **SEO basics** — meta tags, OG, JSON-LD Organization

### Phase 1: Lab Infrastructure
5. **Static generation** — migrate to vite-ssg or Astro for crawlable content
6. **Status page** — Hermes current objective, uptime, days running
7. **Daily report feed** — markdown-driven, auto-generated from cron output
8. **robots.txt + sitemap.xml**

### Phase 2: Engineering Depth
9. **Experiments section** — hypothesis/metrics/results structure per Vision
10. **Architecture page** — document the Pi cluster, Hermes, WhatsApp bot, VPS
11. **Engineering notes** — learnings, failure reports (transparency = credibility)
12. **Metrics dashboard** — tasks completed, PRs, interventions, costs

### Phase 3: Growth
13. **Research library** — adopt/reject/experiment decisions
14. **Open source projects** — link real repos
15. **Weekly reviews** — synthesized from daily reports
