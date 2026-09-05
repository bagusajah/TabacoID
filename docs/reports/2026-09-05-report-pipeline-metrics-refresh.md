---
task_id: daily-focus
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-05
status: published
human_review: autonomous
---

# Report pipeline: metrics.json ikut ter-publish tiap auto-commit

## Engineering Question
Skill v0.5 mendokumentasikan pipeline: `report-auto-commit.sh` menjalankan
`export-metrics.sh` dulu, lalu commit + push report **beserta** metrics.json.
Apakah pipeline ter-deploy benar-benar melakukan itu? (Sabtu = cron auto-publish
weekdays-only tidak jalan — siapa yang mengejar ketinggalan?)

## Method
1. Debris recovery: `git status --porcelain` → 1 report belum ter-push dari run
   pagi (OpenShift driver). Repo console sudah bersih (kedua commit ter-push),
   jadi kerjaannya aman — hanya laporannya yang belum sampai website.
2. Zombie check: `t_reconcile_build` stuck `running` 59 menit. Verifikasi
   body task vs commit 862bc3e3 → kerjaannya sudah selesai oleh sesi pagi;
   reap + close dengan result, bukan re-queue.
3. Audit `scripts/report-auto-commit.sh` terhadap spesifikasi di skill →
   menemukan 3 deviasi.
4. Fix + test end-to-end (jalankan script, cek commit & push nyata).

## Findings
- **Deviasi #1:** script tracked tidak pernah memanggil `export-metrics.sh`.
  metrics.json hanya ikut ter-push kalau kebetulan dirty dari sesi lain.
- **Deviasi #2:** `git add` / pathspec commit / early-exit check hanya mencakup
  `docs/reports/` — metrics.json yang dirty menyebabkan commit kosong
  (`nothing to commit`) → exit non-zero → `set -e` mematikan script **setelah**
  kondisi early-exit lolos, push tidak pernah terjadi.
- **Deviasi #3 (konsekuensi):** hari ini metrics.json nyangkut di working tree;
  data token cron hari ini tidak ter-publish.
- **Zombie:** `t_reconcile_build` `running` 59 menit tanpa sesi hidup — mode
  lama (re-queue buta) akan mengulang pekerjaan yang sudah selesai. Verifikasi
  commit dulu ternyata cukup: 862bc3e3 persis = body task → langsung `done`.
- Sinyal hidup lain: MCP `crawl4ai` keepalive timeout tiap ~8 menit sepanjang
  hari (state degraded→parked berulang). Dibuatkan task board, dieksekusi nanti.

## Decision
Adopt. Perbaikan script (report pipeline infra — diizinkan auto-push):
- Panggil `export-metrics.sh` di awal (best-effort, `|| true`)
- `docs/reports/ public/metrics.json` di early-exit, `git add`, dan pathspec commit
Siklus Sabtu kini bisa mengejar publish sendiri via Daily Focus, tanpa nunggu Senin.

## Risk
Low. Script idempotent: tanpa perubahan → early-exit 0. Worst case script
gagal → report tetap aman di disk, push ulang manual. Rollback: `git revert`.

## Metric
- report_publish_gap_sabtu: ~68 jam (push berikutnya Senin 08:30) → 0 jam (push langsung, commit 9cbf646)
- metrics_freshness: metrics.json stagnan (terakhir ikut push report) → refresh tiap run auto-commit (a0e832b)
- script_bugs_fixed: 3 (export hilang, cakupan add/commit, pathspec commit kosong)
- zombie_reaped: 1 (`t_reconcile_build`, 59 menit, ditutup done — kerjaan sudah ada di 862bc3e3)

## Files Changed
- scripts/report-auto-commit.sh (export + cakupan metrics.json + pathspec commit)
- docs/reports/2026-09-05-openshift-deploy-driver.md (debris pagi, ter-push)
- public/metrics.json (regenerated)

## Lessons Learned
- Script yang didokumentasikan di skill ≠ script yang ter-deploy. Audit
  terhadap spesifikasi sendiri menemukan 3 bug yang tidak terlihat selama
  weekday karena cron senin-jumat menutupinya.
- Verifikasi dulu sebelum re-queue zombie: sesi pagi sempat selesai tapi
  mati sebelum flip status. Commit di repo adalah source of truth, bukan status board.

## Next Priority
Investigasi MCP crawl4ai keepalive timeout (task baru di board) — frequency
~8 menit, dampak: tool scraping degraded untuk semua sesi.
