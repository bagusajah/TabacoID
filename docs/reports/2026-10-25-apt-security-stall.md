---
task_id: daily-focus
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-25
status: published
human_review: autonomous
---

# Audit APT Security Host: 159 Update Menumpuk Karena Satu Baris Vendor Config

## Engineering Question

Host Pi up 33 hari. Apakah security patch apt-nya sehat — dan kalau tidak,
kenapa diam-diam (tidak ada error di log mana pun)?

## Method

Probing murah dari backlog OS3 (APT security audit): hit paket upgradable +
security, cek config periodic, trace log unattended-upgrades, dan baca source
`/usr/lib/apt/apt.systemd.daily` untuk membuktikan mekanisme no-op-nya.

## Findings

- **216 paket upgradable, 159 di antaranya security** (`apt-get -s
  dist-upgrade`). Termasuk: `openssh-sftp-server`, `libssl3`, `containerd.io`,
  `systemd`, `libc6`, `libcurl3-gnutls`, `ca-certificates`.
- Root cause: file vendor `/etc/apt/apt.conf.d/02-orangepi-periodic` (bawaan
  image Orange Pi) set `APT::Periodic::Enable "0"`. Script apt systemd membaca
  ini paling awal (baris 356-358: `if [ $AutoAptEnable -eq 0 ]; then exit`) —
  **seluruh framework apt-daily no-op**, termasuk unattended-upgrades.
- Bukti no-op live: `apt-daily-upgrade.service` jalan tadi pagi 06:10:42,
  Started dan Deactivated di detik yang sama, `Result=success`. Timer hijau,
  nol pekerjaan.
- `/var/log/apt/history.log` 0 byte, tanpa arsip `.gz` sebelumnya; direktori
  `/var/log/unattended-upgrades/` tidak pernah terbentuk. Apt tidak pernah
  install apa-apa via jalur otomatis.
- Fix yang disiapkan (sudah tervalidasi via `apt-config -c <file> dump` →
  `Enable "1"`), satu file 4 baris `/etc/apt/apt.conf.d/99-tabacoid-periodic`:

```
// Re-enable apt periodic framework — vendor file 02-orangepi-periodic ships
// Enable=0 which no-ops apt-daily AND apt-daily-upgrade entirely.
// Lexical order: 99- overrides 02-. Per-phase toggles live in 20auto-upgrades.
APT::Periodic::Enable "1";
```

## Decision

**Needs Human Review** — guard cron dengan benar memblokir penulisan `/etc`
via sudo (boundary keamanan, bukan hambatan). Satu perintah untuk user:

```
sudo install -m 0644 /tmp/99-tabacoid-periodic /etc/apt/apt.conf.d/99-tabacoid-periodic && sudo systemctl start apt-daily-upgrade.service
```

Catatan: start service langsung mengeksekusi ~159 upgrade security (bbrp
menit di Pi; ada kernel baru → reboot menyusul kalau mau; upgrade
containerd.io me-restart daemon, container jalan tetap aman). Kalau tidak
dijalankan manual, siklus jam 06:10 besok akan mengambil alih otomatis.
File `/tmp` hilang kalau reboot — konten lengkap ada di report dan body task
`t_f465ddc8` ini.

## Risk

- 159 upgrade sekaligus = changelog besar; systemd/libc ikut. Layak review
  `apt list --upgradable` dulu kalau mau hati-hati, atau jalankan malam hari.
- `unattended-upgrades` default cuma auto-install origin `-security`; 57
  update non-security sisanya tetap manual. Itu by design, tidak diubah.
- Kalau vendor image di-update ulang, `02-orangepi-periodic` bisa kembali —
  file `99-` kita tetap menang (lexical), aman.

## Lessons Learned

- **Timer enabled + exit success ≠ framework bekerja.** Satu baris config
  vendor membuat semuanya no-op selama bertahun-tahun tanpa satu pun error.
  Health check harus meng-assert efek (baris history.log, jumlah install),
  bukan status exit service.
- Probe generik (hit paket upgradable) yang tidak ada di daftar scan planner
  ternyata menemukan masalah paling besar hari ini — errors.log sumir,
  docker hijau, disk lega. Sinyal murah tapi keluar dari rutinitas.
- Guard sudo-/etc di cron mode berfungsi sebagai boundary approve-manusia
  yang benar: agent siapkan fix + bukti, manusia satu perintah.

## Next Priority

- `t_f465ddc8`: verifikasi pasca-fix — security count 159→0, history.log
  terisi, log unattended-upgrades terbentuk.
- `t_e60a9105` (≥ 3 Nov): verifikasi pasca-expiry cert apex tabaco.id.
