# Daily Report 2026-08-07

## Engineering Question
Apakah gateway Hermes berjalan dengan kode terbaru setelah fix `kanban_db.py`, dan berapa dampak crash dispatcher yang terjadi sebelumnya?

## Method
1. Cek status gateway (systemd) vs timestamp file yang di-fix (`kanban_db.py`)
2. Analisis error log untuk pattern crash dispatcher
3. Verifikasi schema mismatch antara kode lama dan DB

## Findings

**Crash Dispatcher (sudah fix di kode, tapi gateway belum restart):**
- Gateway process dimulai: `2026-08-03 20:15:54 WIB`
- File `kanban_db.py` diupdate: `2026-08-07 00:19:52 WIB` (fix `_safe_int_ts`)
- Gateway **belum di-restart** — masih menjalankan kode lama
- Crash dispatcher: **20 kali** antara `01:01` – `11:04` tanggal 6 Agustus
  - 01:00–02:00: 10 crash (rate ~1x/menit = setiap tick)
  - 03:00–11:00: 10 crash (sporadis)
  - Setelah 11:04: **0 crash** (kemungkinan tidak ada `running` task)

**Root cause:** Kode lama di `detect_stale_running()` memakai `int(row["active_started_at"])` langsung tanpa `_safe_int_ts()`. Query SQL menghasilkan alias `active_started_at` dari `COALESCE(r.started_at, t.started_at)` — ini bukan kolom asli tapi computed alias. Pada beberapa kondisi, alias ini mengembalikan format string yang gagal di-parse oleh `int()`.

**Impact:**
- `gateway_dispatcher_crashes: 20 events (10 jam downtime dispatcher)`
- `gateway_memory: 2.35 GiB` (up dari baseline, sesuai temuan tracemalloc sebelumnya)
- `gateway_uptime_stale: 3.2 hari tanpa restart` (fix kode belum teraplikasi)
- `stale_sql_in_cron: 8 errors` — cron cycle sebelumnya menjalankan SQL dengan kolom yang tidak ada (`active_started_at`, `model`, `completed_at`, `output`). Ini bukan gateway bug tapi AI-generated SQL yang salah dari siklus cron sebelumnya.

**Stale cron SQL errors (bukan bug kode, tapi hallucinated SQL):**
- `active_started_at`: 5 errors (kolom computed, bukan real column)
- `output`: 1 error (tabel `task_runs` tidak punya kolom `output`)
- `model`: 1 error (tabel `executions` tidak punya kolom `model`)
- `completed_at`: 1 error (tabel `task_runs` tidak punya kolom `completed_at`)

## Decision
**Needs Human Review** — gateway perlu restart untuk mengaplikasikan fix. Tidak bisa di-restart otomatis dari dalam gateway (self-termination blocked).

## Risk
Restart gateway akan memutus koneksi WhatsApp sementara (~10-30 detik downtime). Tidak ada risiko data loss — semua state di SQLite.

## Lessons Learned
1. Fix kode yang di-deploy via `git pull` atau file overwrite tidak otomatis apply ke running process. Perlu explicit restart.
2. Cron cycle yang menghasilkan SQL hallucination tidak berdampak permanent tapi membuang resource (1 cycle setiap 1 menit × N cycle gagal).
3. Gateway memory 2.35 GiB cukup tinggi — perlu monitoring setelah restart untuk lihat apakah memory stabilize atau terus naik.

## Next Priority
- Restart gateway untuk apply `kanban_db.py` fix
- Monitor gateway memory trend setelah restart (apakah turun kembali?)
- Pertimbangkan lock version di skill prompt agar AI tidak menghasilkan SQL dengan kolom yang tidak ada
