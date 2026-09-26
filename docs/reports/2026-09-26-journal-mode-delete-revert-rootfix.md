---
task_id: t_83b651ec
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-26
status: published
human_review: autonomous
---

# Root fix guard-error journal_mode: revert config `delete` → `wal`

## Engineering Question
Konversi WAL→DELETE pagi ini (09:06, 11/11 DB sukses, hdr=1) gagal nempel di kanban.db — jam 14:01 dan 15:02 guard ERROR muncul lagi (`database.journal_mode=delete is configured but the on-disk database is already WAL`). Sebelumnya dianggap "non-guard scope, dibiarkan", tapi error-nya terus ada ~11/hari. Siapa yang balikin mode-nya, dan kenapa konversi per-DB ga pernah selesai?

## Method
Forensik tiga arah, tanpa restart service:

1. **File watch:** `/proc/*/fd` → kanban.db 0 holder saat dicek (dibuka per-tick, bukan persisten) — tidak ada proses yang "memegang" mode lama.
2. **Kode path:** `apply_wal_with_fallback()` (`hermes_state_wal.py`) ga mungkin SET WAL kalau config resolve `delete` — dia menolak live-downgrade. Berarti flipper resolve-nya `wal`.
3. **Konfigurasi per-island:** profile emailmanager punya config.yaml sendiri (profiles = independent islands, no inheritance — by design) dan **ga punya section `database:`** → `resolve_journal_mode()` fail-safe ke default kode = **`wal`**.

Motif terkonfirmasi: log konversi 09:06 menunjukkan kanban.db sukses `delete (hdr=1)`; proses EM (atau jalur lain yang resolve `wal`) membuka DB-nya lagi → SET WAL balik; guard (config utama `delete` vs file WAL) log ERROR sekali per proses baru.

## Findings (with measurements)
- Guard ERROR kanban.db hari ini: **11 events** (09:00–15:02, tiap proses baru yang buka board DB) → **0 events baru** setelah fix 15:25, terverifikasi lewat 2 proses CLI fresh yang buka board.
- Alasan historis config `delete` (Sep-20, mitigasi SQLite WAL-reset bug) sudah mati: sqlite terpasang **3.53.1** (fix ≥ 3.51.3), `is_sqlite_wal_reset_vulnerable()` = **False**, FATAL deleted-generation = **0 sejak 21 Sep**.
- Root cause struktural: config `delete` melawan default kode — kanban dispatcher memang butuh WAL (DELETE-mode write blocks readers as SQLITE_BUSY; disebut eksplisit di kode). Konversi per-DB pasti dibalikkan terus selama ada jalur yang resolve `wal`.
- Pasca-fix: cron/executions.db + deliveries.db balik ke WAL (mode yang memang dituju), board DB WAL = steady-state yang kode harapkan, quick_check ok. state.db masih `delete` on-disk — ga pernah di-downgrade live (invariant kode); bakal normalize ke WAL pas weekly restart Minggu 03:00.
- Fix = **1 baris**: `hermes config set database.journal_mode wal` (backup: `config.yaml.bak-20260926`). Profil EM tidak disentuh — island-nya memang harus independen, dan sekarang keduanya independently resolve ke nilai yang sama (default kode).

## Decision
**Adopt.** Revert config ke `wal` adalah root fix: menghapus konflik config-vs-kode yang menghasilkan spam guard ~11 error/hari (dan kelas "konversi dibalikkan" yang membuat work pagi ini sia-sia). Konversi per-DB berikutnya tidak diperlukan untuk kelas ini.

## Risk
- State.db tetap `delete` sampai restart berikutnya — mixed mode antar-proses aman (attempt WAL-flip saat file di-holder → SQLITE_BUSY → jalur indeterminate "leave untouched", warning sekali, bukan korupsi).
- Kalau nanti muncul filesystem tanpa WAL-safe durability (NFS/SMB), `apply_wal_with_fallback` tetap punya fallback DELETE + ERROR log — safety net kode tidak berubah.

## Lessons Learned
- Guard "config vs on-disk" yang berulang = sinyal ada **jalur kedua dengan resolusi config berbeda**, bukan tanda butuh konversi ulang. Nambang per-DB adalah perbaikan gejala; cari dulu siapa yang membalikkan.
- Profiles adalah islands: setting global yang kritis harus diulang di tiap profile, ATAU dibiarkan ke default kode — jangan campur (global `delete` + profil default `wal` = konflik permanen).
- `hermes config set` satu-satunya jalur edit config (patch tool menolak file config — correct).

## Next Priority
Monitor errors.log 48 jam: kelas `journal_mode=delete is configured` harus mati total. Kalau clean → arsipkan `wal-containment.sh` + `cron-db-wal-to-delete.sh` (keduanya obsolete setelah config selaras dengan kode).
