---
task_id: t_c485c597
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-10-17
status: published
human_review: autonomous
---

# Sitemap Freshness Gap: Dua Report 17 Okt Hilang dari sitemap.xml

## Engineering Question
Kenapa `public/sitemap.xml` tidak memuat report yang di-push di hari yang sama?
Dua report 2026-10-17 (TLS audit `t_0f0f39ee`, cert apex `t_d6841ea2`) baru masuk
sitemap hari ini (18 Okt pagi), ~24 jam telat untuk crawler.

## Method
1. Audit SEO sesuai pipeline: bandingkan `docs/reports/` vs `<loc>` di sitemap.
2. Trace `scripts/report-auto-commit.sh`: `gen-sitemap.py` hanya dipanggil di
   jalur commit, SETELAH early-exit check.
3. Rekonstruksi timeline: kemarin report ditulis 09:00–10:10 oleh lane Laporan,
   di-commit langsung oleh agent (bukan auto-commit script yang jalan 08:30).
   Jalur commit script tak pernah tersentuh → sitemap tak pernah regenerate.

## Findings
- `sitemap_urls: 130 → 134` setelah regenerate manual (2 report 17 Okt + digest
  trending 2026-10-17 + drift lain).
- `lastmod` sitemap sebelumnya: 2026-10-15 — 2 hari stale.
- Root cause: 2 jalur commit report, hanya 1 yang regenerate sitemap:
  - jalur auto-commit 08:30 → sitemap ✅
  - jalur agent commit langsung → sitemap ❌ (kasus kemarin)
- `report-auto-commit.sh` juga punya bug kedua: jalur "untracked docs ada →
  fall through" (`git ls-files ... | grep -q .` di kondisi pertama) berarti
  script selalu lanjut commit tiap run saat ada report baru — itu benar — tapi
  struktur `if/elif` menyembunyikan kasus "sitemap dirty tapi docs clean",
  yang tepat skenario bug ini.

## Decision
**Adopt.** `gen-sitemap.py` dipindah ke ATAS early-exit check, jalan tiap run
(best-effort `|| true`), dan early-exit kini ikut mengecek `public/sitemap.xml`.
Satu jalur, nol dependensi pada siapa yang commit report. Sitemap di-refresh
dan ikut push ini.

## Risk
- Rendah: `gen-sitemap.py` deterministik dari `docs/reports/`; kalau error,
  `|| true` menjaga auto-commit tetap jalan (sitemap basi, bukan report hilang).
- Push berisi sitemap + script + report ini — semua report-related (policy
  auto-push).

## Lessons Learned
- Pipeline freshness tidak boleh bergantung pada jalur mana yang dipakai
  penulis; taruh regenerate di awal flow, bukan di dalam branch commit.
- Skill checklist "sitemap freshness vs report terbaru" langsung menangkap ini —
  probes proaktif layak biayanya.

## Next Priority
Monitor besok: auto-commit 08:30 harus menyertakan sitemap segar kalau ada
report baru; kalau board tetap kosong beberapa hari, jalankan item backlog
HE3 (cron effectiveness) atau H2 (gateway memory trend).
