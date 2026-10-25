---
task_id: t_f44ecaef
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-25
status: published
human_review: autonomous
---

# Klasifikasi RSS hermes-webui: Plateau, Bukan Leak — 951MB Itu Normal

## Engineering Question

`hermes-webui.service` (hermes.tabaco.id) RSS 951 MB, up 16 hari — pemakai RAM
terbesar di Pi 7.7 GB. Apakah ini leak monoton yang akan makan host pelan-pelan,
atau plateau (alokasi cache/interpreter yang sekali naik lalu diam)?

## Method

1. Snapshot live: cgroup `memory.current`, `memory.peak`, `memory.events`, `memory.stat`.
2. Data historis 22 hari dari `~/.hermes/logs/memory-baseline.log` (crontab 30
   menit, top-5 proses by RSS, retensi 1000 entri ≈ 20 hari — kebetulan pas
   mencakup sejak webui start 9 Okt).
3. Ekstrak max python RSS per hari. Catatan jujur: sebelum 10 Okt dua proses
   python terbesar masih ~250-480 MB, jadi angka awal itu campuran gateway/webui;
   mulai 10 Okt jelas didominasi webui (≥1.2 GB).
4. Host-level: rata-rata `used` harian dari log yang sama + `sar -r` intrahari.
5. Restart/OOM audit: `NRestarts`, `ExecMainStartTimestamp`, memory.events.

## Findings

**Trend max-python RSS per hari (MB):**

| Tanggal | RSS | Fase |
|---------|-----|------|
| 10-04 → 10-09 | 260 → 482 | pra-dominasi webui (campuran gateway) |
| 10-10 → 10-11 | 1411 → 1500 | warm-up webui |
| 10-12 → 10-23 | 1282 → 1240 | **plateau 12 hari, puncak 1500** |
| 10-24 → 10-25 | 950 → 951 | turun sendiri ~290 MB, tanpa restart |

- Klasifikasi: **plateau**, bukan leak. Tidak ada growth monoton setelah fase
  warm-up 3 hari. RSS bahkan turun 1240 → 951 di 10-24 tanpa intervensi
  (allocator melepas memori setelah beban besar selesai).
- Host aman: rata-rata `used` 3.7-3.8 GB stabil sepanjang periode, turun ke
  3.3 GB hari ini. Swap zram cuma 1.4 G terpakai, tidak tumbuh.
- Cgroup: `memory.current` 1097 MB, `memory.peak` 3852 MB, `memory.events`
  **nol OOM, nol oom_kill** — puncak 3.8 GB pernah terjadi tapi jauh dari limit.
- `NRestarts=0` sejak start 2026-10-09 00:58 WIB. Service sehat.

**Konteks: crash-loop 10-24 tidak terkait memori** — itu import error pyyaml
(setelah update hermes-agent), fix `pip install -t` sudah tercatat di report
2026-10-24. Webui jalan normal lagi dan RSS-nya malah lebih rendah dari plateau
lama (fresh warm-up dari 951).

**Mengapa RSS 1 GB "wajar" di sini:** webui embed agent Hermes (import tree
besar, session history, KV cache UI). CPython jarang mengembalikan halaman ke
OS (arena fragmentation), jadi RSS setelah puncak beban memang menetap — itu
checkpoint RSS tertinggi, bukan kebocoran aktif.

## Decision

**Adopt (monitor, tanpa aksi)** — tidak perlu restart terjadwal, tidak perlu
menambahkan webui ke `hermes-weekly-restart.timer` (yang saat ini hanya
gateway + pitupi). Evidensinya tidak mendukung intervensi: plateau 12 hari +
drop mandiri + nol OOM. Restart preventif cuma akan reset warm-up cache.

**Kriteria eskalasi untuk run berikutnya** (biar tidak dianalisis ulang dari
nol): kalau max-python RSS > 1500 MB sustained ≥ 3 hari ATAU trend monoton
naik ≥ 100 MB/hari muncul lagi → tambah webui ke weekly-restart + eskalasi
ke user. Cukup cek `awk` satu baris di memory-baseline.log.

## Risk

- `memory-baseline.log` cuma nyimpan top-5 proses — kalau webui keluar dari
  top-5 (tidak mungkin dalam skenario leak, tapi mungkin setelah refactor),
  data trennya hilang tanpa peringatan.
- Max-python per hari bukan identifikasi per-proses; kalau gateway ikut
  membesar, angka ini tidak bisa membedakan. Untuk klasifikasi kasar sudah cukup.
- Peak 3852 MB tidak bisa diatribusikan ke waktu tertentu (memory.peak
  persisten sejak boot, tidak ada timestamp).

## Lessons Learned

- `memory-baseline.sh` yang sudah ter-wire di crontab sejak lama ternyata
  cukup untuk menjawab pertanyaan leak-vs-plateau — tidak perlu sar/atop baru.
  Cek dulu apa yang sudah ada sebelum pasang alat.
- RSS proses Python jangka panjang itu bentuknya tangga naik lalu datar,
  bukan garis lurus. Klasifikasi leak harus lihat ≥ 1 minggu, bukan snapshot.
- Journal user kosong (volatile, tanpa persist) — audit via cgroup +
  NRestarts lebih bisa diandalkan untuk service health.

## Next Priority

- `t_e60a9105` (≥ 3 Nov): verifikasi pasca-expiry cert apex tabaco.id.
- Monitoring RSS webui via kriteria eskalasi di atas — tanpa cron baru.
