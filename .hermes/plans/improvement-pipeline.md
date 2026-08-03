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

---

## Multi-System Backlog

### Webreader (`~/webreader`, Docker api:8787 + nginx:8181)
W1. **Container reliability audit** — measure uptime, restart frequency, recovery time after failure
W2. **Token refresh monitoring** — how often does TICMI token expire and what's the refresh failure rate
W3. **API error rate baseline** — what % of requests return 4xx/5xx over a week
W4. **Docker image size optimization** — current image size, layers that can be pruned
W5. **Health check endpoint** — does webreader have /health, is it wired to Docker HEALTHCHECK

### Hermes Infrastructure
H1. **Dashboard availability** — actual uptime % over 15 days (watchdog log analysis)
H2. **Gateway memory trend** — is gateway RSS growing over time (leak detection)
H3. **TUI session cleanup** — 6 idle sessions waste 914 MB, automate cleanup of stale sessions
H4. **Log rotation** — agent.log is 1.7 MB and growing, what's the rotation policy

### VPS (host.tabaco.id)
V1. **TLS certificate expiry monitoring** — when do certs expire, is auto-renewal working
V2. **Nginx config audit** — are there stale server blocks, security headers present

### Hermes Self-Improvement
HE1. **Memory efficiency audit** — memory at 94%, profile at 97%. Consolidate, prune stale entries, reclaim space.
HE2. **Skill quality review** — are skills being used? which ones are stale/pruned? skill usage data from .usage.json
HE3. **Cron effectiveness analysis** — which cron jobs produce actionable output vs noise? delivery success rate?
HE4. **Prompt optimization** — does the daily cycle prompt produce good results? measure output quality over time
HE5. **Config audit** — config.yaml is 218 lines. Are there stale providers, unused toolsets, dead settings?
HE6. **Error pattern analysis** — what are the top recurring errors in errors.log? root cause + fix
HE7. **Model cost tracking** — how much does each cron cycle cost (tokens, API calls)? baseline for optimization

### Host OS (Orange Pi RK3588, Ubuntu)
OS1. **System log audit** — journalctl disk usage, logrotate config, retention policy. Is journald eating disk?
OS2. **dmesg/kernel errors** — hardware errors, thermal throttling, I/O errors, MMC/NVMe health
OS3. **APT security audit** — how many pending updates? any security-critical packages? last upgrade date?
OS4. **Docker daemon health** — log rotation, image disk usage, dangling images/volumes, prune policy
OS5. **Network audit** — what's listening on which ports? any unexpected services? DNS config (many :53 listeners spotted)
OS6. **Thermal/CPU throttling history** — has the Pi ever throttled? freq scaling behavior under load
OS7. **systemd failed units** — any failed services? orphaned units? stale timers?
OS8. **Cron (system-level) audit** — /etc/cron.d, crontab, are there system crons conflicting with Hermes crons?
OS9. **Disk health** — NVMe SMART data, wear leveling, I/O latency baseline
OS10. **zram config audit** — swap is zram (3.9G), is compression ratio good? when does it get pressured?
