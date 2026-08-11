---
task_id: t_0fdd0707
objective: OBJ-005
date: 2026-08-08
status: draft
human_review: approved
---

# CICD Phase 2 Client UI — Calendar Page Wired to API

## Engineering Question
Bisakah Calendar page di CI/CD console client di-wire ke `/api/calendar` endpoints dengan mengikuti pattern yang sudah ada (Apps.jsx), tanpa menambah dependency baru?

## Method
Task ini di-delegate ke opencode (GLM coding agent) dengan spec yang presisi — reference Apps.jsx sebagai pattern, API contract dari `calendar.routes.js` + `calendar.service.js`. Setelah opencode selesai, saya verifikasi manual:

1. **Read API contract** — `calendar.routes.js` (GET /bookings, GET /bookings/:id, POST /check, POST /bookings, PUT/DELETE /bookings/:id, GET /blackouts) dan `calendar.service.js` untuk data shape (nested release/environment/creator associations).
2. **Verify output** — read Calendar.jsx end-to-end, konfirmasi route di main.jsx dan nav link di App.jsx.
3. **Scope audit** — opencode juga modify `release.service.js` + `release.test.js` (notification/log sink wiring, scope task `t_3c8c040d`). Reverted semua out-of-scope changes.
4. **Build** — `npm run build` di `client/`, dua kali (sebelum dan sesudah revert), sama: 41 modules, 0 errors.

## Findings (with measurements)

| Metric | Value |
|--------|-------|
| Build status | ✓ 41 modules transformed, 0 errors |
| Build time | 2.23s |
| Bundle size (gzipped JS) | 57.05 kB (sama dengan sebelumnya — no bloat) |
| New dependencies added | 0 |
| Files changed | 3 client files + 1 doc (Calendar.jsx baru, main.jsx route, App.jsx nav, ROADMAP.md) |
| Lines in Calendar.jsx | 86 lines (vs 65 di Apps.jsx — sedikit lebih besar karena dual fetch bookings+blackouts) |

**Data shape verified:** Calendar.jsx reads `data.bookings` dan `data.blackouts` dari response — match dengan `{ bookings, total }` dan `{ blackouts }` yang di-return oleh service. Column mapping:
- `b.release.name + b.release.version` ← `listBookings` include Release
- `b.environment.name` ← include Environment
- `b.bookDateTime` → `toLocaleString()`
- `b.creator.username` ← include User (nullable, guarded dengan `? :`)

**Pattern compliance:** loading/error/empty states pakai className `muted`/`error`, table pakai `className="table"`, blackout list pakai `<details className="panel">`. Persis pattern Apps.jsx + Releases.jsx.

## Decision
**Adopt** (blocked-needs_input — code changes perlu human review sebelum push).

Read-only increment sesuai success metric: "Calendar page renders, can view bookings, client builds clean". Phase berikutnya (Tracking page, Impact page) tinggal ikut pola yang sama.

## Risk
- **Manual smoke test belum dilakukan** — cron job headless, tidak ada browser untuk verifikasi render visual. Build pass = static analysis OK, tapi belum konfirmasi runtime fetch + render. evidence_required `[build, manual-smoke]` — build satisfied, manual-smoke pending human.
- **No pagination/filter di bookings table** — OK untuk increment ini (read-only view), tapi kalau booking count > 100 perlu query param `limit`/`offset`. API sudah support, client belum expose.
- **Blackout fetch error overwrites bookings error** — dua `.catch()` set state error yang sama; jika bookings OK tapi blackout fail, seluruh page jadi error state. Low risk untuk read-only view, tapi worth noting.

## Lessons Learned
- **opencode tend to over-deliver** — dia juga wired notification sink ke release.service.js (task terpisah yang blocked). Selalu audit diff scope setelah delegate, revert yang out-of-scope. Ini menyelamatkan task boundary.
- **Pattern copy spec works** — dengan reference file + API contract yang explicit, opencode delivered Calendar.jsx yang clean dan compliant dalam satu shot. Zero iteration needed pada code-nya.
- **`--workdir` vs `--dir`** — opencode CLI flag-nya `--dir`, bukan `--workdir`. First attempt printed help only.

## Next Priority
1. **Tracking page** (`t_e2d163f1`) — priority 5, ready. Same pattern, `tracking.routes.js` + Tracking.jsx.
2. **Manual smoke test Calendar** — human verify render di browser saat login dengan permission `calendar:read`.
3. **Website SEO meta tags** (`t_dfdc4522`) — priority 5, ready, beda system (tabacoID-website).
