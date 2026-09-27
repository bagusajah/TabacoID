---
task_id: t_79ed6e3b
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-09-27
status: published
human_review: autonomous
---

# Repair Recurring state.db Deleted-WAL Generation

## Engineering Question
Kenapa FATAL `DeletedWalGenerationError` di `~/.hermes/logs/errors.log` muncul berulang (09:00–15:01 WIB, ~per jam, 15 kejadian hari ini), padahal insiden kelas yang sama sudah di-contain 21 Sep via `journal_mode=delete`?

## Method
Forensik read-only, tanpa restart: `lsof +L1` + `/proc/<pid>/fd`, baca manifest.json retired-WAL capture, telusur journalctl systemd, banding config.yaml dengan backup, audit 5 skrip containment lama di `~/.hermes/scripts/`.

## Findings
1. **Live holder orphans:** gateway (PID 3085789) pegang fd `state.db-wal (deleted)` + `state.db-shm (deleted)`; file `-wal`/`-shm` hilang dari disk. Setiap writer baru yang buka state.db kena guard halt → FATAL.
2. **Recurring, bukan sekali:** 9 dir `state.db.retired-wal-*` hari ini saja, total **2.0 GB** salinan (masing-masing ~226 MB). 14:07 ada dua capture dalam 30 detik dari dua PID gateway beda → crash-loop startup sempat terjadi.
3. **Config flip:** `database.journal_mode` diubah `delete`→`wal` pada 26 Sep 15:26 (`config.yaml.bak-20260926` masih `delete`). Header DB live = WAL — config dan on-disk saat ini **selaras**; mode journal bukan lagi pemicunya. Yang hilang: siapa yang meng-unlink sidecar WAL di bawah gateway hidup (belum teridentifikasi — perlu ftrace/audit di siklus berikut).
4. **Repair lama self-stall:** `repair-state-wal-orphan.sh` (run 13:44) menunggu `cron.scheduler` child gateway exit — itu **daemon long-lived yang tidak pernah exit** → kill-buffer mentok 50 menit tiap run, dan ternyata memang sempat "holders=0" jam 13:44 tapi kondisi kambuh <25 menit kemudian (gateway baru 14:07 langsung pegang WAL deleted lagi dari proses lain yang belum mati).

## Decision
**Adopt** (sanctioned path, tanpa konversi DB — config sudah selaras wal/wal sesuai catatan insiden EM: jangan konversi ulang, selaraskan):
- Patch `repair-state-wal-orphan.sh`: wait-loop `pgrep cron.scheduler` → `systemctl --user list-units 'hermes-worker-*'` (worker scope transient = unit kerja cron beneran; daemon scheduler tidak dihitung).
- Eksekusi repair via `systemd-run --user` (detached dari cgroup gateway), rencana stop marker → SIGTERM gateway → systemd `Restart=always` hidupkan lagi → `-wal` baru di-mint.

## Risk
- Repair menunggu worker cron aktif (termasuk sesi yang menulis laporan ini) — sengaja: gateway jangan direstart saat sesi cron mid-work. Maksimal 50 menit, lalu jalan sendiri.
- Penghapus WAL belum teridentifikasi → kambuh mungkin. Mitigasi: repair skrip idempotent + monitor errors.log.

## Lessons Learned
- `pgrep -P <gateway> cron.scheduler` salah proxy untuk "sesi cron in-flight": scheduler adalah daemon, bukan sesi. Unit kerja cron yang benar adalah systemd worker scope transient.
- Guard FATAL upstream memang desain benar (cegah double-WAL mint) — masalahnya operator-side: proses ber-Cyg holder orphan harus direcycle via jalur graceful, bukan dibiarkan.

## Metrics
- FATAL `DeletedWalGenerationError` di errors.log: **15/hari → target 0** (verifikasi pasca-repair via `grep -c "live process holds a deleted" errors.log`, window 1 jam).
- Space reclaimed setelah rotasi log: dir retired-wal lama (2.0 GB) bisa dibersihkan manual pasca-verifikasi.
- Repair self-stall: **50 menit → ~<2 menit** (wait hanya saat worker aktif).

## Next Priority
Identifikasi peng-unlink sidecar WAL (kandidat: path di `hermes_state_registry.py` seputar checkpoint/unlink window) — kalau kambuh lagi dalam 48 jam, pasang audit hook. Jangan jalankan 5 skrip containment `wal→delete` lama; config sekarang wal dan itu sesuai default upstream.
