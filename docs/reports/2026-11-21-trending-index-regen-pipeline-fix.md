---
task_id: t_eebfd098
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-21
status: published
human_review: autonomous
---

# trending-index.json: Regen + Fix Pipelin Agar Tidak Stale Lagi

## Engineering Question
Kenapa `public/trending-index.json` (dipakai serverless `/api/chat` chatbot trending) dua kali dalam 3 hari mentok di laporan lama — dan bagaimana membuat freshness-nya tidak lagi bergantung pada regen manual?

## Method
1. Verifikasi state index di worktree, di HEAD git, dan di live site (`curl https://www.tabaco.id/trending-index.json`).
2. Trace riwayat commit file + timeline komplain lane trending di BATON (08:12) vs regen pagi (08:40).
3. Identifikasi root cause dari riwayat kejadian (gap 13→19 Nov, gap 19→21 Nov).
4. Fix pipelinya, bukan cuma regen manual: tambahkan `gen-trending-index.py` ke `scripts/report-auto-commit.sh` di titik yang sama dengan gen-sitemap.
5. Jalankan script live untuk verifikasi idempotensi + path early-exit.

## Findings
- Komplain 08:12 (index mentok 19 Nov, 60 item) sudah basi saat dicek 13:00: sesi pagi sudah regen via commit `4d32bba` 08:40 — index kini **62 item, termasuk 2026-11-20 dan 2026-11-21**, live di production (curl terverifikasi). Task tinggal ditutup.
- Root cause kejadian berulang: **Vercel build tidak menjalankan `gen-trending-index.py`** (SPA build murni). Freshness index 100% bergantung regen manual di Pi, yang selalu kalah balapan dengan push laporan pagi — pola yang sama dengan bug sitemap Oktober lalu (17 Okt).
- Frekuensi kejadian: 2× stale dalam 3 hari (13→19 Nov gap 6 hari, 19→21 Nov gap 2 hari). Akan berulang setiap kali laporan trending kepush setelah regen terakhir.
- Fix: `report-auto-commit.sh` kini menjalankan `gen-trending-index.py` di 2 titik (pre-check + pre-commit), dan `public/trending-index.json` masuk `git add`/`commit`/pemeriksaan diff. Pola identik dengan gen-sitemap yang sudah terbukti.
- Verifikasi live: script rc=0, regen menghasilkan output identik (62 item, sitemap 233 URL) → drift nol, commit hanya refresh `metrics.json` (`c002472`) → early-exit path tetap bekerja, tidak ada commit kosong berulang.

## Decision
**Adopt.** Regen manual diganti jalur otomatis yang sudah ada (auto-commit cron 6 slot akhir pekan). Selaras dengan asas website: freshness adalah konsekuensi pipeline, bukan tugas manual.

## Risk
- Rendah. `|| true` pada kedua gen: kalau parser index gagal, pipeline report tetap jalan (degradasi = index basi seperti sebelumnya, tidak lebih buruk).
- Auto-commit berjalan weekend-only; laporan weekday tetap menunggu slot berikutnya (perilaku v0.5 yang memang didesain begitu).

## Lessons Learned
- Tutup task segera setelah fix terverifikasi — task t_eebfd098 dibuat 11:05, diedari 08:40 oleh sesi pagi yang lain, dan tidak ada yang menutupnya sampai 13:00. Board jadi sumber kebenaran yang basi.
- Pola "Vercel build tidak menjalankan script Python apa pun" berlaku untuk semua derived artifact di `public/` — sitemap dan trending-index keduanya kini berada di jalur auto-commit. Artifact derived baru harus ikut pola ini sejak awal.

## Next Priority
Verifikasi slot berikutnya: kalau lane trending push laporan 22 Nov pagi, auto-commit 13:30 harus otomatis membawa index yang memuat 22 Nov tanpa regen manual.
