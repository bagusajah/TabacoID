---
task_id: t_24092455
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-28
status: published
human_review: autonomous
---

# Verdict Minggu-3 Stack Telegram: Trigger Re-investigasi Tidak Kena, Muncul Degradasi Sticky-Relay yang Tertutup Dual-Path

## Engineering Question

Verdict minggu-2 (t_b259dbc2) menetapkan trigger re-investigasi eksplisit:
marker ≥300/hari selama 2 minggu berturut, atau fatal ≥20/minggu. Apakah
minggu-3 (22–28 Nov) kena trigger? Dan kenapa sticky relay path
(100.65.68.15) yang tadinya bersih tiba-tiba gagal massal sejak 21 Nov?

## Method

Hitung dari log mentah (bukan kesan): marker "Telegram" di errors.log
(aktif + .1, 22–28 Nov), fatal "Fatal telegram", TRIGGER/restart watchdog,
arah recovery di agent.log 8 file (sticky fail vs sticky success,
recovered via direct vs via relay), kondisi unit `tg-relay` di VPS via SSH
(systemctl + journalctl), dan probe live curl via-relay vs direct.

## Findings (with measurements)

| Metric | Week-2 (15–21 Nov) | Week-3 (22–28 Nov) | Δ |
|---|---|---|---|
| Marker failure | 1307 (avg 187/hari) | 758 (avg 108/hari) | −42% |
| Fatal | 10 | 8 | −20% |
| TRIGGER watchdog | 31 | 0 | −100% |
| Restart watchdog | 31 | 0 | −100% |

- **Trigger re-investigasi tidak kena.** Puncak marker minggu ini 182/hari
  (24 Nov), jauh di bawah ambang 300/hari; fatal 8 < 20/minggu.
- **Fenomena baru: sticky relay path jadi flaky.** Sejak 21 Nov, fail
  sticky harian 14→9→32→64→35→58→9. Minggu ini: 167 sukses vs 245 gagal
  (success rate 40%). Sebelum 21 Nov pola ini hampir tidak ada.
- **Tapi outage layanan = nol.** Setiap gagal sticky pulih via direct
  (recovered via api.telegram.org 140× minggu ini), dan sebaliknya direct
  gagal pulih via relay 106×. Dual-path + hostname last-resort bekerja
  sesuai desain fase-2.
- **27 Nov = hari terburuk (163 marker) terjelaskan:** `tg-relay` di VPS
  crash 2× dini hari (status=1/FAILURE, NRestarts=2, aktif lagi sejak
  27 Nov 01:10:27 WIB) — bertepatan dengan clock step-back ~7 jam di
  journal VPS. Sticky path menolak selama relay goblok, marker naik,
  pulih via direct. Saat ini relay sehat (active, RSS ~0.6 MB, probe
  via-relay HTTP 302 total 0.62s vs direct 0.93s).
- Tailscale Pi→VPS sehat: `tailscale ping` 19ms via 202.10.34.149
  (direct WGA, bukan DERP).

## Decision

**Adopt (pertahankan stack, tetap stop menambah lapisan).** Semua angka
turun atau nol, trigger re-investigasi tidak tersentuh. Degradasi sticky
relay 40% success rate bukan alasan revisi: biaya failure-nya cuma satu
warning + reconnect ~10 detik lewat jalur direct, tidak pernah jadi
outage. Menambah lapisan untuk noise level-rendah yang selalu pulih sendiri
= persis over-engineering yang ditolak di verdict minggu-2.

Catatan operasional: 2 crash-restart tg-relay (27 Nov) diduga terkait
ketidaksehatan clock VPS, bukan socat-nya. Satu episode, self-healed via
systemd scheduled restart. Tidak ada aksi.

## Risk

- Kalau suatu saat direct dan relay gagal BERSAMAAN, baru terjadi outage
  beneran — watchdog tetap safety net. Belum pernah terjadi di 3 minggu data.
- Clock VPS yang pernah melompat patut diwaspadai: kalau berulang, socat
  bisa crash lagi dan sticky path menolak berjam-jam. Trigger review:
  sticky fail >100/hari atau tg-relay NRestarts naik lagi.
- 28 Nov masih partial (data sampai ~10:20 WIB) — angka hari terakhir
  undercount, tidak mengubah verdict.

## Lessons Learned

- Verdict berbasis log mentah lagi-lagi menangkap hal yang kesan harian
  lewatkan: "Telegram error banyak" ternyata bukan episode ISP naik, tapi
  daemon relay crash + clock VPS.
- Dual-path recovery membuat degradasi path (40% success) tetap invisible
  di level layanan — desain graceful fallback dari fase-2 yang membayar
  dividen sekarang.
- Angka week-2 "31 restart semuanya efektif" vs week-3 "0 restart": guard
  (veto + breaker) plus minggu yang lebih tenang; jangan baca tren 0 sebagai
  "watchdog mati" — unitnya masih terpasang.

## Next Priority

Pantau pasif. Trigger re-investigasi tetap: marker ≥300/hari × 2 minggu,
fatal ≥20/minggu, atau tambahan baru: tg-relay crash berulang / clock VPS
melompat lagi → cek systemd timesync di VPS. Task bind hardening
(t_a1128938) dan reboot cycle (t_b4cee954) tetap approval-gated, bukan
domain verdict ini.
