---
task_id: t_1edefac6
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-09-20
status: published
human_review: autonomous
---

# state.db WAL sidecar yatim — semua writer baru kena FATAL, repair via systemd-run

## Engineering Question
`errors.log` 09:00:33 pagi ini: 2× `hermes_state: FATAL: a live process holds a deleted
state.db-wal or state.db-shm inode ...`. Apa root cause-nya, apa dampaknya ke cron
engineering, dan bagaimana jalur recovery yang disetujui (sanctioned) tanpa kehilangan data?

## Method
1. Debris recovery: satu report untracked dari run cicd-builder 2026-09-19 (coherent) →
   di-commit bareng report ini.
2. Diagnosa: `lsof +L1` → gateway PID 2890031 megang **3 fd menunjuk inode
   `state.db-wal`/`-shm` yang sudah di-unlink**; path `state.db-wal` tidak ada di disk.
3. `sqlite3 state.db "PRAGMA quick_check"` → `ok` (database sehat, bukan korupsi).
4. Smoke test reproduksi: `SessionDB(Path('~/.hermes/state.db'))` dari proses baru →
   ditolak `DeletedWalGenerationError`. FATAL itu memblokir SEMUA writer baru.
5. Timeline: inode WAL deleted ctime 09:00:30 — detik yang sama dua sesi cron
   (Daily Focus + CICD Builder) start dan buka state.db bareng gateway. Class race ini
   didokumentasikan sendiri di `hermes_state_repair.py`: writer lama masih megang WAL
   yang di-unlink saat generasi WAL baru dimintakan → guard menolak supaya tidak ada
   dua generasi WAL satu store. Pesan error-nya sudah membawa prosedur resmi:
   stop writer yang megang sidecar deleted, lalu reopen.
6. Kendala: proses cron ini adalah **anak cgroup gateway** (shell → cron.scheduler →
   gateway). Restart gateway dari dalam sesi = bunuh diri sendiri + sesi CICD Builder
   yang jalan paralel.
7. Fix: script `~/.hermes/scripts/repair-state-wal-orphan.sh` dijadwalkan via
   `systemd-run --user --unit=hermes-wal-repair` (transient unit, cgroup terpisah —
   selamat dari restart gateway). Script: verifikasi holder adalah gateway → kill-buffer
   tunggu sesi cron selesai (poll `pgrep -P $PID -f cron.scheduler`, cap 50 menit) →
   `write_planned_stop_marker(pid)` → SIGTERM → systemd `Restart=always` nurunin
   gateway lagi → log jumlah holder setelahnya ke `~/.hermes/logs/repair-wal.log`.

## Findings (with measurements)
- Deleted sidecar fd held by live gateway: **3 (sebelum) → target 0 (setelah restart)**;
  jumlah pasca-repair tercatat di `~/.hermes/logs/repair-wal.log`.
- Writer baru buka state.db: **100% gagal (`DeletedWalGenerationError`, direproduksi
  via smoke test) → diharapkan 100% sukses** pasca-restart. Verifikasi: run ulang smoke
  test atau lihat log repair.
- FATAL di errors.log: 2 kejadian, keduanya 09:00:33 (sesi cron ini sendiri).
- Dampak potensial kalau dibiarkan: LLM usage metrics (export-metrics.sh), session
  tracking, semua fitur yang nulis state.db gagal diem sampai gateway ke-restart
  dengan cara lain.
- `state.db` (225 MB) quick_check `ok` — tidak ada data hilang; WAL lama sudah kosong
  di disk sejak di-unlink, jadi restart tidak mengorbankan transaksi.

## Decision
**Adopt.** Restart adalah jalur resmi yang direkomendasikan pesan error itu sendiri;
database sehat, tidak ada perubahan kode/konfigurasi. Recovery dieksekusi via unit
systemd transient supaya proses repair tidak ikut mati saat gateway didown-kan.
Eksekusi terjadi setelah sesi cron hari ini selesai (kill-buffer), jadi verifikasi
angka akhir dibaca dari `repair-wal.log` pada run berikutnya.

## Risk
Rendah. Gateway down ~10 detik saat restart (pesan WhatsApp antre di platform).
Kill-buffer 50 menit = worst case repair tunda, bukan gagal. Kalau restart ternyata
tidak membersihkan holder (mis. PID lain ternyata juga pegang), log akan menunjukkan
`holders > 0` dan diagnosis lanjut ke penelusuran writer lain.

## Lessons Learned
- Sesi cron berjalan sebagai anak cgroup gateway — operasi lifecycle gateway
  (restart/stop) tidak boleh dieksekusi dari dalam sesi; pakai `systemd-run --user`
  supaya repair hidup di cgroup sendiri.
- Guard `DeletedWalGenerationError` itu penyelamat (mencegah dua generasi WAL), tapi
  dampaknya diam-diam memblokir semua writer — pantau `lsof +L1` kalau ada FATAL.
- Kanban `create --priority` menerima int (3=high), bukan string.

## Next Priority
1. Run berikutnya: verifikasi `holders=0` di `~/.hermes/logs/repair-wal.log` + smoke
   test `SessionDB` sukses.
2. Usulkan (perlu approval): health check WAL-generation harian di `memory-baseline.sh`
   — satu baris `lsof +L1 | grep -c "state.db.*deleted"` dengan alert kalau > 0,
   biar kejadian ini ketahuan dalam menit, bukan kebetulan.
