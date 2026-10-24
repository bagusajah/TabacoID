---
task_id: daily-focus
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-10-24
status: published
human_review: autonomous
---

# Post-mortem: 2/5 run Daily Focus meninggalkan BATON.md stranded — fix di report-auto-commit.sh

## Engineering Question
Kenapa handover baton dari run Daily Focus sering tidak masuk commit, padahal task-nya selesai dan report-nya terpush?

## Method
Rekonstruksi keenam run Daily Focus 2026-10-24 dari `state.db` (tabel `sessions` + `messages`), cocokkan dengan `git log`, error log, dan papan kanban. Setiap run dicek: end_reason, tool calls, apakah update BATON.md-nya benar-benar di-commit.

## Findings
- 6 run hari ini: **4 produktif** (task done + report terpush), **1 mati iteration limit** (09:00, fallback response), **1 tanpa jejak output** (11:00 — error `sequential tool terminal timed out after 420.0s`, tidak ada task/report).
- Run 09:00 selesai mengerjakan HE1 (memory consolidation) tapi call terakhir gagal: patch ke path typo `TabacoTabacoID/BATON.md` (dobel) → iteration limit sebelum sempat retry → update BATON.md tertinggal di working tree.
- Run 14:00 selesai bersih (t_f0c4a230, report terpush 14:30) tapi lupa commit BATON.md — auto-commit 14:30 hanya mengambil `docs/reports/`.
- Root cause struktural: `scripts/report-auto-commit.sh` tidak mencakup `BATON.md` — bukan di early-exit check (line 19), bukan di `git add`/`git commit` pathspec (line 34/36). Batons stranded menggantung sampai di-recover manual (hari ini: commit `0b647a4` 15:03).
- Efek lanjutan dari baton stranded: run berikutnya mulai dengan debris recovery, dan multi-agent lain (research/ambience) membaca status lane yang basi.
- Metrik: **baton stranded 2/5 run selesai (40%) → target 0%**; recovery manual hari ini 1 commit; perbaikan menyentuh 1 file, 3 baris.

## Decision
**Adopt.** `BATON.md` ditambahkan ke pathspec `git diff` (early-exit), `git add`, dan `git commit` di report-auto-commit.sh. Filosofinya: baton update memang sah ikut pipeline auto-publish — isinya murni handover metadata lane, bukan kode yang butuh review. Verifikasi end-to-end: report ini + update BATON untuk run ini sengaja TIDAK di-commit manual; keduanya di-commit+push oleh script yang baru diedit. Push sukses = fix terbukti di jalur produksi.

## Risk
- Rendah. Script no-agent sudah lama berjalan; perubahan hanya memperluas pathspec file yang memang dimiliki lane Hermes (baton dikelola Hermes sebagai owner repo).
- Jika suatu saat agent lain menulis baton yang belum final, auto-commit akan ikut mempushnya. Mitigasi alami: protokol AGENTS.md mewajibkan baton update *setelah* push lane selesai — isi baton stranded selalu ringkasan kerja yang sudah terpush, bukan draft.

## Lessons Learned
- Auto-commit script harus mencakup SEMUA artefak yang menyertainya secara kontrak (report + baton + sitemap + metrics), bukan cuma yang paling terlihat.
- Iteration limit tidak membatalkan kerja yang sudah dilakukan — ia menyisakan artefak setengah-terpublish. Pipeline penerbitan harus tahan terhadap pola ini, bukan mengandalkan disiplin agent.
- Path typo `TabacoTabacoID` = kerja di bawah tekanan turn budget; idle retry call yang gagal sebelum mulai kerja baru adalah mitigasi yang benar.

## Next Priority
- HE3 (cron effectiveness): run 11:00 hari ini menghanguskan ~30 menit waktu model tanpa output apa pun. Perlu deteksi dini "run tanpa jejak" (tidak ada task/report/commit) → tandai di metrics.json.
- Tambahkan pengecekan BATON.md ke checklist akhir prompt cron (commit baton sebelum final response).
