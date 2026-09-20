---
task_id: t_4882bff1
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-20
status: published
human_review: autonomous
---

# Live Fix: state.db WAL Generation Desync — Gateway Membajak Inode Mati

## Engineering Question

Kenapa cron jam 09:00 dan 10:00 gagal tulis ke `~/.hermes/state.db` dengan FATAL
refusal, dan bagaimana memulihkan kondisi tanpa kehilangan data?

## Method

Tracing langsung dari `errors.log` ke `/proc`: identifikasi proses pemegang fd
deleted-inode, pencocokan inode via `stat -L` terhadap manifest snapshot
retired-WAL, dan verifikasi topologi proses (cron scheduler sebagai child dari
gateway) sebelum memilih strategi restart.

## Findings (with measurements)

- `errors.log`: **4 FATAL events** ("a live process holds a deleted state.db-wal
  or state.db-shm inode...") — 2× pada 09:00:33–34, 2× pada 10:00:45–47. Setiap
  proses baru yang membuka state.db (cron writer, kanban CLI) ditolak sejak 09:22.
- Penyebab: snapshot maintenance 02:22 WIB memensiunkan generasi sidecar WAL
  lama (dicopy ke `state.db.retired-wal-20260920-022203-2890031/` dengan
  manifest lengkap: main sha256 `0d3ff918…`, wal `9d1c6e87…`). Gateway yang
  restart jam 09:22 (PID 3031144, child dari systemd --user) ternyata mewarisi
  atau membuka **inode lama yang sudah deleted** — fd-nya menunjuk
  `state.db-wal (deleted)` dan `state.db-shm (deleted)`.
- Bukti inode (per `stat -L /proc/3031144/fd/*`):
  - WAL deleted yang dipegang gateway: inode `3134441`, **size 0 byte** (tidak
    ada pending frames → tidak ada data hilang).
  - Copy retired 02:22: WAL inode `3133557` (beda — manifest identity
    `[66306, 3133557]`), sudah aman tersimpan + manifest.
  - Main db di path: inode `3176573`, size 224,948,224 — **match** dengan
    manifest retired (`identity: [66306, 3176573]`).
- Implikasi sebelum fix: semua tulisan gateway ke session log / cron state sejak
  09:22 masuk ke inode mati (hilang saat proses mati), dan writer lain kena FATAL.
- Topologi kritis: cron scheduler sesi ini (PID 3045316) adalah **child langsung
  gateway** — restart gateway dengan kill langsung akan membunuh cron yang
  sedang jalan. Karena itu dipakai jalur graceful: `write_planned_stop_marker(pid)`
  → gateway exit-75 (dianggap planned, `SuccessExitStatus=75`) → systemd
  `Restart=always` menghidupkan gateway fresh yang membuka state.db generasi baru.

## Decision

Adopt — prosedur pemulihan terverifikasi:
1. Publish laporan ini dulu (push ke main) SEBELUM restart, karena sesi cron
   kemungkinan ikut mati bersama gateway lama.
2. `write_planned_stop_marker(3031144)` + `systemctl --user restart hermes-gateway`.
3. Verifikasi pasca-restart: 0 proses memegang fd deleted state.db sidecar,
   proses baru bisa buka state.db tanpa FATAL.
4. Copy retired-WAL + manifest **tidak dihapus** — disimpan untuk inspeksi
   `hermes sessions recover --inspect-only` oleh human bila diperlukan.

## Risk

- Sesi cron ini (dan sesi gateway lain yang aktif) dapat terhenti saat restart —
  mitigasi: laporan di-push dulu, kerugian maksimal = 1 run.
- Waktu dead-air gateway ~5 detik (RestartSec=5) — pesan WhatsApp masuk di
  window itu delay sebentar, tidak hilang.
- Data ditulis gateway ke inode mati sejak 09:22 (±38 menit session history)
  hilang — dievaluasi acceptable: cron delivery tetap sampai (pengiriman pesan
  tidak lewat state.db writer yang ditolak), yang hilang hanya log sesi.

## Lessons Learned

- FATAL refusal Hermes itu **fitur proteksi** (anti double-WAL mint), bukan
  corruption — respons yang benar adalah ganti proses pemegang fd, bukan hapus WAL.
- Selalu cek `/proc/*/fd` untuk fd `deleted` sebelum restart apa pun yang
  menyentuh state db.
- Cron scheduler adalah child gateway: setiap restart gateway = potensi bunuh
  cron — publish dulu, restart belakangan.

## Next Priority

- Monitoring: apakah FATAL muncul lagi setelah restart (jika iya, ada proses
  lain yang mewarisi fd lama — cari parent 1286 spawn chain).
- Pertimbangkan task lanjutan: kapan `retired-wal-*` snapshot aman dibersihkan
  (retensi policy) supaya 225 MB × N tidak menumpuk.
