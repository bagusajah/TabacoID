---
task_id: t_47c2586d
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-27
status: published
human_review: autonomous
---

# Walguard: audit hook penghapus sidecar state.db + recycle holder (kambuh <3 jam)

## Engineering Question

Report pagi ini (t_79ed6e3b) menutup dengan trigger eksplisit: kalau FATAL
`DeletedWalGenerationError` kambuh dalam 48 jam, pasang audit hook untuk
identifikasi peng-unlink sidecar `state.db-wal`. Kambuhnya **lebih cepat dari
itu** — FATAL kembali 16:00:23, hanya ~2 jam setelah repair 15:32. Siapa
peng-unlink-nya, dan bisakah ia ditangkap basah pada kejadian berikutnya?

## Method

1. Forensik `/proc` + `lsof +L1`: identitas holder dan umurnya.
2. Rekonstruksi timeline: `journalctl -u hermes-gateway`, log
   `repair-wal.log`, timestamp 9 dir `state.db.retired-wal-*`.
3. Korelasi jadwal: cron list vs menit kejadian FATAL.
4. Pasang auditd + watch rules `walguard` di ketiga file state.db, verifikasi
   dengan event uji, dispatch recycle holder via unit systemd detached.

## Findings

1. **Profil pemicu berubah.** Holder sekarang = gateway PID 3118720 yang lahir
   15:32:49 — *setelah* semua retire/capture terakhir (14:07). Artinya unlink
   terjadi di window 15:32:49–16:00:23, pada gateway yang buka DB di generasi
   hidup. Ini BUKAN race retire∩restart seperti diagnosis kemarin; pemicu
   kedua yang berbeda masih anonim. Tidak ada dir `retired-wal-*` baru —
   unlink terjadi tanpa jalur capture.
2. **FATAL :00 itu korban, bukan pelaku.** Timestamp FATAL hari ini (09:00,
   14:00, 16:00) pas dengan boot sesi cron (Focus/Builder jalan tiap jam di
   weekend). Sesi baru mati di guard saat buka state.db karena holder deleted
   masih ada — victim boot, bukan aktor.
3. **Repair tooling sendiri punya window rapuh.** Log repair 15:32:50 membaca
   "holders after: 0" tepat 1 detik setelah gateway baru lahir (15:32:49) —
   post-check repair race dengan open DB gateway baru. Bukan peng-unlink, tapi
   menunjukkan seberapa tipis jendela verifikasi tooling kita.
4. **Audit hook hidup dan terbukti.** auditd (baru terpasang, sebelumnya tidak
   ada) + 3 rule watch `walguard` pada `state.db`, `state.db-wal`,
   `state.db-shm`. Verifikasi: event uji `touch -a state.db` tertangkap lengkap
   (syscall, exe, pid, key). Untuk unlink normal saat close oleh holder sendiri
   itu wajar; smoking gun = unlink dari exe/pid yang *beda* dari holder.

## Decision

**Adopt** (containment + forensik, sesuai Next Priority report pagi):
- Rule audit `walguard` live di runtime (auditd aktif).
- `~/.hermes/scripts/walguard-arm.sh` — re-arm 1 perintah, sekaligus dokumentasi
  cara baca trail (`ausearch -k walguard -i`).
- Recycle holder: unit `wal-recycle.service` (systemd-run detached) menunggu
  semua worker scope cron clear — sengaja termasuk sesi yang menulis report ini
  — lalu menjalankan `recycle-deleted-wal-holders.py` (planned-stop marker →
  SIGTERM → systemd revive → WAL baru di-mint).

## Risk

- **Persistence rules terblokir approval guard**: penulisan ke
  `/etc/audit/rules.d/` butuh approval manusia yang tidak ada di cron. Konsekuensi
  rules hilang saat reboot — minta user jalankan sekali:
  `sudo bash ~/.hermes/scripts/walguard-arm.sh` (plus salin rules-nya ke
  `/etc/audit/rules.d/walguard.rules`, isinya ada di skrip).
- auditd menambah overhead disk kecil; 3 file yang di-watch volume tulisnya
  tinggi (state.db) — rotasi jurnal audit default disentuh? Tidak: hanya watch
  rule, tidak mengubah retention.
- Jika unlinker kebetulan strike lagi sebelum recycle jalan, FATAL berikutnya
  (boot :00 jam 17) akan menambah korban — tapi sekarang trail auditnya lengkap.

## Lessons Learned

- Diagnosis kemarin benar tapi belum lengkap: race retire∩restart adalah SATU
  jalur; ada minimal satu jalur lain yang meng-unlink sidecar pada gateway
  generasi hidup. Tanpa syscall audit, jalur ini mustahil diidentifikasi
  post-hoc — forensik fd hanya bisa bicara setelah kejadian.
- Timestamp FATAL per jam bisa menyesatkan: korelasikan dulu dengan jadwal
  cron sebelum menyimpulkan "ada yang jalan per jam".

## Metrics

- FATAL `DeletedWalGenerationError` di errors.log: 16 hari ini (15 pagi + 1
 –2 jam lalu) → target 0 pasca-recycle; checkpoint verifikasi: boot cron 17:00.
- deleted-wal holder fds: 4 (1 PID) → 0 (pending `wal-recycle.service`,
  detached; log di `~/.hermes/logs/recycle-wal.log`).
- Coverage forensik: 0 → 3 watch rule audit, terverifikasi menangkap event.
- Bukti pra-recycle disimpan: `~/.hermes/logs/wal-evidence-20260927.txt`.

## Next Priority

1. Setelah kejadian unlink berikutnya (atau 48 jam tanpa kejadian): baca
   `ausearch -k walguard -i`, cocokkan pid/exe unlink vs holder. Pelaku internal
   hermes → issue upstream dengan trail; pelaku eksternal → periksa skrip
   maintenance kita sendiri.
2. User approve persistence rules (1 perintah di atas) supaya audit survive reboot.
3. Jika jalur kedua terbukti dari pipeline retire internal, pertimbangkan naikkan
   issue ke upstream hermes-agent (file: `hermes_state_dbfile.py`,
   `capture_retired_wal_generation`).
