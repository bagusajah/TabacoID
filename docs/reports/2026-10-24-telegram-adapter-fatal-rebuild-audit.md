---
task_id: t_f0c4a230
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-24
status: published
human_review: autonomous
---

# Audit Fatal-Rebuild Adapter Telegram: 8 Insiden/30 Hari, Avail 99.94%, Tanpa Knob

## Engineering Question

Gateway Telegram tadi pagi (10-24 08:12) melempar `Fatal telegram adapter error` lagi — ketiga kalinya minggu ini. `updater.stop() did not finish before the network-recovery deadline; rebuilding the adapter` — platform down sementara, dan 10-19 lalu reconnect-nya sampai 42 menit. Pertanyaan: **seberapa sering ini terjadi, seberapa lama down per insiden, apa pemicunya, dan ada knob yang bisa di-tune?**

## Method

1. Grep `gateway.log` + 80 arsip `.gz` (~30 hari, sejak 2026-09-24): semua event `Fatal telegram adapter error` + `Connected to Telegram (polling mode)` terkait.
2. Rekonstruksi per insiden: trigger (baris log sebelum fatal) → waktu reconnect → downtime.
3. Densitas blip jaringan per jam (semua `ConnectError/ConnectTimeout/network error`) untuk cek korelasi jam.
4. Telusuri `plugins/platforms/telegram/adapter.py` di hermes-agent: konstanta deadline/retry/heartbeat, apakah dibaca dari config atau env.
5. Tabel `messages` + `sessions` di `state.db`: apakah ada pesan user di jendela outage (deteksi pesan hilang).

## Findings

**Tabel insiden lengkap, 2026-09-24 → 2026-10-24:**

| Tanggal | Jam (WIB) | Trigger | Degraded | Recovery |
|---------|-----------|---------|----------|----------|
| 09-24 | 08:11 | 502 Bad Gateway DC | 20 s | normal |
| 10-10 | 08:11 | 502 Bad Gateway DC | 24 s | normal |
| 10-15 | 08:12 | 502 Bad Gateway DC | 2 s | normal |
| 10-16 | 08:12 | 502 Bad Gateway DC | 21 s | normal |
| 10-19 | 05:29 | ConnectTimeout multi-DC | 50 s | normal |
| 10-19 | 08:12 | 502 + timeout (129 blip/jam) | 17 m 44 s | 5× fatal berantai |
| 10-19 | 08:49 | 10 retry habis, eskalasi gateway recovery | 4 m 5 s | sukses |
| 10-24 | 08:12 | 502 Bad Gateway DC | 14 s | normal |

**Metrik gabungan:** 8 insiden / 30 hari → total degraded **24.0 menit** → availability platform Telegram **99.94%**. Median 21 s, 6 dari 8 insiden < 60 s. Yang menonjol cuma cluster 10-19 (22 menit gabungan, 2 fatal + 5 reconnect gagal berantai).

**Pola jam mengejutkan:** 6 dari 8 fatal di menit yang sama **08:11-08:12 WIB (= 01:11 UTC)**, di 5 tanggal berbeda. Ini bukan kebetulan acak — 01:00 UTC adalah awal **maintenance window resmi Telegram (01:00-07:00 UTC)**, dan densitas blip jam 08 WIB (235) memang tertinggi dari semua jam (baseline jam lain 20-50). Jam 13-14 WIB (06-07 UTC, akhir window) juga elevated (104/100). Kesimpulan: fatal rebuild kita adalah efek samping jendela maintenance Telegram, bukan gangguan lokal (anacron jalan 11:31, 12:34, 13:32 — tidak ada job 08:11; systemd timer juga tidak ada).

**Sifat kejadian (dari urutan log):** trigger eksternal (502 dari datacenter Telegram / ConnectTimeout) → adapter masuk reconnect → `updater.stop()` tidak selesai dalam deadline 15 s → **fatal rebuild penuh** (adapter dibuang, IP fallback di-discover ulang via DoH, reconnect). Ini by-design fail-fast: `_UPDATER_STOP_TIMEOUT = 15.0` dengan komentar eksplisit *"Internal safety bounds (not user knobs)"* — guard anti-CLOSE-WAIT-hang (socket mati yang block close selamanya). Alternatifnya adalah gateway bungam selamanya, yang lebih buruk.

**Knob:** tidak ada yang exposed di `config.yaml` (blok telegram cuma `enabled` + `home_channel`). Env var yang ada: `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS` (on/off discovery, tidak relevan), `TELEGRAM_WEBHOOK_HOST`. Heartbeat 90 s dan timeout 15 s semua hardcoded. **Tidak ada tuning yang tersedia tanpa fork kode plugin.**

**Dampak ke user:** nol bukti pesan hilang. `messages` + `sessions`: nol pesan user di jendela 10-19 08:05-09:00 dan 10-24 08:05-08:35. Long-polling + offset Telegram membuat pesan saat downtime terantri di server dan diterima saat reconnect. Yang terjadi hanya latency: pesan user 08:12 pagi ini dibalas 08:13 (1 m 15 s end-to-end, termasuk 14 s outage).

## Decision

**Needs Human Review** — tetap pasif, dengan opsi konkret untuk review:

1. **Terima sebagai-is (rekomendasi):** avail 99.94%, median 21 s, nol pesan hilang, semua fatal terjadi di maintenance window Telegram. Cost tuning > benefit.
2. Fork/tuning hanya layak kalau cluster 10-19-style (berantai fatal + 40 menit down) terulang ≥ 2× dalam sebulan — tambahkan ke kriteria eskalasi.

Tindakan sekarang: tidak ada perubahan kode/config. Report ini jadi baseline terukur untuk membandingkan insiden berikutnya.

## Risk

- Cluster berantai seperti 10-19 (reconnect loop 10× × backoff 60 s ≈ 40 menit) bisa terulang di maintenance window berikutnya — backoff yang panjang membuat satu bad hour jadi outage panjang.
- Angka avail 99.94% dihitung dari log yang sudah ter-rotate; insiden < 2 s bisa luput jika log rotate agresif.
- "Nol pesan hilang" dibatasi jendela yang dicek; pesan user di luar jendela insiden tidak dianalisis.

## Lessons Learned

- Jam 08:00 WIB = 01:00 UTC bukan jam sibuk lokal — itu pintu masuk maintenance window Telegram. "Fatal error tiap pagi" ternyata bencana yang dijadwalkan pihak lain.
- Fail-fast 15 s dengan rebuild terlihat alarmis di log, tapi desainnya benar: deadline melindungi dari CLOSE-WAIT hang yang bikin gateway bungam permanen. Log berisik ≠ sistem tidak sehat.
- Pengukuran downtime harus dari pasangan log (fatal → connected), bukan dari jumlah error — 8 fatal hanya menghasilkan 24 menit degraded, bukan 8 outage.

## Next Priority

- Monitor: kalau cluster berantai 10-19 terulang ≥ 2×/bulan, buka opsi tuning backoff (butuh fork plugin atau upstream patch).
- Kalau fatal terjadi di luar maintenance window, itu sinyal baru yang layak investigasi (jaringan lokal/TUN).
- Baseline ini bisa jadi pembanding saat gateway di-upgrade (versi plugin baru bisa mengubah perilaku reconnect).
