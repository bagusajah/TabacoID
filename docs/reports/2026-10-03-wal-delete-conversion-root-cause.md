---
task_id: daily-focus (board kosong; incident response)
objective: OBJ-002
experiment: null
category: Infrastructure
date: 2026-10-03
status: published
human_review: autonomous
---

# Root Cause Ditemukan: Pemicu Recycle Deleted-WAL, dan Re-arm Escape Launcher

## Engineering Question
Recycle deleted-WAL sukses 10:12 (2 holder → 0), tapi pukul 10:21 gateway baru
keburuk pegang WAL generasi yang langsung di-retire. Siapa penghapusnya? Dan
bagaimana session cron hari ini (cucu gateway zombie) bisa memperbaiki tanpa
membunuh leluhurnya sendiri?

## Method
1. Hitung holder via `/proc/*/fd` deleted (bukan log): gateway utama PID 1962340
   sejak 10:21 + gateway EM profile — pola sama seperti kejadian sebelumnya.
2. Session ini terverifikasi cucu dari gateway zombie (pid→ppid→1962340), jadi
   re-arm jalur escape: `systemd-run --user --unit=wal-recycle-escape
   recycle-escape-launcher.sh 1977007 10800` (watch worker cron sendiri, bukan
   bunuh leluhur). Unit aktif, self-check 3/4 OK (item ke-4 WARN holders=1 itu
   memang kondisi pending, bukan gagal).
3. Buru pemicu retire pakai audit trail walguard (`ausearch -k walguard -i`,
   rules dari t_47c2586d) — pertama kali ketemu pelaku hidup-hidup.

## Findings
- **Pelaku unlink: `cron.scheduler` worker** — proctitle `python -m
  cron.scheduler` (pid 1977007/1977008, ppid=gateway), syscall `unlinkat
  state.db-wal` + `state.db-shm` pukul 11:00:48, empat detik sebelum FATAL
  11:00:52. Pemicu: worker buka DB baru → jalur
  `apply_wal_with_fallback` (`hermes_state_wal.py`) → `_apply_delete_for_wal_reset_bug`
  → unlink sidecar di bawah gateway yang masih pegang inode → gateway jadi
  holder deleted-generation.
- **Root cause loop:** `is_sqlite_wal_reset_vulnerable()` = False di runtime ini
  (venv Python 3.11.15 + SQLite **3.53.1**, bug ditutup sejak 3.51.3), tapi jalur
  delete-reset tetap dieksekusi setiap worker membuka DB yang header-nya WAL
  (state.db header write/read_version=2). Inilah generator ke-11 arsip
  `state.db.retired-wal-*` (±2.5 GB) sejak Sep-20.
- FATAL muncul tepat per jam (09:00, 10:00, 11:00): tick cron hourly yang spawn
  worker; setiap tick = satu percobaan konversi yang selalu kena guard, dan
  pelakunya selalu cron scheduler sendiri.
- Klaim report kemarin ("EM gagal karena system python 3.10") perlu koreksi
  konteks: itu memang crash terpisah (redact.py), tapi pemantik siklus harian
  inilah konversi delete di worker cron. Fix launcher venv tetap valid.
- `hermes config get database.journal_mode` = `wal` (default+EM): kalimat
  "journal_mode: delete" di pesan FATAL adalah advice statis untuk operator,
  bukan refleksi config — narasi lama "config mismatch" tidak berlaku di sini.

## Decision
**Adopt + Needs Human Review (upstream).** Operational: re-arm escape launcher
sudah berjalan, recycle akan mengeksekusi 90 detik setelah sesi cron ini selesai
(planned stop marker → SIGTERM → systemd revive), target holder=0. Perbaikan
permanen (menghentikan konversi delete pada SQLite ≥3.51.3 / menjadikan
`apply_wal_with_fallback` no-op ketika WAL sudah aktif) menyentuh core
hermes-agent — butuh keputusan user untuk PR upstream, di luar otoritas cron ini.

## Risk
- Gateway naik-turun sekali lagi pasca-sesi ini (pola terbukti, dampak < 10 detik).
- Selama jalur delete-reset belum dimatikan, setiap tick cron yang spawn worker
  bisa membuat zombie baru — recycle escape mungkin perlu di-arm lagi.
- 11 arsip retired (±2.5 GB) menumpuk di ~/.hermes — belum dibersihkan (keputusan
  disposition frame WAL butuh operator, sesuai manifest.json).

## Lessons Learned
- `/proc/*/fd` untuk menghitung holder itu benar, tapi `ausearch -k walguard`
  yang menjawab "siapa". Watch rule audit dibuat Sep-27 baru terbukti nilainya
  hari ini — forensik harus dipasang SEBELUM kejadian berulang.
- Pesan error yang menyebut "database.journal_mode: delete" bisa menyesatkan:
  ia advice operator, bukan fakta config. Selalu cross-check config aktual
  (`hermes config get`) sebelum membangun teori.
- Proctitle di audit log memberi identitas proses tanpa tebak-tebakan argv.

## Next Priority
1. User review: proposal PR upstream — guard `is_sqlite_wal_reset_vulnerable()`
   juga menghentikan jalur `_apply_delete_for_wal_reset_bug` di runtime yang
   sudah patched (SQLite ≥ 3.51.3), atau minimal hardening di sisi worker cron.
2. Tick berikutnya: verifikasi holder=0 dan tidak ada FATAL jam 12:00.
3. Keputusan disposition 11 arsip retired-WAL (hapus atau simpan).
