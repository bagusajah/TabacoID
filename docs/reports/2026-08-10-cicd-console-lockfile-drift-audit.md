---
task_id: t_5a32e5eb
objective: OBJ-004
date: 2026-08-10
status: draft
---

# CICD Console: Lockfile & Dependency Audit

## Engineering Question
Apakah cicd-release-console dalam kondisi sehat dari sisi dependency security? Berapa banyak vulnerability, dan apakah lockfile mengalami drift terhadap package.json?

## Method
1. `npm audit --json` untuk vulnerability inventory lengkap
2. Drift check: komparasi versi di package.json vs package-lock.json (skrip `/tmp/dep_drift_check.js`)
3. Klasifikasi fix path: non-breaking (`npm audit fix`) vs breaking (`npm audit fix --force`)
4. Verifikasi test suite: `npm test -- --forceExit`

## Findings

### Vulnerability Summary
| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 10 |
| Moderate | 6 |
| Low | 2 |
| **Total** | **21** |

### Test Suite
223/223 tests pass (12.7s) — tidak ada regression.

### Lockfile Drift
25 dari 30 declared packages menunjukkan perbedaan versi antara package.json (carat range) dan lockfile. **Tetapi semua drift ini adalah valid semver resolution** — package.json menggunakan `^x.y.z` dan lockfile membekukan versi minor/patch terbaru dalam range. Ini bukan drift sebenarnya, ini expected behavior `npm install`.

Contoh: `express: ^4.18.2 → 4.22.2` (valid minor bump), `aws-sdk: ^2.1377.0 → 2.1693.0` (valid patch bump).

**Drift nyata: 0.** Lockfile sehat dan consistent dengan ranges.

### Fix Path Classification
- **Non-breaking** (`npm audit fix` saja): 3 vulnerabilities
- **Breaking change required** (`--force`): 18 vulnerabilities

### Root Cause Chains (Breaking)
| Vulnerable Package(s) | Fix Requires Update | Impact |
|----------------------|---------------------|--------|
| tar, cacache, node-gyp, make-fetch-happen | sqlite3 → v6 | 8 vulns (3 critical via tar) |
| request, form-data, qs, tough-cookie | @kubernetes/client-node → major | 4 vulns (request deprecated) |
| simple-update-notifier, semver | nodemon → v3 | 3 vulns |
| uuid | aws-sdk → v3 / sequelize → major | 3 vulns |

**`request` package** (deprecated since 2020) adalah source terbesar — ditarik oleh `@kubernetes/client-node@0.22.3`. Migrasi aws-sdk v2→v3 juga diperlukan (v2 dalam maintenance mode).

## Decision
**Document, defer fix to planned upgrade tasks.**

Alasan:
1. 18 dari 21 vuln memerlukan breaking changes — bukan quick fix
2. Test suite (223/223) tidak menunjukkan issue fungsional
3. cicd-console adalah internal tool, bukan internet-facing — attack surface terbatas
4. Upgrade sqlite3→v6, @kubernetes/client-node major, aws-sdk→v3, nodemon→v3 masing-masing adalah dedicated migration task yang perlu planning + test validation

3 non-breaking fix bisa dijalankan aman, tapi impact minimal (low/moderate only).

## Risk
- **Medium:** `tar` critical chain (via sqlite3 native build) mengekspos build toolchain. Risiko real hanya jika CI process menjalankan untrusted input.
- **Low:** `request` deprecated — tidak ada patch baru, tapi internal API usage aman selang tidak process untrusted HTTP dari external.
- Acceptable untuk internal cicd tool dengan threat model yang bounded.

## Lessons Learned
- "223 tests pass" ≠ "secure" — audit adalah dimension terpisah
- npm carat ranges menyembunyikan drift yang sebenarnya bukan drift — perlu distinguish range vs frozen version
- request package masih jadi dependency transitif via k8s client, 6 tahun setelah deprecated

## Next Priority
Buat task terpisah untuk planned upgrades (deferred, bukan urgent):
1. **sqlite3 v5→v6** — fixes 8 vulns termasuk 3 critical (highest ROI)
2. **@kubernetes/client-node major** — eliminates deprecated `request`
3. **nodemon 2→3** — trivial, fixes 3 vulns
4. **aws-sdk v2→v3** — larger migration, plan separately
