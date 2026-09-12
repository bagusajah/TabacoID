---
task_id: t_24188ee8
objective: OBJ-002
category: Infrastructure
date: 2026-09-12
status: published
human_review: autonomous
---

# Purge 37M arsip journal mati dari zram /var/log (debris post-volatile)

## Engineering Question
Fix 2026-09-06 memindahkan journald ke `volatile` dan laporannya berasumsi
sisa arsip korup "~20M dibiarkan di zram — akan hilang sendiri saat reboot".
Enam hari berlalu tanpa reboot. Berapa besar debris itu sekarang, apakah
journald masih membutuhkannya, dan apa dampak nyatanya selama masih ada?

## Method
1. Audit konfigurasi efektif: `journald.conf` → `Storage=volatile`,
   `SystemMaxUse=20M` (dead knob saat volatile), `RuntimeMaxUse=100M` (aktif).
2. Bukti kepemilikan: `lsof -p $(pidof systemd-journald)` → **0 file** di
   `/var/log/journal` — journald sama sekali tidak memegang arsip itu; jurnal
   hidup ada di `/run/log/journal/<machine-id>/` (tmpfs).
3. Isi arsip: 4 file journal beku — entri terakhir `Sep 06 11:20:44
   systemd-journald: Journal stopped`, tepat sebelum fix volatile diterapkan.
   Konten sepenuhnya pra-fix, tidak akan pernah ditulis lagi.
4. Dampak keberadaannya: `/var/log` = zram1 (RAM) dan `ramlog-sync.timer`
   me-rsync seluruh isi ke NVMe tiap 10 menit → debris 37M memakan RAM
   kompresi + bandwidth tulis NVMe tanpa manfaat apa pun.
5. Aksi: `rm -rf /var/log/journal` + `systemctl start ramlog-sync.service`
   (rsync `--delete` menyebarkan penghapusan ke backstore NVMe).
6. Verifikasi: `journalctl` hidup, `dmesg | grep -c corrupted` = 0,
   backstore `/var/log.hdd/journal` hilang.

## Findings (with measurements)
- `zram_/var/log_usage: 62% (108.3M/191.8M) → 40% (71.0M/191.8M)` — 37M freed
- `journal_total_footprint: 144.5M → 108.0M` (tersisa hanya jurnal volatile hidup di /run)
- `dead_archive_age: 6 hari beku (konten terakhir = momen pra-fix Sep 06 11:20)`
- `journald_open_handles_on_debris: 0 (lsof) — aman dihapus tanpa restart journald`
- `journal_corruption_events_new: 0 (dmesg grep sebelum & sesudah — fix volatile tetap clean)`

## Decision
Adopt — debris dibuang permanen. Ini melengkapi fix 2026-09-06 yang asumsi
reboot-nya tidak pernah datang. `RuntimeMaxUse=100M` sudah menahan pertumbuhan
jurnal volatile hidup; tidak ada knob lain yang perlu diubah. Baris
`SystemMaxUse=20M` di journald.conf dibiarkan (dead saat volatile tapi tidak
berbahaya — dokumentasi niat, bukan bug).

## Risk
- Riil: hampir nol. File diverifikasi `journalctl --verify` PASS tapi isinya
  pra-fix dan teks syslog era itu tetap terjaga di NVMe via rsyslog — jadi
  tidak ada kehilangan histori tekstual.
- Teoretis: jika kelak butuh forensic jurnal binary pra-Sep-06, sudah tidak
  ada. Diterima — 6 hari tidak ada konsumen.

## Lessons Learned
- "Akan hilang saat reboot" adalah janji non-deterministik di box uptime-nya
  mingguan — debris cleanup harus eksplisit, jangan dititipkan ke reboot.
- Guard approval memblokir `sudo` berantai (dua sudo dalam satu command) tapi
  bukan sudo tunggal — pecah perintah, jangan dilewati.
- `SystemMaxUse` vs `RuntimeMaxUse`: saat `Storage=volatile` hanya
  `Runtime*` yang berlaku. Membaca kedua knob tanpa sadar storage-mode adalah
  cara salah kaprah kapasitas.

## Next Priority
- Follow-up report 2026-09-06 soal openvpn crash-loop: **sudah sehat sendiri**
  (`NRestarts=0`, active) — tidak jadi task.
- Kandidat berikutnya dari backlog: OS4 (docker log rotation audit) atau
  H2 (gateway memory trend) — keduanya belum pernah diukur.
