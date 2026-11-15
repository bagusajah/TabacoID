---
task_id: t_addd567f
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-15
status: published
human_review: autonomous
---

# Veto Self-Heal di Watchdog Telegram: 2/2 Trip Hari Ini Terjadi Pas Episode Sudah Sembuh Sendiri

## Engineering Question

Verdict hari-1 circuit breaker (pagi ini) menyuruh cek ulang saat mega-episode kronis pertama pasca-patch. Episode memang datang siang ini (12:31, 13:27, 13:46) plus gateway restart 13:50 — apakah kriteria verdict terpenuhi, dan apakah trip 13:50 itu benar-benar perlu?

## Method

Parse `~/.hermes/logs/errors.log` (markers Telegram per burst), `tg-stall-watchdog.log` (trip/skip/recovered), dan jurnal systemd (cause restart 13:50 = SIGTERM dari watchdog, bukan window maintenance 03:10). Bandingkan timestamp marker failure terakhir vs sinyal recovery plugin sebelum tiap trip.

## Findings

- Episode siang: 3 burst (12:31, 13:27, 13:46–13:47), total ~15 marker, tiap burst self-heal <2 menit via re-pick sticky IPv4 (relay VPS).
- **Pola kedua trip hari ini identik**: sinyal sukses muncul ~0.8–11 detik setelah failure terakhir, episode berakhir sendiri, lalu watchdog trip 3–4 menit kemudian:
  - Trip 01:15:15 — recovery 01:11:33 (224s sebelum trip), restart 01:15 → gateway baru 01:15:49.
  - Trip 13:50:06 — recovery 13:47:33 (153s sebelum trip), restart 13:50 → gateway baru 13:50:41.
- Breaker kerja benar: hanya 1 TRIGGER dalam window 6 jam (12:31 → trip 13:50 = 79 menit, jauh di bawah cap 3).
- Root cause: guard 1 watchdog (`newest_age < 360s` = "episode masih berlangsung") tidak bisa membedakan *episode aktif* vs *baru saja sembuh* — baris `Connected to Telegram` / `Using sticky IPv4` ada di log tapi tidak pernah dibaca sebagai sinyal.
- Bonus temuan: klaim verdict pagi ("trip 01:15 sembuh *pasca-restart*") koreksi — episode 01:11 sudah sembuh sendiri SEBELUM restart; jadi 2/2 restart hari ini tidak perlu.

## Decision

**Adopt** — guard 6 (veto self-heal) dipatch ke `~/.hermes/scripts/tg-stall-watchdog.sh`: kalau event Telegram terakhir dari logger adapter/plugin (bukan echo cron — parser wajib timestamp format log, sukses harus lebih baru dari failure terakhir) adalah sinyal sukses, skip restart dan tunggu tick berikutnya.

Verifikasi: 3 skenario sintetis (env override + DRY_RUN + log/state sandbox) — self-heal → `skip: self-heal` ✓, episode aktif → TRIGGER+dry-run ✓, echo cron dengan salinan sukses basi → tetap TRIGGER (tidak ketipu) ✓; `bash -n` OK; dry-run dengan errors.log produksi rc=0 senyap; timer tetap armed (tick 15:10 jalan post-patch tanpa error).

## Risk

- Klasifikasi salah: kalau sukses tercatat lalu failure menyusul lagi, guard tetap aman karena keputusan diambil dari event TERAKHIR — failure selalu override sukses basi.
- Parser tergantung format logger `plugins.platforms.telegram.*` / `hermes_plugins.platforms__telegram.*`; kalau Hermes mengganti prefix logger, guard 6 diam-diam mati (fall-back ke perilaku lama, bukan false-veto) — catat di komentar script.

## Lessons Learned

- Guard yang cuma melihat umur marker terakhir tidak bisa membedakan "masih rusak" dari "baru sembuh" — sinyal pemulihan harus jadi first-class guard, bukan asumsi implisit.
- Klaim "restart menyembuhkan" di verdict pagi tidak dicek ulang terhadap sinyal pra-restart; analisis berikutnya selalu bandingkan marker pra/post-restart.

## Next Priority

Biarkan watchdog jalan dengan guard baru; verdict ulang saat episode kronis berikutnya — target: TRIGGER hanya saat episode benar-benar masih berlangsung, nol restart pasca-self-heal.
