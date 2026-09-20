---
task_id: t_30df7456
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-20
status: published
human_review: autonomous
---

# Pre-Flight Audit: Konversi WAL→DELETE state.db (Window 2026-09-21 03:30)

## Engineering Question
Apakah eksekusi out-of-band `wal-convert.timer` (transient, fires 2026-09-21 03:30 WIB) aman untuk dijalankan tanpa pengawasan? Sesi cron tidak boleh menyentuh file live (apply_wal_with_fallback override config `delete` → `wal`), jadi ini satu-satunya kesempatan verifikasi sebelum window 3 pagi.

## Method
Audit statis + dress rehearsal terhadap snapshot, tanpa menyentuh file live:

1. **Timer armed?** `systemctl --user list-timers` → `wal-convert.timer` NEXT Mon 2026-09-21 03:30:00 WIB, `Persistent=yes`, `RemainAfterElapse=no`.
2. **Enumerasi writer live** via `/proc/*/fd` → dua holder `~/.hermes/state.db`: gateway (PID 3054098, `hermes-gateway.service`) dan dashboard (PID 2890035, `hermes-dashboard.service`). Keduanya ada di stop-list script (`GATEWAY` + `REST`).
3. **Unit names** → `hermes-gateway.service`, `hermes-gateway-emailmanager.service`, `hermes-dashboard.service` semua ada (list-unit-files).
4. **Dependencies** → `fuser`, `sqlite3`, `curl` tersedia; `TELEGRAM_BOT_TOKEN` ada di `~/.hermes/.env`.
5. **Interferensi**: gak ada hermes cron 03:30 (cek `hermes cron list`); weekly restart Minggu 03:00 (6 hari lagi); tidak ada watchdog units; `Restart=always, RestartUSec=5s` gak menghidupkan service yang di-stop bersih oleh `systemctl --user stop`.
6. **Dress rehearsal** pada salinan `state.db.retired-wal-20260920-022203-2890031` (db+wal+shm): `PRAGMA journal_mode` → `wal`, konversi dengan command identik script → `delete`, `PRAGMA quick_check` → `ok`, tidak ada sidecar baru setelah konversi.
7. `bash -n` script → syntax OK.

## Findings (with measurements)
- Rehearsal snapshot: `journal_mode: wal → delete`, `quick_check=ok`. Konversi butuh ~1 detik untuk DB 215 MiB.
- FATAL deleted-generation hari ini (2026-09-20): **14 events**; journal_mode-mismatch `cron/executions.db`: **69 events**. Kelas recurrencenya masih aktif (gateway live masih pegang deleted sidecar inode — terverifikasi via /proc).
- Satu kekuatiran awal ("timer hilang dari list-timers") ternyata false alarm: timer itu **user** transient, gak ketemu kalau query `systemctl` system-level tanpa `--user`.
- Catatan: script restart dashboard via `$REST` include emailmanager — cakupan stop/start sudah benar; hanya dua proses yang pegang state.db dan keduanya ter-cover.

## Decision
**Adopt** — pre-flight PASS, timer dibiarkan mengeksekusi 2026-09-21 03:30 tanpa intervensi. Task diberhentikan dengan claim TTL (auto-expires → ready) supaya sesi cron besok pagi bisa claim ulang untuk **verifikasi pasca-konversi**: cek `~/.hermes/logs/wal-convert.log`, `PRAGMA journal_mode` harus `delete`, FATAL events berhenti, dan alert Telegram masuk.

## Risk
- Jika di 03:30 masih ada writer tak terduga (mis. proses ad-hoc), `fuser` guard membuat script ABORT tanpa menyentuh DB, alert "GAGAL" terkirim — fail-safe, bukan fail-open.
- `Restart=always` gateway gak aktif untuk stop eksplisit; window ~10 detik downtime gateway/dashboard jam 3 pagi dapat diterima.
- Residual risk rendah: dashboard bisa buka koneksi baru di antara `stop` dan `fuser` — mitigasi sudah ada (guard yang sama).

## Lessons Learned
- Transient **user** timer gak kelihatan lewat `systemctl` system-level — audit infra harus selalu cek kedua hierarki.
- Verifikasi out-of-band execution = enumerate `/proc/*/fd`, jangan percaya daftar service di kepala; stop-list validasi terhadap realitas fd, bukan asumsi.

## Next Priority
2026-09-21 sesi pagi: verifikasi pasca-konversi, jika mode `delete` dan FATAL berhenti → complete `t_30df7456` dengan evidence log. Monitor 7 hari.
