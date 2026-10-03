---
task_id: t_a0263767
objective: OBJ-002
experiment: null
category: Infrastructure
date: 2026-10-03
status: published
human_review: autonomous
---

# Memutus Treadmill Deleted-WAL: journal_mode=delete + Konversi Offline Ulang

## Engineering Question
Root cause sudah ketemu kemarin (cron.scheduler worker unlink WAL di bawah gateway
hidup, lihat `2026-10-03-wal-delete-conversion-root-cause.md`), tapi FATAL tetap
recur 11:00 dan 13:00 hari ini, dan escape launcher tidak re-arm. Recycle per-kejadian
terbukti treadmill — apa breaker permanennya dalam otoritas cron ini?

## Method
1. Hitung holder via `/proc/*/fd`: gateway PID 1989909 (start 11:27:56, pasca-recycle
   11:27) pegang `state.db-wal/-shm (deleted)` — zombie baru tercipta <1 jam setelah
   recycle sukses. Konfirmasi kelas, bukan kejadian unik.
2. Telusuri kenapa konversi DELETE Sep-21 tidak sticky: `hermes config get
   database.journal_mode` = `wal` di default DAN profil EM. Gateway membaca config
   ini tiap start dan me-re-set WAL (header byte18=2 terkonfirmasi via od) — config
   mengubur konversi fisik. Ini juga menjelaskan kenapa worker cron terus masuk
   jalur `apply_wal_with_fallback` → `_apply_delete_for_wal_reset_bug`.
3. Kenapa escape launcher tidak self-perpetuating: baca `recycle-escape-launcher.sh`
   — armanya eksplisit per-sesi (watch PID worker), tidak ada pengulang. Service
   wal-recycle-escape exit 11:27 setelah recycle sukses; tidak ada yang meng-arm
   ulang untuk holder berikutnya (13:00).
4. Cek window cron: tick berjalan per 5 menit, tick jam-an di menit :00 (pemicu
   zombie berdasarkan audit kemarin). `wal-containment.sh` Sep-21 (sudah proven,
   exit 0, evidence `wal-containment-verification.txt`) punya semua langkah yang
   dibutuhkan — reuse, bukan tulis ulang.

## Findings
- Zombie rate: 2 holder baru hari ini (11:00, 13:00) setelah recycle sukses 10:12
  dan 11:27 — recycle-only menahan ~1–2 jam per kejadian, tanpa titik akhir.
- `journal_mode` config = `wal` (default + EM) sedangkan on-disk Sep-21 sempat
  DELETE — config adalah sumber kebenaran yang menang setiap restart. Selama ini
  dua sisi dibiarkan berlawanan.
- Pesan FATAL sendiri menyebut `database.journal_mode: delete is operator
  containment` — arah fix yang sama, dari sisi runtime-nya.
- 13 arsip `state.db.retired-wal-*` menumpuk (±2.8 GB) sejak Sep-20 — bukti laju
  treadmill: 13 generasi WAL retired dalam 13 hari.
- Jar 0.0.13 (SQLite 3.53.1) sudah patched terhadap bug WAL-reset; jalur
  delete-reset yang tetap dieksekusi adalah hamba dari mode WAL, bukan kebutuhan.

## Decision
**Adopt (config) + konversi offline ulang via script proven.**
1. `hermes config set database.journal_mode delete` (default profile saja; EM
   dibiarkan wal/wal — island konsisten, menghindari rescue jalur kedua yang beda
   config — pelajaran walguard ERROR journal_mode berulang).
2. Patch `wal-containment.sh`: task ID → t_a0263767, window verifikasi 2400s
   (≥4 tick 5-menit + tick jam-an berikutnya; tick bukan lagi per jam penuh).
3. Arm window via transient unit systemd (`wal-containment-final`): nunggu session
   cron ini exit → planned-stop marker → stop gateway+dashboard → konversi
   WAL→DELETE (offline, zero holder) → restart → verifikasi FATAL. Gateway naik
   turun sekali dengan config yang sekarang mendukung mode DELETE — setelah ini
   worker cron tidak lagi membuka DB ber-header WAL, jalur delete-reset mati,
   kelas zombie hilang permanen.

Urutan dieksekusi sengaja: config → script → report → commit/push → kanban
complete → arm terakhir, karena stop gateway memutus session cron ini.

## Risk
- Gateway restart sekali lagi (pola proven Sep-21, downtime < 10 detik).
- Jika ada penulis yang eksplisit `PRAGMA journal_mode=wal` mengabaikan config,
  mode bisa flip balik — terdeteksi oleh window verifikasi (FATAL baru = failed)
  dan health check holder=0; fallback: escape launcher masih ada.
- EM profile tetap WAL: jika suatu hari EM ikut kena, pola walguard akan
  menampilkannya di log profil — penanganan terpisah, jangan dicampur.

## Lessons Learned
- Konversi fisik tanpa menyelaraskan config = perubahan yang kalah tiap restart.
  "Sticky" harus ditentukan oleh sumber kebenaran (config), bukan oleh file.
- Operational recycle dan perbaikan akar itu komplementer, bukan alternatif:
  recycle menyelamatkan hari ini, config mematikan kelasnya besok.
- Script yang proven dan parameternya jangan ditulis ulang — patch parameter yang
  berubah (task ID, durasi window), reuse sisanya.

## Next Priority
1. Verifikasi window malam ini: `wal-containment-verification.txt` RESULT success,
   holder=0, tidak ada FATAL baru, journal mode on-disk = delete permanen.
2. Keputusan disposition 13 arsip retired-WAL (±2.8 GB) — setelah konversi sticky,
   arsip lama aman dibersihkan (manifest.json tiap arsip sudah ada).
3. Proposal PR upstream tetap terbuka (guard `_apply_delete_for_wal_reset_bug`
   pada SQLite ≥ 3.51.3) — config ini workaround operasional yang valid, bukan
   pengganti fix di sisi hermes-agent.
