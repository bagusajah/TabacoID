---
task_id: t_0793c1a1
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-19
status: published
human_review: autonomous
---

# Recover discarded hermes update fix + version skew audit

## Engineering Question
`hermes update` tanggal 13 Sep melakukan reset "history diverged" yang membuang 4 local commits + auto-stash 16 file konflik. Apakah fix logging traceback spam (commit `2ce58d5927`, report 2026-09-13) masih ada di disk, apa sisa debris-nya, dan seberapa besar version skew antara gateway yang jalan vs kode di disk?

## Method
1. Verifikasi commit di repo `~/.hermes/hermes-agent`: `git log`, `git cat-file`, grep langsung ke `agent/chat_completion_helpers.py`.
2. Audit debris: `git stash list` + `git stash show --patch` + `git apply --check` untuk tiap autostash.
3. Ukur skew: timestamp start proses gateway (`systemctl --user show hermes-gateway`) vs mtime file hasil fix, `NRestarts`, dan hitung commits yang lahir setelah start proses.
4. Cari bukti runtime: grep `Streaming failed before delivery` di errors.log + journal sejak fix.

## Findings (measurements)
- **Fix recovered**: ada di HEAD sebagai recommit `d6c8366e3f` (16:21, identik dengan `2ce58d5927` yang di-reset), terverifikasi di file — `logger.error("Streaming failed before delivery: %s", e)` di line 3174. Working tree clean (0 modified files).
- **Version skew**: gateway PID 3350630 start **2026-09-13 03:00 WIB**, fix di disk mtime **16:21** → proses berjalan **13 jam lebih tua** dari fix. `NRestarts=0` sejak itu. **84 commits** lahir di disk setelah proses start. Jadi fix (dan 83 commit lain) belum aktif di proses gateway — python sudah meng-import module saat startup.
- **Debris stash@{0}** (autostash 13 Sep, 16 files, +169/−50): `git apply --check` gagal di 13 file → konflik dengan HEAD, isinya sudah disupersedi upstream. **Debris stash@{1}** (2 Agu): cuma 2 blank lines di `bridge.js` + churn lockfile. Keduanya tidak mengandung recovery yang hilang — aman dibiarkan sebagai archive.
- **Bukti runtime**: 0 kejadian `Streaming failed before delivery` sejak fix → belum ada data perilaku pasca-fix (belum ada outage relay sejak 12 Sep).

## Decision
**Adopt (selesai sebagian, butuh satu aksi manual):** fix sudah recovered di disk — status target tercapai. Gateway **sengaja tidak di-restart** dari cron ini: restart gateway 12 hari uptime butuh keputusan user (aktif session WhatsApp/TUI bisa terputus). Skew tetap terdokumentasi: gateway akan mengangkat fix + 84 commits pada restart berikutnya oleh user.

## Risk
- Selama gateway belum restart, semua fix 13–19 Sep (termasuk beberapa fix gateway/config dari upstream) tidak aktif. Semakin lama skew melebar.
- Jika `hermes update` jalan lagi tanpa restart di antaranya, skew bertambah dan autostash baru menumpuk.

## Lessons Learned
- `hermes update` di mesin ini punya pola reset yang miskin: fix lokal harus selalu di-commit + diverifikasi ulang setelahnya.
- Timestamp proses vs mtime file = cara termurah ukur code skew tanpa restart; 1 baris `stat` cukup.

## Next Priority
- User restart gateway saat sesi kosong → fix aktif + skew 84 commits tertutup. Kandidat task: fallback provider untuk relay `combo1` (dari report 2026-09-13).
