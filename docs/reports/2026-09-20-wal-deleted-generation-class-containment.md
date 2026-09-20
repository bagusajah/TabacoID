---
task_id: t_30df7456
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-20
status: published
human_review: autonomous
---

# state.db WAL Deleted-Generation: dari Fix Insiden ke Containment Kelas Masalah

## Engineering Question

Pagi ini (2026-09-20) fix insiden WAL desync sudah dieksekusi (report
`2026-09-20-state-db-wal-desync-live-fix.md`), tapi FATAL muncul lagi jam 11:00.
Kenapa masalahnya recurring, dan bagaimana memutus kelas masalahnya — bukan
sekadar insiden ke-N?

## Method

Tracing `/proc/*/fd` untuk semua proses hermes, mapping timestamp snapshot
`retired-wal-*` terhadap riwayat restart gateway (`gateway.log`), membaca source
guard upstream (`hermes_state_errors.py`, `hermes_state_wal.py`,
`hermes_state_dbfile.py`) untuk menemukan remediasi yang diresepkan upstream
sendiri, lalu verifikasi kelayakan containment config di unit ini.

## Findings (with measurements)

- **6 FATAL events** ("a live process holds a deleted state.db-wal…") di
  `errors.log`, dalam 3 batch per-jam: 09:00:33/34, 10:00:45/47, 11:00:46/48 —
  yaitu 2 kegagalan per run cron `bf05fd0ca059` (09/10/11 WIB). Recurrence
  interval: < 1 jam setelah fix pagi ini.
- **Dua snapshot `retired-wal-*`** dibuat otomatis: `…-022203-2890031` (UTC
  02:22 = 09:22 WIB, WAL 12.392 bytes) dan `…-031614-3031144` (UTC 03:16 =
  10:16 WIB, WAL 0 bytes), masing-masing ±225 MB karena menyalin juga main db.
  Trigger keduanya `close` — handle lama close, ketahuan sidecar-nya sudah
  di-unlink, lalu auto-capture. Ukuran WAL 0–12 KB ⇒ **tidak ada pending
  frames yang hilang**.
- **Gateway baru langsung terinfeksi:** PID 3054098 (start 10:16 WIB) memegang
  fd `state.db-wal (deleted)` + `state.db-shm (deleted)` sejak detik pertama.
  Artinya race unlink-recreate terjadi di setiap restart gateway: weekly timer
  `hermes-weekly-restart.timer` (Sun 03:00 WIB) tadi pagi + dua restart manual.
- **Remediasi upstream eksplisit:** pesan FATAL sendiri menyatakan
  *"database.journal_mode: delete is operator containment, not a new default."*
  Source (`resolve_journal_mode()` di `hermes_state_wal.py`) membaca config
  `database.journal_mode` secara native (`wal` | `delete`, invalid → fail-safe
  ke `wal`). Tanpa WAL tidak ada sidecar, tanpa sidecar tidak ada deleted-
  generation guard yang bisa terpicu.
- **Konversi butuh window tanpa writer:** SQLite box ini 3.53.1 (di luar rentang
  WAL-reset bug 3.7.0–3.51.2), dan invariant `apply_wal_with_fallback`
  *"never downgrade to DELETE if the on-disk header reports WAL"* berlaku di
  semua cabang — config `delete` pada file yang sudah WAL **sengaja
  di-override** dengan ERROR log (`_log_configured_delete_overridden_once`),
  karena live-downgrade menghancurkan commit koneksi lain. Jadi penerapan
  containment = config + konversi header **out-of-band** (`PRAGMA
  journal_mode=DELETE`) di window semua service hermes mati, lalu start lagi.
- **Guard saldo:** `apply_wal_with_fallback` punya invariant "never downgrade to
  DELETE if the on-disk header reports WAL… a live downgrade destroys their
  uncheckpointed commits" — flip mode hanya terjadi dari koneksi pertama yang
  bisa mengambil lock eksklusif, yaitu setelah semua writer lama mati.

## Decision

**Adopt** — aktifkan containment yang diresepkan upstream:

1. Set `database.journal_mode: delete` di `config.yaml`.
2. Publish laporan ini + push dulu (sesi cron adalah child gateway — restart
   gateway membunuh sesi ini).
3. Restart graceful TERJADWAL via `systemd-run --user` (unit transient yang
   tidak mewarisi topologi cron): stop `hermes-gateway` + `hermes-dashboard`
   (plus gateway profile emailmanager) → konversi header
   `PRAGMA journal_mode=DELETE` (aman: semua writer sudah mati) → start
   ulang service → gateway membuka db dalam mode delete, tanpa sidecar.
4. Retensi: kedua snapshot `retired-wal-*` **tidak dihapus** — disimpan untuk
   inspeksi human. `database.journal_mode: delete` adalah containment operator
   yang bisa di-revert kapan saja (hapus 2 baris config → WAL kembali di
   open berikutnya), bukan one-way door.

Tradeoff yang diterima: WAL concurrency (multi-reader + 1 writer) hilang;
writer jadi serial dengan lock eksklusif. Pada Pi single-user dengan pola
cron-sequential ini, risiko SQLITE_BUSY low dan acceptable dibanding loop
FATAL yang sekarang memblok semua writer.

## Risk

- **SQLITE_BUSY** pada tulisan concurrent (dashboard read + gateway write).
  Mitigasi natural: beban cron sequential, bukan paralel. Jika muncul pola
  busy berulang di `errors.log`, containment di-revert.
- Fallback `apply_wal_with_fallback` mempertahankan WAL jika flip gagal
  diverifikasi — worst case: status quo (loop FATAL berlanjut), bukan korupsi.
- Snapshot retired 2×225 MB menumpuk di home — retensi policy menyusul sebagai
  task terpisah.

## Lessons Learned

- Fix insiden (ganti proses pemegang fd) tidak memutus kelas masalah ketika
  akar masalahnya race di layer storage yang terpicu setiap restart.
- Pesan error upstream yang diremedyasi eksplisit ("X is operator containment")
  adalah sinyal desain: ikuti resepnya, jangan improvisasi.
- Publish-before-restart tetap protokol wajib: sesi cron = child gateway.

## Next Priority

- Pantau `errors.log` 7 hari: 0 FATAL deleted-generation = containment sukses;
  pola SQLITE_BUSY baru = evaluasi revert.
- Task terpisah: retensi policy snapshot `retired-wal-*` (2×225 MB sekarang).

## Eksekusi (update 2026-09-20 13:10 WIB)

- Konfigurasi `database.journal_mode: delete` terkonfirmasi aktif di
  `config.yaml`; header file masih `wal` (PRAGMA) — konversi out-of-band pending.
- Uji konversi di snapshot `retired-wal-20260920-022203`: `PRAGMA
  journal_mode=DELETE` → header `delete`, sidecar hilang, `quick_check=ok`.
  Jalur konversi terbukti, bukan tebakan.
- Script `~/.hermes/scripts/wal-to-delete-convert.sh`: stop gateway + dashboard
  + emailmanager → abort jika `fuser` masih lihat writer → konversi → start
  ulang (single exit path, service selalu hidup lagi).
- Terjadwal via transient `wal-convert.timer` (Persistent=yes) **2026-09-21
  03:30 WIB** — window sepi, di luar sesi cron engineering. Sesi berikutnya
  verifikasi: `~/.hermes/logs/wal-convert.log` + `PRAGMA journal_mode`.
