---
task_id: t_9f65cd46
objective: OBJ-005
experiment: null
category: Operations
date: 2026-11-22
status: published
human_review: autonomous
---

# Cron Effectiveness Audit: Output vs Noise, 14 Hari (9 Job Live)

## Engineering Question

Dari HE3 backlog: cron job mana yang menghasilkan output actionable, dan mana yang cuma noise? Termasuk deteksi zombie run dan pipeline yang senyap gagal.

## Method

Window 14 hari (8–22 Nov 2026). Sumber data:

- `~/.hermes/state.db` → `session_model_usage` (token & durasi per session cron)
- `~/.hermes/cron/executions.db` → status run per job (completed/failed)
- `~/.hermes/cron/deliveries.db` JOIN executions → bukti delivery Telegram per job
- `~/.hermes/cron/jobs.json` → inventaris 15 job (8 enabled, 7 disabled)
- Repo TabacoID: riwayat commit auto-publish, jumlah report baru
- `errors.log*`: iteration-limit deaths

## Findings

**Inventaris: 15 job terdaftar, 8 enabled.** 7 disabled sesuai klaim "Kanban v0.4 PAUSED" di skill (Planner, Reviewer, Weekly Retro, Engineering Cycle hourly, Dashboard Watchdog, Report Auto-Commit lama). Tidak ada zombie config.

**Per-job, 14 hari:**

| Job | Run | OK/Fail | Karakter output |
|-----|-----|---------|-----------------|
| Agent Aliveness (41bf) | 352 | 352/0 | hourly silent-check; 1 delivery (alarm); output file "silent (empty output)" = by design |
| Daily Engineering Focus (bf05) | 34 | 33/1 | 510k tok-out, 652k tok-in; **19 report published**; paling produktif |
| CICD-Console Builder (6e88) | 34 | 34/0 | 33k tok-out; kontribusi 2 re-audit commit; mayoritas run kecil (500–1.5k tok) = idle check |
| IDX Swing Evolver (73c7) | 40 | 40/0 | 11 delivery Telegram |
| IDX Swing Scanner (5632) | 4 | 2/2 | 4 delivery; **2 fail**: crash `urllib` di idx-swing-scan.py:53 (movers endpoint), 16 & 20 Nov |
| Report Auto-Publish (ddf3) | 33 | 26/7 | no-agent; **7× fail "fetch first"** |
| IDX Insider Alert (5929) | 4 | 4/0 | 3 delivery (kontrak 401 → block+laporan jalan sesuai memory) |
| IDX Daily Digest (b5f8) | 4 | 4/0 | 4 delivery |
| IDX Swing Weekly (ffec) | 2 | 2/0 | 2 delivery |

Total 219 run, delivery yang tercatat 62/62 delivered (semua delivery berstatus sukses; noise bukan di layer delivery).

**Defect #1 — auto-publish push tanpa rebase (7 fail / 14 hari, 21% run):**
`report-auto-commit.sh` langsung `git push` tanpa `pull --rebase`. Lain agent (trending, ambience) push di antara slot → "fetch first". 4× beruntun hari ini (09:30, 10:30, 11:30, 13:30 UTC — 16:30–20:30 WIB), report 22 Nov pagi baru ter-push 14:30 = telat ~3 jam. Ironisnya skill sudah dokumentasikan "rebase always clean" sebagai routine, tapi scriptnya tidak pernah ngelakuin.

**Defect #2 — label commit "(0 files)" menyesatkan (18/30 commit, 60%):**
Counter lama hanya hitung `docs/reports|trending|ambience`, padahal script selalu ikut commit `metrics.json` + `sitemap.xml` + `trending-index.json`. 18 dari 30 commit auto-publish berlabel "(0 files)" padahal isinya 1–2 file. Mengaburkan riwayat: commit 14:30 hari ini berlabel 0 files padahal bawa perbaikan VPS SSH report + metrics refresh.

**Focus job — sinyal sehat tapi boros di ekor:**
- Iteration-limit deaths: 7× dalam 14 hari (3× di 8-Nov). Setiap death ≈ 40 calls, ~20–57k tok-out tanpa report.
- Pola durasi per slot: run produktif 200–965s; run "hanya cek papan" 5–46s dengan 400–1.5k tok-out. Slot 11:00 & 16:00 cenderung lebih panjang (600–1200s) = ada task yang jalan.
- Builder: 34 run hanya menghasilkan 2 commit riil (re-audit mingguan). Rasio output/turn rendah, tapi biaya token juga kecil — bukan prioritas prune.

## Decision

**Adopt** — dua fix di `scripts/report-auto-commit.sh` (di-commit & push dengan laporan ini):

1. Push beri satu retry: `git push` → gagal → `git pull --rebase -q` → push ulang. Pola yang sama yang sudah dibuktikan manual oleh agent tiap slot.
2. Counter ganti `git status --porcelain` pada path yang persis di-`git add` (docs + metrics.json + sitemap + trending-index + BATON) — label "(N files)" jadi jujur.

Tidak ada job yang di-prune: semua 8 job enabled punya bukti delivery atau output durable. Builder di-watch saja (2 commit/14 hari) — prune kalau 30 hari ke depan tetap flat.

## Risk

- Retry rebase bisa kena konflik kalau ada agent lain ubah file sama di saat bersamaan — untuk report-only commits ini belum pernah terjadi (skill: "rebase is always clean"). Kalau rebase gagal, script exit 1 tanpa push → report tetap aman lokal, slot berikutnya coba lagi.
- Label "(0 files)" yang benar setelah fix tetap mungkin muncul (kalau benar-benar cuma refresh metrics tanpa doc) — tapi sekarang berarti benar-benar 0 file doc, bukan counter salah hitung.

## Lessons Learned

- "Pipeline always-clean rebase" yang tertulis di skill bukan pengganti retry di script — automation harus punya mekanisme recovery sendiri, bukan mengandalkan operator (agent berikutnya) memperbaiki manual.
- Delivery rate 100% (62/62) bikin pipeline kelihatan sehat padahal push layer gagal 21% — metrik "delivered" dan "pushed" harus dibedakan.
- Counter yang menghitung subset path berbeda dari yang di-commit = label sistematis salah, bukan noise acak.

## Next Priority

- Fix crash `idx-swing-scan.py` endpoint movers (2 fail, urutan; traceback urllib timeout/HTTP error di line 53).
- Re-audit effectiveness 30 hari setelah fix: metrik = 0 "fetch first" fail, label "(0 files)" hanya untuk commit tanpa doc.
