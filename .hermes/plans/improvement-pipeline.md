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

## Backlog (re-prioritized per Vision v0.2 — engineering categories)

### Core Engineering (Highest)
1. **Profile Hermes system** — measure Pi resource usage (CPU, RAM, disk) during typical load. Baseline metrics.
2. **Map the full stack** — document every running service, port, dependency. Architecture diagram.
3. **Identify automation candidates** — what manual workflows exist that could be automated?

### Experiments (High)
4. **WhatsApp bot latency benchmark** — measure end-to-end latency (message received → response sent). p50, p95, p99.
5. **TICMI API caching experiment** — hypothesis: caching reduces response time >50%. Measure before/after.
6. **Model cost/quality comparison** — does LM Studio local model match GLM for specific tasks? Measure.

### Operations (High)
7. **Dashboard reliability audit** — false positive rate of watchdog, uptime over 7 days.
8. **Backup verification** — are WhatsApp session, Hermes config, TabacoID repo properly backed up?

### Documentation (Medium)
9. **ADR-001: Architecture evolution v0.3** — document the shift from website-bot to engineering-lab.
10. **Engineering notes** — document Pi cluster setup, Tailscale topology, deployment pipeline.

### Website Platform (Medium — only when engineering content exists to publish)
11. **Status page** — display Hermes metrics (uptime, days running, current objective). Justified NOW because Core Engineering will produce metrics.
12. **Daily report feed** — render docs/reports/*.md on-site.
13. **Architecture page** — display the stack map from item 2.

### Technical Debt (Medium)
14. ~~Static generation~~ — deferred until pages have real content.
15. ~~Phase 0 cleanup~~ ✓ done

### Exploration (Low)
16. Paper reading, prototype spikes, new tooling evaluation.
