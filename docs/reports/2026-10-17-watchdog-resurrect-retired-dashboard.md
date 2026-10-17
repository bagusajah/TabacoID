---
task_id: t_2175b5f4
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-10-17
status: published
human_review: autonomous
---

# Watchdog Cron Membangunkan Kembali Dashboard yang Sudah Di-retire

## Engineering Question

Dashboard Hermes (:9119) sudah di-stop dan di-disable atas permintaan user
(Okt-2026, unit dianggap retired). Kenapa dia hidup lagi 2026-10-17 00:55,
13 jam sebelum ditemukan? Siapa penyalanya, dan bagaimana memastikan dia
tidak bangkit lagi?

## Method

1. `ps aux --sort=-rss` → hermes-dashboard aktif sejak 00:55 (PID 3593038,
   161 MB) di 0.0.0.0:9119.
2. Grep crontab, systemd timer, dan `~/.hermes/cron/jobs.json` untuk
   penyapa unit. Dua kandidat: `wal-containment.sh` (start eksplisit,
   tapi tidak ada bukti eksekusi pagi itu) dan cron
   **`cad6f228b72d` "Dashboard Watchdog"** — script no-agent
   `dashboard-watchdog.sh`, jalan `*/5 * * * *`, masih `enabled: true`
   dengan 21.726 runs. Script: curl :9119 → kalau gagal, restart unit.
3. Verifikasi timeline: `hermes cron runs` menunjukkan dispatch watchdog
   00:55:10; systemd mencatat unit `active since 00:55:13` — 3 detik
   setelahnya. Cocok.
4. Kenapa baru sekarang? Analisis lengkap butuh riwayat 3 hari (output
   watchdog `completed` tidak menyimpan stdout), tapi tidak mengubah
   keputusan: penyebab berkelanjutan adalah cron itu sendiri.

## Findings

| Metric | Before | After |
|---|---|---|
| Port 9119 | LISTEN (0.0.0.0) | **closed** |
| hermes-dashboard.service | active (running) 13j | **inactive + masked** |
| Cron Dashboard Watchdog | enabled, */5 min | **paused** (`enabled: false`) |
| Verifikasi tahan tick | — | tick 14:05 & 14:10 lewat, port tetap tutup |

Rantai penyebab: user retire dashboard (Okt-2026) → unit di-disable, tapi
cron watchdog (dibuat 2026-08-02, 6 hari uptime tiap restart) tidak ikut
di-pause → tiap 5 menit dia menganggap "dashboard mati = masalah" dan
menyalakannya lagi → dashboard hidup kembali pukul 00:55. Skrip lain yang
menyapa unit (`wal-containment.sh` line 47/74 `start hermes-dashboard`)
kini juga tidak berdaya karena unit di-mask — file unit dipindah ke
`hermes-dashboard.service.retired-20261017` agar symlink mask /dev/null
bisa dibuat.

## Decision

**Adopt.** Tiga langkah permanen:
1. `hermes cron pause cad6f228b72d` — watchdog tidak jalan lagi.
2. `systemctl --user stop hermes-dashboard` + **mask** unit.
3. Verifikasi fix bertahan melewati dua tick watchdog (14:05, 14:10).

Rollback (kalau user ingin dashboard kembali):
`hermes cron resume cad6f228b72d && systemctl --user unmask hermes-dashboard`
lalu restore file unit dari `.retired-20261017`.

## Risk

- Rendah: watchdog memang sudah tidak relevan untuk layanan yang
  di-retire. Kalau suatu saat dashboard dibutuhkan lagi, resume watchdog +
  unmask cukup.
- `wal-containment.sh` dan `wal-to-delete-convert.sh` masih menyebut unit
  ini — tidak berbahaya karena mask, tapi sebaiknya dibersihkan kalau
  skrip itu dipakai lagi (tidak dikerjakan hari ini, out of scope).

## Lessons Learned

- Retire sebuah layanan = retire **semua** otomasi yang mengelolanya.
  Disable unit saja tidak cukup — cron/agent pendampingnya harus
  di-pause/remove juga.
- Health-check watchdog untuk layanan yang sengaja dimatikan adalah
  gaya "conflict" antara operator dan otomasi: keduanya benar sesuai
  pandangan masing-masing.
- Audit `hermes cron list` sekali-sekali penting: cron yang dibuat Agustus
  lolos dari ingatan dan tetap jalan 2.5 bulan.

## Next Priority

- Bersihkan referensi `hermes-dashboard` di `wal-containment.sh` +
  `wal-to-delete-convert.sh` (5 menit kerja, bisa jadi cadangan task
  kecil).
- Lanjutkan audit cron lain yang mungkin sudah stale (HE3 di backlog).
