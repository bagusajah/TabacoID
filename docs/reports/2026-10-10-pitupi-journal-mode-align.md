---
task_id: t_4315431a
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-10-10
status: published
human_review: autonomous
---

# Selaraskan journal_mode Config Profil pitupi — Matikan Warning journal_mode Berulang

## Engineering Question
Kenapa errors.log masih berisi warning `on-disk journal_mode was delete and has been switched to WAL` meskipun main config sudah `journal_mode: wal` sejak Sep-2026?

## Method
1. Grep errors.log untuk pola `journal_mode was delete` — hitung frekuensi + kapan muncul.
2. Bandingkan section `database:` di ketiga config: main, profile emailmanager, profile pitupi.
3. Scan semua `~/.hermes/**/*.db` dengan `PRAGMA journal_mode` untuk lihat mode on-disk aktual.

## Findings
- Warning: 4 kejadian, semua pada 2026-10-10 (kanban.db 09:02, deliveries.db 09:02, notepad.db 10:00) — fire sekali per proses per DB, jadi ini menandakan proses-proses yang buka DB pagi itu berjalan tanpa config wal.
- Root cause: `~/.hermes/profiles/pitupi/config.yaml` TIDAK punya section `database:` sama sekali. Main + emailmanager sudah benar. Proses pitupi yang buka DB shared → on-disk mode `delete` → di-switch ke `wal` → warning.
- Fix: tambah `database: {journal_mode: wal}` ke config pitupi. Verifikasi parse YAML ketiga config: semua `{'journal_mode': 'wal'}`.
- DB yang memicu warning hari ini (kanban.db, deliveries.db, notepad.db) sekarang persisten `wal` — buka berikutnya tidak akan warning lagi.
- 8 DB lain masih on-disk `delete` (config.db, cron/jobs.db, cron.db, projects.db, verification_evidence.db, cron.db, sessions.db, emailmanager/projects.db). Sengaja TIDAK dikonversi: pelajaran Sep-2026 adalah warning = selaraskan config, bukan konversi DB (risiko WAL-reset bug; beberapa DB mungkin memang jarang dibuka proses ber-config wal).

## Decision
Adopt — config ketiga profil kini selaras di `journal_mode: wal`.

metric: profiles with database.journal_mode configured: 2/3 → 3/3
metric: journal_mode warnings in errors.log: 4 (2026-10-10, before fix) → expected 0 going forward

## Risk
Rendah. Perubahan 1 file config YAML (5 baris), sudah tervalidasi parse. Proses pitupi berikutnya pick up config saat start, tidak perlu restart manual.

## Lessons Learned
Warning "fire once per process per database" bikin frekuensinya terlihat rendah di errors.log padahal tiap proses baru menALAR ulang masalah yang sama. Config drift antar profil adalah sumber error kelas sendiri — saat nambah profil Hermes baru, selalu copy section `database:`.

## Next Priority
Monitor errors.log 1 minggu; kalau warning masih muncul untuk profil yang sudah selaras, berarti ada proses lain (bukan 3 profil) yang buka DB dengan config default — lacak dari timestamp-nya.
