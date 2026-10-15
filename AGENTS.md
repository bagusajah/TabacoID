# Agent Rules — TabacoID repo

Multi-agent repo. **Repo/website/Laporan dimiliki Hermes** (orchestrator,
host orangepi). Agent lain hanyalah kontributor data untuk lane masing-masing.

Every agent MUST read `BATON.md` before working and update it after.
Non-negotiable rules:

## Ownership & lanes

| Lane | Owner | Kontributor data | Directory |
|------|-------|------------------|-----------|
| Repo, website (src/), pipeline, deploy | **Hermes** | — | `src/`, `scripts/`, `public/`, config |
| **Laporan** | **Hermes** | engineering-cycle agent | `docs/reports/*.md` |
| **Trending** | research agent | research agent | `docs/trending/**` (daily + monthly) |
| **Ambience** | ambience agent | ambience agent | `docs/ambience/**` |

- Hermes owns all shared surfaces: `src/`, `scripts/`, `index.html`,
  `public/` (incl. `sitemap.xml`, `metrics.json`), `vercel.json`, CI, and
  the Laporan lane. Others NEVER touch these.
- Data agents (Trending, Ambience): you only ADD markdown files under your
  lane's directory, following your format contract. Nothing else.
- Review lanes (claude/cursor) are read-only advisors; only Hermes applies
  their findings to code.

## Handover protocol (BATON.md)

1. **Before work:** read `BATON.md` → § STATE and § CLAIMS. If another agent
   has an active claim on a file you need, STOP and leave a note in § UPDATES.
2. **Claim before edit:** add a line to § CLAIMS (file → your agent name +
   host) BEFORE writing, remove it after your push succeeds.
3. **After work:** append one entry to § UPDATES (newest first):
   `- YYYY-MM-DD HH:MM | lane | agent@host | what changed | next/notes`
   Keep entries one line. Trim the log to the newest 30 entries.
4. **Update § STATE** row for your lane (last run, last item, status).

## Git rules

- Only commit files from YOUR lane plus the baton itself:
  `git add docs/<your-lane>/ BATON.md` — never `git add -A`.
- Push rejected → `git pull --rebase origin main` → verify no overlap with
  files you touched → push again. NEVER force-push.
- Never push another lane's half-done work.
- Deploy is automatic on push to `main` (Vercel). Verify your content after
  push if you can (https://www.tabaco.id/...).

## Content contracts

- Reports format: existing `docs/reports/*.md` frontmatter conventions.
- Trending format: `docs/TRENDING_FORMAT.md`.
- Ambience format: existing `docs/ambience/*.md` conventions.
