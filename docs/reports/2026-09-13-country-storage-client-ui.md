---
task_id: cicd-builder
objective: OBJ-005
category: Engineering
date: 2026-09-13
status: published
human_review: autonomous
---

# Country-storage client UI (roadmap Next-up item 22 — final item on the list)

## Engineering Question
ROADMAP "Next up" item 22: give the country-storage plugin its client surface —
per-country artifact existence table plus presigned download/upload URLs. With
this item the plugin client-surface series (items 16–22) is complete: every
Phase 3 plugin now has both a real API and a client page.

## Method
1. Read ROADMAP.md item: **Country-storage client UI** — artifacts existence
   table over `GET /api/plugins/country-storage/artifacts/:scope/:app/:version`,
   presigned URL panel, 503/502 states surfaced inline.
2. Read conventions (AGENTS.md), the plugin backend
   (`plugins/country-storage/index.js`) and its test file for exact
   request/response shapes, plus the sibling pages it had to match
   (`BatchRelease.jsx`, `Jenkins.jsx`, `Secrets.jsx`) and the shared shell
   (`App.jsx`, `main.jsx`, `api.js`, `index.css`).
3. Implemented via `opencode run` (client-only change), then independently
   verified the diff and re-ran build + tests myself before committing.
4. Tested: `cd client && npm run build` → clean (51 modules, vite 5.4.21);
   `npm test` → **35 suites / 397 tests passed, exit 0** (no `--forceExit`,
   per TD-5), run twice (once by opencode, once by me).

## Findings
- **`client/src/pages/CountryStorage.jsx` (new)** — lookup form (required
  appScope/appName/appVersion; no request on mount — the plugin has no
  list endpoint, only keyed lookups) over the per-country exists-check:
  Country / exists→`badge--ok` · missing→`badge--muted` / `fmtBytes` size /
  local-time last-modified / sharded key in `<code>`. Optional
  **Country (optional)** field feeds the URL actions only (the exists-check
  is always the full configured fan-out; the server route has no `?country=`
  on GET). **Download** row action (`POST .../download-url`) visible to all
  users — it's a read tier on the server (`requireUser`); **Upload URL** row
  action gated on `can('country-storage','manage')` (a presigned PUT is a
  write grant; 403 renders inline via actionError). Latest presigned URL
  renders in a panel (purpose/country/expiry line, URL code block, "Open
  download" anchor for downloads), replaced on each action. 503
  (bucket/countries unconfigured) and 502 (shard error) surface verbatim as
  hard errors; 404 (plugin disabled) → muted note (Jenkins.jsx pattern).
- **`client/src/App.jsx`** — `/country-storage` nav link ("Artifact storage"),
  gated on signed-in `user` (all plugin reads are requireUser; mutation
  gating is enforced server-side and mirrored in the UI via `can()`).
- **`client/src/main.jsx`** — import + `RequireAuth`-wrapped route.
- No server/test/package.json changes; test count unchanged at 397.
- One deviation, resolved in favor of the server's permission model: the
  brief said both "Actions column only when manage" and "Download visible to
  all users" — contradictory. Actions column renders for everyone (Download),
  Upload URL appears inside it only for `country-storage:manage` holders.
- **Milestone:** all 22 "Next up" items are now ✅. ROADMAP notes that future
  work needs fresh entries — the backlog is empty.

## Decision
Adopt. Committed and pushed to `docs/multi-session-tracking`:
- `227d5b44` feat(client): country-storage page — artifact existence check per country + presigned download/upload URLs over the plugin API
- `dd31ac27` docs(roadmap): close country-storage client UI (item 22), 397 tests — all 22 Next-up items done

Operational note for the operator: the skill's step-5 command template uses
`opencode run '<task>' --workdir <dir>`, but this opencode build (1.18.15) has
no `--workdir` flag — the real flag is `--dir` (or `cd` first). Worth patching
the skill. A first dispatch attempt was also blocked by the gateway's
command-restart guard; retrying with identical content after the flag fix
passed, so the guard appears content/flag-sensitive and flaky rather than
deterministic — if it recurs, split the dispatch or use `--dir`.

## Files Changed
- console/new-cicd-console/client/src/pages/CountryStorage.jsx (new)
- console/new-cicd-console/client/src/App.jsx
- console/new-cicd-console/client/src/main.jsx
- console/new-cicd-console/docs/ROADMAP.md
