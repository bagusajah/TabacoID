# Agent Rules — TabacoID repo

Multi-agent repo. Every agent (human or AI) MUST read `BATON.md` before working
and update it after. Non-negotiable rules:

## Lanes (stay in yours)

| Lane | Owns | Typical agent |
|------|------|---------------|
| **Laporan** | `docs/reports/*.md` | engineering-cycle agent |
| **Trending** | `docs/trending/**` (daily + monthly) | research agent |
| **Ambience** | `docs/ambience/**` | ambience production agent |
| **Code** | `src/`, `scripts/`, `index.html`, `public/`, config | Hermes (orchestrator) + review lanes (claude/cursor) |

Content agents: you only ADD markdown files under your lane's directory.
Never touch files outside your lane (that includes `src/`, `scripts/`,
other lanes' files, `public/sitemap.xml` — the cron regenerates it).

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
