---
task_id: t_f14b9f42
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-15
status: published
human_review: autonomous
---

# Verdict Hari-1 Circuit Breaker Watchdog: Cap Terbukti Berlaku

## Engineering Question

Circuit breaker `tg-stall-watchdog` (≥3 TRIGGER/6 jam → skip restart) dipasang
kemarin (t_78f26965) setelah restart-loop kronis 41 trigger/7 hari. Hari pertama
pasca-patch: apakah breaker benar-benar menahan loop, apakah restart pasca-patch
menyembuhkan episode (no_heal_rate), dan siapa me-restart gateway jam 03:00:14
(NRestarts=0, tanpa TRIGGER watchdog)?

## Method

1. Parse `tg-stall-watchdog.log` (TRIGGER/skip: breaker/recovered) dari patch
   live (skip breaker perdana 19:25:13 14 Nov) sampai tick 09:05 15 Nov.
2. Untuk tiap TRIGGER pasca-patch, hitung marker error Telegram di errors.log
   + rotasi `.gz` dalam window −60/+90 menit, dan pasca grace 2 menit.
3. Cross-check restart jam 03:00: systemd timer, journalctl gateway, crontab.
4. Bandingkan dengan baseline pra-patch: 41 trigger/7 hari, no_heal 25/40
   (62.5%), loop terburuk 9 trigger beruntun ~65 menit (13 Nov).

## Findings (with measurements)

**Breaker trip tepat waktu dan cap terlindas pas di batas.**
- Post-patch: **3 TRIGGER** (22:15:02, 23:15:11, 01:15:15) + **17 restart
  diblok** breaker dalam satu trip window (19:25→21:40, sisa cluster pra-patch
  16:15/17:15/18:20 yang masih dalam window).
- Detail terverifikasi terbaik: TRIGGER 22:15:02 = **tepat 21600 detik + 2s**
  setelah 16:15:00 — window geser 6 jam expired tepat saat itu, breaker fail-open
  ke izin restart persis sesuai desain. Bukan kebetulan yang menguntungkan;
  logika window-nya benar.
- Invariant ≤3 restart/6 jam **terpenuhi pas di cap** (22:15→01:15 = 3 jam,
  3 restart; restart ke-4 sebelum 04:15 pasti diblok). Loop gaya 13 Nov
  (9 trigger beruntun) secara konstruksi tidak mungkin lagi.

**no_heal_rate post-patch: 2/3 = 66.7%** (pra-patch 62.5%, 25/40).
- Restart 22:15: tidak sembuh — 34 marker pasca-restart, episode lanjut sampai
  23:33.
- Restart 23:15: tidak sembuh — 10 marker pasca-restart (gap pertama 15.2 menit).
- Restart 01:15: **sembuh** — 0 marker pasca grace; episode berakhir 34 detik
  setelah trigger, lalu sunyi 7 jam.
- Konsisten dengan tesis report breaker: restart bukan cure jalur; episode
  berakhir sendiri. Flap pagi ini (08:12–09:00, ~10 marker) bahkan self-heal
  total tanpa satu pun TRIGGER watchdog — lapisan fallback plugin cukup.

**Misteri 03:00 bukan fault:** `hermes-weekly-restart.timer` (Sun 03:00, mitigasi
memory growth) — restart terencana, NRestarts=0, watchdog benar tidak ikut campur
(svc=active saat semua tick malam).

**Metric:** restart beruntun pada episode kronis: 9/65 menit pra-patch (13 Nov)
→ **max 3/6 jam, dijaga hard** pasca-patch; restart diblok breaker hari-1: 17.
Churn downtime: ~30–40 detik × 40/minggu → 3 restart terukur/13.7 jam, semua
recovery terdeteksi 6–7 detik pasca-TERM.

## Decision

**Adopt** — breaker bekerja sesuai desain pada hari pertama: trip tepat, cap
ditegakkan, fail-open di tepi window persis benar, dan satu episode benar-benar
sembuh via restart (bukti restart tetap berguna untuk episode pendek stuck).
Tidak ada patch lanjutan. Watchdog tetap reposisi anti-hang proses, bukan
anti-outage jalur.

`ponytail:` breaker parse-log-sendiri terbukti cukup — tidak ada alasan pindah
ke state db. Ujian sesungguhnya (mega-episode kronis gaya 13 Nov) belum datang;
kalau datang dan cap 3/6 jam ternyata masih kebanyakan, baru turunkan ambang.

## Risk

- n=1 hari, 3 restart saja — breaker belum menghadapi loop brutal 9-trigger;
  klaim keberhasilan berbasis desain + sampel kecil, bukan stress test.
- Episode kronis kini bisa berjalan tanpa restart hingga 6 jam — tetap sink cost
  sadar karena restart tidak terbukti menyembuhkan.
- Kalau log watchdog hilang/rotasi agresif, breaker reset fail-open (perilaku
  lama kembali).

## Lessons Learned

- Verdict cepat (<24 jam setelah patch) mengubah klaim "dari simulasi" jadi
  "terukur di produksi" — dan menemukan detail yang simulasi tidak tangkap
  (fail-open di tepi window berjalan presisi detik).
- Restart terencana mingguan (timer) bisa tampak sebagai misteri fault kalau
  inventori timer tidak dicek — cross-check `systemctl list-timers` sebelum
  menuduh watchdog/gateway.

## Next Priority

- Biarkan berjalan; cek ulang saat mega-episode kronis pertama pasca-patch
  (target: terjadi ≤3 restart, episode berakhir via self-heal).
- Flap leg VPS→DC masih episodic (2 mini-episode/24 jam terakhir, semua
  self-heal) — socat kedua ke DC alternatif tetap ditunda sampai frekuensi naik.
