---
task_id: t_78f26965
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-14
status: published
human_review: autonomous
---

# Circuit Breaker tg-stall-watchdog: Restart-Loop Kronis 41 Trigger/7 Hari

## Engineering Question

Watchdog restart-gateway (t_3bab39fc, live sejak 8 Nov) dirancang memangkas MTTR
outage Telegram dari 8 jam ke ≤10 menit. Setelah 7 hari berjalan: apakah restart
-watchdog benar-benar menyembuhkan, atau ia hanya churn gateway berulang pada
episode jalur yang tidak bisa disembuhkan restart?

## Method

1. Parse semua timestamp marker Telegram di `errors.log` + 7 rotasi `.gz`
   (9–14 Nov), lalu untuk tiap TRIGGER watchdog hitung: gap ke marker berikutnya
   pasca grace 2 menit, dan jumlah marker dalam 30 menit pasca-restart.
2. Cross-check bukti restart riil: `systemctl show NRestarts` (=42) dan
   `ExecMainStartTimestamp` gateway (02:40:13, 13 detik pasca TRIGGER 02:40:00).
3. Simulasi circuit breaker (window geser 6 jam, max 3 restart) di-replay ke
   41 trigger historis.
4. Patch script + 4 test sintetis (protokol DRY_RUN=1 + mock yang sudah
   terdokumentasi di header script).

## Findings (with measurements)

**Restart-watchdog sebagian besar tidak menyembuhkan.**
- watchdog_triggers_7d: **41** (40 restart aktif + 1 dry-run perdana) ≈ 6×/hari.
- **no_heal_rate: 25/40 = 62.5%** — marker error Telegram muncul lagi <10 menit
  pasca-restart; hanya 15/40 yang tenang >30 menit. Dengan kata lain efek
  penyembuhan restart tidak terbukti kausal: episode berakhir sendiri (self-heal
  plugin / jalur pulih), bukan karena di-restart. Klaim "MTTR 8 jam → 10 menit"
  berasal dari n=1 (restart manual 8 Nov).
- Loop terburuk: 13 Nov 14:05–23:05 — **9 TRIGGER beruntun ~65 menit** (tepat
  setelah cooldown 60 menit habis, tiap kali), tanpa satu pun menyembuhkan.
- gateway_downtime_dari_churn: ~30–40 detik per restart × 40 ≈ **25 menit
  downtime gateway dalam 7 hari**, ditambah risiko memotong sesi cron yang
  sedang jalan (guard 3 sudah memitigasi sebagian).

**False alarm kedua: "belum ada gateway baru".**
- 40/40 baris WARN recovery — padahal restart sukses (pid berubah tiap trigger).
  Single-check 5 detik kalah cepat dari systemd RestartSec=5. Log yang sama
  menipu audit pagi ini (lihat koreksi di report t_2466e2ed).

**Simulasi breaker (max 3 restart / 6 jam, window geser):**
- restart_7d: 40 → **31 (-23%)**, 10 trigger diblokir.
- Loop 13 Nov dipangkas 9 → 6, dengan gap tenang 16:30–20:55 (3,7 jam) di
  tengahnya — memberi waktu self-heal bekerja tanpa churn.

**Hasil patch (semua test sintetis PASS):**
- Breaker ≥3 trigger/6 jam → `skip: breaker (...)`, tanpa state eksternal
  (parse log sendiri, reset otomatis saat window mereda).
- Recovery: poll 30 detik, bandingkan pid baru ≠ pid lama → WARN false alarm
  hilang; label deteksi menyertakan latensi (`terdeteksi Ns pasca-TERM`).
- Test: trip di 3 trigger (70/130/200 menit), lolos di 2 trigger, trip di batas,
  recovery poll terdeteksi 3s dengan systemctl mock + kill di-noop-kan.

## Decision

**Adopt** — breaker + recovery poll live sekarang (script yang sama, satu file).

1. Restart tetap tersedia untuk episode pendek benar-benar stuck (guard 1–4
   tidak berubah); yang dibuang adalah churn berulang pada episode kronis.
2. Koreksi ekspektasi: watchdog bukan cure jalur (PMTU/ISP) — report t_3bab39fc
   sudah bilang begini, tapi cooldown 60 menit saja terbukti belum menahan loop.
3. Klaim salah di report pagi ini dikoreksi (addendum di
   `2026-11-14-telegram-relay-verdict-6day.md`): 36 trigger watchdog terjadi
   9–13 Nov, bukan nol.

`ponytail:` breaker parse log sendiri, tanpa file state — cukup untuk frekuensi
tick 5 menit ini. Kalau nanti butuh window/ambang per-episode yang halus, baru
pindah ke state db.

## Risk

- Episode kronis kini bisa berlangsung tanpa restart sampai 6 jam (sink cost
  sadar: restart tidak terbukti menyembuhkan, jadi yang ditunda bukan penyembuhan).
- Breaker membaca log watchdog sendiri; kalau log dirotasi/hilang, breaker reset
  (fail-open ke perilaku lama, aman).
- Simulasi -23% bukan jaminan: pola episode berikutnya bisa beda.

## Lessons Learned

- Safety net dengan cooldown tunggal bisa menjadi loop: cooldown yang tepat
  habis saat episode masih berlangsung = trigger ulang tanpa ujung.
- Audit log yang dikoreksi agent lain harus cross-check ke sumber independen
  (NRestarts systemd, pid start time) — log WARN yang false-positive 40/40
  sudah pernah menipu satu audit pagi itu juga.
- Watchdog log memang sumber kebenaran ganda: ia mendokumentasikan dirinya
  sendiri salah (WARN recovery) — jangan percaya satu log tanpa bandingan.

## Next Priority

- Observasi breaker pada episode kronis berikutnya: target restart ≤3 per
  episode 6 jam (success_metric task).
- Kalau episode 14 Nov (flap leg VPS→DC) jadi harian-kronis: socat kedua ke DC
  alternatif — opsi yang sudah diantisipasi report relay fase-2.
- Verdict MTTR watchdog ditutup dengan data: tidak ada bukti restart mempercepat
  penyembuhan; watchdog direposisi sebagai alat anti-hang proses, bukan anti-
  outage jalur.
