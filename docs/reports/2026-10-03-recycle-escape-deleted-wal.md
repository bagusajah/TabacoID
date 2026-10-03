---
task_id: t_e63bf692
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-03
status: published
human_review: autonomous
---

# Escape-Launcher: Recycle Zombie Deleted-WAL dari Dalam Sesi Cron

## Engineering Question
Gateway utama (PID 3141184, service `hermes-gateway`, up sejak Sep 27) masih memegang inode
`state.db-wal`/`state.db-shm` yang sudah di-retire Sep 28 04:07 (manifest trigger "halt").
Akibatnya setiap sesi baru yang membuka state via `hermes_state` kena FATAL refusal —
2 kejadian lagi hari ini 09:00 (kejadian ke-4 sejak Sep 20). Bisa kah recycle dijalankan
kalau sesi cron yang mau memperbaiki justru ANAK dari zombie gateway itu sendiri?

## Method
1. Identifikasi holder via `lsof +L1`: 2 PID — 3141184 (gateway utama, state.db) dan
   2956867 (gateway profil emailmanager, state.db-nya sendiri).
2. Trace ancestry sesi cron: worker `cron.scheduler` (PID 1925937) → gateway 3141184 →
   systemd --user. Jadi recycle in-place = membunuh leluhur sendiri, mustahil langsung.
3. Solusi: transient systemd unit (`systemd-run --user --unit=wal-recycle-escape`)
   menjalankan launcher baru `~/.hermes/scripts/recycle-escape-launcher.sh <watch-pid>`:
   menunggu worker cron selesai (poll PID, timeout 3 jam) → grace 90 detik → menjalankan
   `recycle-deleted-wal-holders.py` yang sudah terverifikasi (planned-stop marker →
   SIGTERM → systemd menghidupkan ulang gateway di generasi WAL yang hidup).
4. Self-check `check-recycle-escape.sh`: unit aktif, watch-PID benar, holder masih
   pending, recycle script parse-able.

## Findings
- `deleted-WAL holders`: 2 PID / 7 fd (before) → dieksekusi otomatis setelah sesi ini
  selesai; verifikasi angka 0 menjadi tugas tick berikutnya.
- `hermes_state FATAL`: 2/hari hari ini (09:00:34, 09:00:36) → target 0 setelah recycle.
- Umur zombie holder: 3141184 pegang fd deleted sejak Sep 28 (5 hari), lolos 2 cycle
  perbaikan sebelumnya karena cycle-cycle itu memperbaiki generasi LAIN.
- Ancestry: sesi cron adalah keturunan gateway yang di-recycle — ini yang membuat semua
  perbaikan sebelumnya tidak bisa menyentuh holder utama dari dalam sesi.
- Self-check 4/4 OK (unit active PID 1929863, watch 1925937 benar, 2 holder pending,
  recycle script valid).

## Decision
**Adopt** — escape-launcher jadi pola baku: operasi yang tidak boleh membunuh leluhurnya
sendiri dijadwalkan via transient systemd unit yang menunggu sesi selesai. Skrip:
`recycle-escape-launcher.sh` (launcher) + `check-recycle-escape.sh` (verifikasi wiring).

## Risk
- Kalau worker cron gantung >3 jam, launcher tetap jalan setelah timeout (by design).
- Gateway naik-turun sekali (planned stop + systemd revive) — bridge WhatsApp reconnect
  otomatis; pola ini sama dengan recycle Sep 27 yang terbukti aman.
- Root cause "siapa yang me-retire WAL di bawah gateway hidup" (trigger "halt") belum
  ditemukan — masih bisa keulang. Tindak lanjut terpisah.

## Lessons Learned
- Tiga kali perbaikan berurutan tidak membersihkan holder yang ke-4 karena tiap cycle
  hanya melihat generasi terbaru; verifikasi harus menghitung SEMUA holder, bukan yang
  paling baru.
- `pgrep -f` mencocokkan command line proses yang sedang grepping sendiri — bukan error,
  tapi desain check harus selektif.
- Cron session punya bapak: cek ancestry dulu sebelum merancang aksi yang fatal bagi
  proses leluhur.

## Next Priority
Root-cause: temukan jalur kode yang me-retire WAL saat "halt" tanpa mematikan gateway
holder (kemungkinan di auto-maintenance / backup job). Kalau tertutup, class bug ini
berhenti; sekarang kita hanya memutus efeknya.
