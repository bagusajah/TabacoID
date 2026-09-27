---
task_id: t_9ca8fa90
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-27
status: published
human_review: autonomous
---

# Recycle holder deleted state.db-wal — regresi FATAL journal_mode ditutup (containment terbukti)

## Engineering Question

Fix Sep-26 (t_30df7456) cuma ubah config `journal_mode: delete` → `wal`,
tapi FATAL "live process holds a deleted state.db-wal" muncul lagi hari ini
(09:00:28 dan 14:00:21, total 10 baris). Hipotesis task: akar masalahnya
proses lama yang masih pegang fd inode basi tidak pernah di-recycle —
config saja tidak cukup. Pertanyaannya: siapa holdernya, bagaimana ia
mewarisi inode basi, dan apakah recycle proses menutup regresinya?

## Method

1. Scan `/proc/*/fd` untuk fd dengan target `state.db-wal|shm (deleted)`.
2. Identitas holder dicek lewat `systemctl --user status <pid>` (bukan
   tebakan argv) → PID 3072978 = MainPID `hermes-gateway.service`.
3. Timeline rekonstruksi: retire WAL generasi 13:44 (direktori
   `state.db.retired-wal-20260927-064445-2996165` dibuat 13:44:58) bentrok
   dengan restart gateway — systemd menyalakan PID 3072978 pada 13:44:52,
   6 detik sebelum retire selesai. Gateway baru buka DB pas sidecar lama
   sedang dipindah → ia mewarisi fd inode basi.
4. Recycle: `write_planned_stop_marker(3072978)` (gateway/status.py:1515)
   supaya exit SIGTERM dianggap intentional, lalu SIGTERM — systemd
   auto-revive. Script: `~/.hermes/scripts/recycle-deleted-wal-holders.py`
   (scan → marker → TERM → verifikasi loop, exit non-zero kalau masih ada
   holder).
5. EM gateway (PID 2816740, profile emailmanager) ikut discan — kali ini
   bersih, tidak perlu disentuh.

## Findings

- **deleted state.db-wal/shm fds held by live gateways: 4 → 0** (holder
  tunggal: PID 3072978, fd wal×3 + shm×1).
- Gateway hidup lagi sebagai PID 3085789 (14:07:32), semua fd state.db-nya
  kini menunjuk file live; `PRAGMA journal_mode` = `wal` (config fix
  Sep-26 utuh, tidak diregresi).
- **FATAL journal_mode errors setelah fix: 0** (sebelumnya 10 hari ini).
- Pola regresi terkonfirmasi: setiap retire WAL yang beruntung dengan
  restart gateway menghasilkan holder baru. Ini race di pipeline retire
  hermes_state — fix Sep-26 menutup jalur konfigurasi, jalur proses belum.
- Dua run sebelumnya (61, 62) mati sebagai zombie di tengah pekerjaan yang
  sama; run ini menyelesaikan tanpa mengulang diagnosis mereka.

## Decision

Adopt. Script recycle masuk `~/.hermes/scripts/` dan dipakai lagi setiap
FATAL/class yang sama muncul. Ini containment terukur, bukan root fix —
root fix yang sesungguhnya ada di upstream hermes_state (retire harus
menunggu / me-recycle holder hidup), dan itu di luar jangkauan repo ini.

## Risk

Recycle = gateway restart ±20 detik. Chat aktif di tengah turn bisa
terputus — tapi FATAL yang dibiarkan justru memblokir semua writer state,
jadi trade-off-nya sepihak. Marker planned-stop memastikan systemd tidak
menganggap ini crash-loop.

## Lessons Learned

- Scan `/proc/*/fd` harus match `(deleted)` di belakang path — pattern
  `*deleted*state.db*` di depan saya bikin scan pertama salah hasil negatif.
- "Ubah config" dan "recycle proses" adalah dua setengah dari satu fix;
  config saja hanya menunda gejala sampai race berikutnya.

## Next Priority

Otomasikan: jalankan script recycle ini otomatis saat terdeteksi holder
deleted (watchdog errors.log atau dibuntel ke retire flow), supaya
regresi berikutnya self-healing tanpa nunggu cron manual.
