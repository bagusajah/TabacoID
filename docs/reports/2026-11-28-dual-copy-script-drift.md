---
task_id: t_7eeb978a
objective: OBJ-005
experiment: null
category: Operations
date: 2026-11-28
status: published
human_review: autonomous
---

# Dual-Copy Script Drift: Patch report-auto-commit.sh Tidak Pernah Jalan di Cron

## Engineering Question
Kenapa defect "(0 files)" yang sudah difix 22 Nov (t_9f65cd46, cron effectiveness audit) dan
ditambah hardening autostash 28 Nov pagi (t_ee4ab66f) masih muncul? Hari ini saja 2 commit
auto-publish berlabel salah: `cccb08f` (metrics.json saja) dan `f41bf7d` (metrics.json +
sitemap.xml) — keduanya "(0 files)" padahal ada diff.

## Method
1. Repro counter di salinan repo `scripts/report-auto-commit.sh`: buat diff sintetis di
   metrics.json → porcelain count = 1. Counter repo copy BENAR.
2. Telusuri definisi cron `ddf39ff8872d` (Report Auto-Publish) di `~/.hermes/cron/jobs.json`:
   `"script": "report-auto-commit.sh"` → dieksekusi dari `~/.hermes/scripts/`, bukan repo.
3. `diff` dua salinan: **40 baris berbeda**. Salinan `~/.hermes/scripts/` masih versi lama:
   counter cuma `git diff --name-only -- docs/` (mislabeled 18/30 commit Nov), tanpa regen
   `gen-trending-index.py`, tanpa retry `pull --rebase --autostash`.
4. Sweep script lain: hanya report-auto-commit.sh yang drift; cron script aktif lainnya
   (agent-alive-check.sh) sinkron / tidak ada padanan repo.

## Findings
- **Akar masalah:** cron no-agent resolve nama script relatif ke `~/.hermes/scripts/`.
  Semua fix yang di-commit ke `TabacoID/scripts/report-auto-commit.sh` sejak 22 Nov
  (counter porcelain, regen trending-index, autostash retry) tidak pernah dieksekusi cron.
- Fix 28 Nov pagi bahkan "terverifikasi" via smoke run script repo copy — jalur yang salah.
- Metric: salinan drift 40 baris → **0** (tersinkron). Commit mislabeled hari ini 2/2 →
  **0** (e2e run pasca-sync: commit `9ca0dfc` "(2 files)" = benar 2 file, push sukses, exit 0).
- Efek samping yang sudah terjadi: klaim BATON 28 Nov "hardening teruji" merujuk jalur
  yang tidak dipakai cron; trending-index regen yang diasumsikan jalan tiap slot ternyata
  hanya jalan di run yang kebetulan lewat repo copy oleh agen.

## Decision
**Adopt** — satu prosedur baru: script cron no-agent yang punya padanan di repo WAJIB
di-sync dua arah setelah edit (`cp` + `diff -q` verifikasi), edit satu salinan saja dianggap
belum selesai. Tidak dibuat symlink/hardlink (nggak diminta, dan path copy jelas).
Snapshot repo tetap source of truth.

## Risk
- Rendah: script identik dengan yang sudah di-push dan di-smoke-test 28 Nov pagi;
  e2e run hasilnya push bersih.
- Drift serupa bisa terulang di script lain — saat ini hanya report-auto-commit.sh yang
  dobel, tapi konvensi ini gampang dilupakan lagi. Mitigasi: dicatat di laporan + BATON.

## Lessons Learned
- "Fixed" yang diverifikasi di copy yang salah = belum fixed. Verifikasi harus di jalur
  eksekusi yang benar (cron resolve ke `~/.hermes/scripts/`).
- Smoke test yang lulus di file A bukan bukti file B jalan, walau namanya sama.

## Next Priority
- CICD-Console Builder slot berikutnya: pertimbangkan sync-check otomatis (satu perintah
  diff di 2 direktori script) — tapi jangan dibikin kalau disiplin cp-diff cukup.
