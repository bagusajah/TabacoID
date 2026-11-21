---
task_id: t_b259dbc2
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-21
status: published
human_review: autonomous
---

# Verdict Minggu-2 Stack Telegram: Relay + Circuit Breaker + Veto Self-Heal

## Engineering Question

Saga Telegram ditutup di retro W46 dengan stack tiga lapisan (relay socat VPS,
circuit breaker, veto self-heal). Pertanyaan minggu-2: apakah stack ini masih
tepat, atau justru menutupi masalah yang belum selesai? Data minggu-1
(8–14 Nov) dijadikan baseline.

## Method

Hitung ulang dari log mentah, bukan dari kesan: marker failure Telegram di
`errors.log` (aktif + 6 rotated gz), baris TRIGGER/recovered/skip di log
watchdog, dan fatal count, per hari, untuk dua window 7 hari. Kondisi relay
dicek langsung (TCP connect ke 100.65.68.15:443).

## Findings (with measurements)

| Metric | Week-1 (8–14 Nov) | Week-2 (15–21 Nov) | Δ |
|---|---|---|---|
| Marker failure/hari (total) | 1901 (avg 272) | 1307 (avg 187) | −31% |
| Fatal | 61 | 10 | −84% |
| TRIGGER watchdog | 46 | 31 | −33% |
| Restart watchdog | ~46 (pre-breaker) | 31 | semua recovery ~7s |

Detail week-2:

- **Episode harian itu nyata, bukan noise.** Marker per hari: 103, 206, 295,
  249, 364, 40, 50. 27 dari 31 TRIGGER terkonsentrasi 15–18 Nov; lalu
  melandai drastis (19 Nov: 3, 20 Nov: 0, 21 Nov: 1).
- **Guard bekerja sesuai desain.** 66 skip di week-2: 39 veto self-heal
  (episode sembuh sendiri, restart tidak perlu) + 27 circuit breaker
  (menahan restart redundan di tengah episode kronis). Semua 31 TRIGGER
  menghasilkan tepat satu restart; nol restart-loop.
- **Dua TRIGGER dengan marker fresh awalnya dicurigai false positive**
  (19 Nov 07:20 age=0s; 21 Nov 03:10 age=13s). Ternyata legit: keduanya
  episode hidup (71 dan 12 markers/30 menit), restart benar, gateway pulih
  ~7 detik.
- **Hari terburuk 19 Nov** (364 markers, 3 restart, 9 fatal — 90% fatal
  week-2 dari hari itu) adalah ekor episode 18–19 Nov, bukan episode baru.
- **Relay sehat** saat verdict: port 443 VPS OPEN, sticky IPv4 via relay
  masih dipakai adapter.
- 0 fatal week-2 berasal dari watchdog; 0 outage akibat restart watchdog.

## Decision

**Adopt (pertahankan stack, stop menambah lapisan).**

Stack tiga lapisan terbukti menurunkan severity, bukan cuma memindahkan
masalah: fatal −84%, marker −31%, MTTR restart ~7 detik, guard menahan 66
restart yang tidak diperlukan. Episode harian yang tersisa adalah baseline
jalur ISP (policing selektif + PMTU black hole, lihat report 2026-11-08)
yang memang tidak bisa dibuang oleh stack ini — amplitudonya rendah
(≤10 menit, selalu pulih sendiri atau via satu restart). Menambah lapisan
infra baru untuk baseline seseking ini = over-engineering.

Konteks hari ini: 7/7 container Docker healthy pasca maintenance restart
daemon pagi (t_d6fb0e59), gateway 0 error 10 menit terakhir — sistem
sehat, tidak ada koreksi yang perlu dikejar.

## Risk

- Baseline episode bisa naik lagi musiman (pola ISP); watchdog tetap safety
  net, bukan cure.
- Counter "recovered" di log watchdog baru lengkap sejak 14 Nov — angka
  restart week-1 sebelum itu diestimasi dari TRIGGER, bukan tercatat persis.
- Log errors.log rotate daily 00:06; window 7 hari dihitung dari 7 file
  (aktif + 6 gz) — hari ke-7 week-1 (8 Nov) ter-cover errors.log.8.gz, tepat.

## Lessons Learned

- Verdict pasca-mitigasi harus tunggu window penuh; kesan "bersih" di hari
  pertama (9 marker pada 14 Nov) menyesatkan — minggu penuhnya ternyata
  272/hari.
- Guard yang menahan diri (veto + breaker) adalah 2/3 dari nilai stack:
  66 restart tidak perlu dicegah vs 31 yang dijalankan.
- Curiga false positive perlu dicek ke datanya: kedua trigger ber-marker
  fresh ternyata episode nyata. Guard-1 (umur marker) aman.

## Next Priority

Pantau pasif saja. Trigger re-investigation: marker ≥300/hari selama 2 minggu
berturut-turut, atau fatal ≥20/minggu — saat itu eksplorasi jalur alternatif
(butuh approval manusia karena mengubah routing/biaya).
