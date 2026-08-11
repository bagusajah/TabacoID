---
human_review: autonomous
---

# Daily Report 2026-08-06 (Auto-derive Home Stats)

**Date:** 2026-08-06
**Category:** Website Platform
**Decision:** Adopt

## Engineering Question
Home page stats (days running, report count) hardcoded di `site.ts`. Bisakah di-derive otomatis dari data yang sama seperti Reports page?

## Method
- Baca current hardcoded values di `src/data/site.ts`
- Implement `computeDaysRunning()` function (date diff dari INIT_DATE)
- Tambah `useState`/`useEffect` di Home.tsx untuk glob `docs/reports/*.md` dan hitung report count
- Render dynamic stat (Days running + report count) di alongside static stats

## Findings
- **Before:** `labStats[0]` hardcoded `"Day 4"`, `"13 reports"` — salah (actual: Day 5, 53 reports)
- **After:** `computeDaysRunning()` returns 5 (correct). Report count derived from glob: 53 files
- `Math.ceil(diff_ms / 86400000)` formula verified: edge cases correct (Day 1 on launch day, Day 2 on next day)
- Build passes: 5.69s, no errors
- 2 files changed: `src/data/site.ts` (remove hardcoded stat, add `computeDaysRunning`), `src/pages/Home.tsx` (add async glob + render)
- Static stats (Operating model, Current phase) unchanged

**Metrics:**
- `days_running_accuracy: 5 days (correct, was 4 hardcoded)`
- `report_count_accuracy: 53 reports (correct, was 13 hardcoded)`
- `build_time: 5.69s (unchanged)`
- `files_changed: 2`

## Decision
Adopt — hardcoded stats sekarang auto-derived dari data aktual.

## Risk
- Home page sekarang async (perlu load semua report .md untuk hitung count). Dengan 53 files kecil ini tidak masalah, tapi jika reports mencapai ratusan, bisa lambat. Mitigasi: hanya load filenames, bukan content. Tapi `import.meta.glob` Vite tidak support `{ eager: false }` tanpa content. Ponytail: acceptable untuk workload saat ini, optimasi kalau jadi masalah.

## Lessons Learned
- Data yang sudah ada di filesystem jangan duplicate manual — derive dari source of truth
- `Math.ceil` date diff adalah formula yang tepat untuk "Day N" counting (inclusive)

## Next Priority
- Kalau report count growth signifikan, pertimbangkan generate count file saat build time (Vite plugin) daripada load semua .md files
