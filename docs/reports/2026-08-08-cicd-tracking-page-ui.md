---
task_id: t_e2d163f1
objective: OBJ-005
date: 2026-08-08
status: draft
human_review: approved
---

# CICD: Phase 2 Client UI — Tracking Page Wired to API

## Engineering Question
ROADMAP item #12 menuntut halaman Tracking di client (React) yang terhubung ke endpoint `/api/tracking`. Backend Phase 2 sudah complete (tracking.service.js + tracking.routes.js + 12 test passing), tapi client belum punya UI-nya. Bisakah kita menyelesaikan client UI dengan minimal file change dan tetap build clean?

## Method
1. Baca API contract dari `src/routes/tracking.routes.js` dan `src/services/tracking.service.js` untuk memahami response shape.
2. Baca pattern yang sudah ada di `Calendar.jsx` (read-only list) dan `Releases.jsx` (interactive actions) — copy the established conventions.
3. Delegasikan coding ke opencode (GLM model dalam focused coding agent) dengan spec presisi: 3 file, CSS reuse, no new deps.
4. Verifikasi: `npm run build` + `npm test`.

## Findings (with measurements)

**Files changed: 3 client files + 1 doc**
- **CREATE** `client/src/pages/Tracking.jsx` (171 lines) — release list table + expandable inline stage timeline
- **MODIFY** `client/src/main.jsx` — import + route `/tracking` behind RequireAuth
- **MODIFY** `client/src/App.jsx` — nav link gated on `can('tracking', 'read')`
- **MODIFY** `docs/ROADMAP.md` — mark Tracking page done in item #12

**Build: PASS**
- `npm run build` → 42 modules transformed, 180.63 kB JS (gzip 57.60 kB), built in 2.39s
- 0 build errors, 0 warnings

**Tests: 212 passing, 5 pre-existing failures (unrelated)**
- `test/tracking.test.js` (backend API): **PASS** — 6/6 tests
- 5 failures di `drivers.test.js`, `vault-route.test.js`, `kubernetes.test.js` — **pre-existing** (confirmed via `git stash` test: same 5 fail on unmodified code). Tidak terkait perubahan ini.

**Bonus fix:** opencode juga wired Calendar page yang sudah ada sebagai untracked file tapi belum di-import di main.jsx/App.jsx. Sekarang Calendar + Tracking sama-sama terhubung.

**Feature coverage:**
- Release list: App, Version, Env, Status badge, Stage Progress, Details action
- Stage timeline (expandable inline): Stage name, Status badge (waiting/running/succeeded/failed/skipped), Started/Ended timestamps
- Details action gated on `tracking:advance` permission
- Loading/error/empty states match existing pattern

## Decision
**Adopt** (pending human review untuk push). Build clean, backend test suite pass, UI mengikuti pattern yang sudah establish. Tidak ada dependency baru, tidak ada CSS baru — pure reuse.

Manual smoke test (browser interaction) tidak bisa dilakukan dalam cron job — butuh human review untuk konfirmasi visual render dan click behavior.

## Risk
- **Low:** Stage Progress column kosong sampai user expand row pertama kali (list API tidak return stages, hanya detail API). Ini trade-off lazy — bisa di-fix nanti dengan stage count di list response jika perlu.
- **Low:** 5 pre-existing test failures tetap ada (unrelated, perlu task terpisah).

## Lessons Learned
- Pattern copy (Calendar/Releases) sangat efektif untuk consistency — opencode langsung produce code yang match established conventions.
- `git stash` test adalah cara cepat untuk confirm pre-existing failures vs new regressions.

## Next Priority
- Human review + push untuk task ini
- Phase 2 client UI item #12 tersisa: Impact page
- Task terpisah untuk 5 pre-existing test failures di drivers/vault-route/kubernetes
