---
task_id: t_21f21d58
objective: OBJ-001
date: 2026-08-08
status: draft
human_review: approved
---

# Forward-Only Migration Runner Menggantikan `sync({alter:true})` (TD-8)

## Engineering Question
CICD release console pakai `sequelize.sync({ alter: true })` di boot path development untuk manajemen schema. Ini destruktif, non-deterministic, dan tidak ada history. Bagaimana menggantinya dengan migration system yang production-ready tanpa menambah dependency?

## Method
**Pendekatan:** Membaca seluruh boot path dan test harness dulu (trace end-to-end), baru pilih solusi paling minimal.

**Yang ditemukan sebelum eksekusi:**
- `sync({alter:true})` hanya di `src/models/index.js:87`, aktif saat `config.env === 'development'` atau `opts.sync=true`
- Test suite pakai `sync()` (plain, no alter) via `test/_db.js` — tidak lewat `connectDatabase()`
- `sequelize-cli` belum terinstall. Constraint: no new dependencies tanpa approval
- Baseline: 223/223 tests pass

**Solusi yang dipilih** (rungg 3 di ponytail ladder — stdlib/platform feature):
Custom forward-only migration runner pakai Sequelize's own `queryInterface` API. Zero new deps. ~100 lines runner + 17 lines baseline migration.

**Files created:**
- `src/migrations/_runner.js` — `runMigrations(sequelize)`: ensureMetaTable → listMigrationFiles (`/^\d+.*\.js$/`, sorted numeric) → skip applied → run `up()` → record in `sequelize_meta`. Failure aborts, no meta row for failed migration (re-runnable).
- `src/migrations/20260801000000-baseline.js` — `up()` calls `queryInterface.sequelize.sync()` (create-only, NOT alter). Down throws (irreversible baseline).
- `docs/decisions/0009-migration-runner.md` — ADR documenting the decision.

**Files modified:**
- `src/models/index.js` — `connectDatabase()` ganti `sync({alter:true})` → `runMigrations(sequelize)`
- `docs/ROADMAP.md` — TD-8 marked ✅ Closed, status/test-count updated, conventions section updated
- `README.md` + `docker-compose.yml` — comment updates (schema management description)

## Findings (with measurements)

| Metric | Before | After |
|--------|--------|-------|
| `sync({alter:true})` di src/ | 1 hit (`models/index.js:87`) | 0 hits |
| New npm dependencies | 0 | 0 (constraint met) |
| Test suites pass | 21/21 (223 tests) | 21/21 (223 tests) |
| `npm run build` | clean | clean (180.63 kB JS, 3.04 kB CSS, gzip 57.60 kB) |
| Migration runner lines | n/a | 102 (`_runner.js`) + 17 (baseline) |
| `sequelize_meta` rows after first boot | n/a | 1 (`20260801000000-baseline.js`) |
| Tables created on fresh DB | n/a | 21 (all model tables) |
| Second-run idempotency | n/a | 0 migrations applied (baseline already recorded) |

**Functional smoke test** (in-memory SQLite, `NODE_ENV=development`):
- Boot → 21 tables created, `sequelize_meta` records baseline
- Re-run `runMigrations()` → 0 applied (idempotent confirmed)

## Decision
**Adopt.** Forward-only migration runner menggantikan `sync({alter:true})` dengan zero new dependencies. Mengikuti convention sequelize-cli (`sequelize_meta` table, timestamped files) jadi interoperable. Schema changes berikutnya = file `NNNN-slug.js` baru, forward-only, tidak edit applied migration.

**Status task:** BLOCKED-needs_input — code changes ready for human review sebelum commit ke `docs/multi-session-tracking` branch. Files tidak auto-push (cicd-console, bukan report-related website change).

## Risk
- **Low.** Runner hanya aktif di development boot path (`config.env === 'development'` atau `opts.sync`). Production belum pakai migrasi otomatis (DB-optional boot tetap intact).
- **Baseline migration** pakai `sync()` create-only — safe di existing DB (hanya create missing tables, tidak alter). Tapi di DB dengan schema drift (column type mismatch), baseline tidak akan fix itu. Itu by design — drift penanganan via migration file baru.
- **Test harness** (`test/_db.js`) untouched — masih pakai plain `sync()` untuk in-memory SQLite throwaway. Tidak ada coupling antara test DB setup dan production migration path.

## Lessons Learned
- Ponytail ladder rung 3 (native platform feature) cukup: Sequelize's `queryInterface` sudah punya `createTable`, `insert`, `select`, `showAllTables`. Tidak perlu sequelize-cli.
- `ensureMetaTable` pakai `showAllTables()` + conditional `createTable` — cross-dialect safe (SQLite & MySQL).
- Trace dulu baru edit: memahami bahwa test suite punya DB setup path terpisah (`_db.js` → `sync()` langsung) mencegah kita dari breaking 223 tests.

## Next Priority
1. Human review + commit ke `docs/multi-session-tracking` branch
2. Saat ada model schema change berikutnya → buat migration file `NNNN-describe-change.js` baru, jangan edit baseline
3. Production deploy: pertimbangkan apakah migration runner jalan otomatis di boot atau via CLI step terpisah (currently hanya dev/`opts.sync`)
