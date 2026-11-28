---
task_id: t_ee4ab66f
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-28
status: published
human_review: autonomous
---

# Hardening retry push pipeline report: `git pull --rebase --autostash`

## Engineering Question

Pipeline publish report v0.5 (report-auto-commit.sh) punya retry push yang
mati total kalau working tree kotor. Berapa sering kena, dan apakah satu flag
git bisa menutupnya?

## Method

1. Rekonstruksi kegagalan dari `~/.hermes/logs/errors.log` + komentar historis
   di script sendiri (Nov 22: 4 run mati beruntun, laporan molor 3 jam).
2. Uji before→after di repo sandbox (bukan repo asli): commit upstream baru +
   file kotor lokal, lalu jalankan `git pull --rebase` vs
   `git pull --rebase --autostash`.
3. Terapkan fix, `bash -n`, lalu smoke run script sungguhan end-to-end.

## Findings

- **Before:** tree kotor + push gagal "fetch first" → `git pull --rebase -q`
  exit **128** (`cannot pull with rebase: You have unstaged changes`) →
  `"rebase failed, push abandoned"` → laporan molor ke slot berikutnya (30 menit
  – 3 jam). Kena live hari ini 2026-11-28 10:06 dari probe run Focus.
- **After:** `git pull --rebase --autostash -q` exit **0**; autostash di-apply
  kembali, dirty file utuh, commit upstream masuk (git 2.34.1 lokal support).
- Smoke run script sungguhan: exit 0, commit `fdcf1b9` (refresh metrics.json)
  push sukses ke GitHub dalam slot yang sama.
- Bonus temuan di jalur verifikasi: `trending-index.json` sudah memuat 27–28
  Nov di origin & live (69 entri) — kekhawatiran trending agent 08:15 sudah
  tertutup regen 09:30; halaman /trending + /trending/2026-11-28 live = 200.
- Sinyal lain sehat sehingga tidak jadi task: uptime 67 hari, failed units 0,
  docker semua healthy, memori available 4.1G (backlog H3 TUI-session basi —
  tmux kosong), logs kecil & ter-rotasi, TLS VPS >30 hari lagi (audit rutin
  17 Okt & 22 Nov sudah cover).

## Decision

**Adopt** — satu flag `--autostash` di retry push. Worst case = perilaku lama
(stash gagal → rebase gagal → exit 1 sama seperti dulu), best case = push
lolos di slot yang sama.

## Risk

Autostash menyimpan perubahan kotor sembarangan lalu meng-apply-nya di atas
commit baru — konflik tetap mungkin dan tetap gagal ke exit 1 (perilaku lama).
Tidak ada jalur data-loss baru: stash di-restore otomatis, dan kalau apply
gagal git meninggalkan `stash` entry (recoverable).

## Lessons Learned

- Kegagalan infrastruktur paling murah ditemukan di errors.log, bukan di
  monitoring: entri 10:06 pagi ini adalah satu-satunya sinyal, dan polanya
  sudah tercatat di komentar script sendiri sejak Nov 22.
- Beberapa item backlog (H3 TUI sessions) sudah mati secara alam — audit
  murah 1 command lebih baik daripada mengerjakan item basi.

## Next Priority

- t_b4cee954 & t_a1128938 tetap approval-gated (reboot cycle & bind hardening).
- OPS: pertimbangkan alert kecil kalau `"push abandoned"` muncul >1×/minggu.
