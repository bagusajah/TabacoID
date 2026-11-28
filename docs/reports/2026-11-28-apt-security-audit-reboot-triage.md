---
task_id: t_cb9db4f6
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-28
status: published
human_review: autonomous
---

# APT Security Audit + Reboot-Required Triage (OS3+OS2)

## Engineering Question
73 paket upgradable + `/var/run/reboot-required` aktif di box uptime 67 hari —
apakah ini backlog security yang bocor, atau ada mekanisme lain? Dan apa action
yang benar sebelum reboot?

## Method
Audit read-only, no mutation: klasifikasi `apt list --upgradable` (security flag,
hold status via `apt-mark showhold`), timeline unattended-upgrades dari
`/var/log/apt/history.log`, flag reboot (`reboot-required.pkgs`), sim lib lama
(`lsof -d DEL`), error kernel 7 hari (`journalctl -k -p err`), thermal snapshot.

## Findings (with measurements)
- **73 paket upgradable** terdekomposisi: **28 bisa naik via plain `apt upgrade`**
  (docker-ce 29.10.1, nodejs 22.23.5, tailscale 1.104.7, 22 paket php8.3 sury) —
  **45 sisanya di `apt-mark hold`**.
- **81 paket di hold** — bukan security gap, tapi proteksi disengaja untuk stack
  media/hardware-accel Rockchip (ffmpeg, gstreamer-*, libav*, xserver*, librockchip-mpp,
  librga2, wiringpi). Yang tampak "security pending" di output `apt list` semuanya
  anggota hold-list ini → risiko keamanan **semu (false exposure)**.
- **unattended-upgrades sehat dan jalan setiap pagi** (APT::Periodic::Unattended-Upgrade=1,
  service aktif, apt-daily-upgrade.timer 06:11 WIB tadi pagi) — history 27–28 Nov
  penuh batch kecil (binutils, libtiff, libasound2, python3-jwt). Jadi security patch
  TIDAK bocor.
- **Reboot flag**: `reboot-required.pkgs` = libc6, libssl3, network-manager — semua
  sudah ter-upgrade sebelum flag dibuat (network-manager 1.36.6-0ubuntu2.6 naik
  27 Nov 06:35). Flag berumur >1 hari (mtime 27 Nov 06:35), berarti **reboot
  memang belum dilakukan sejak patch libc/libssl**.
- **32 proses masih pegang lib lama** (deleted-file lib, `lsof -d DEL`): python3 (67 fd —
  crawl4ai-mcp, death supervisor, browser_harness), pulseaudio, dbus-daemon, gnome-keyring,
  at-spi. Ini service yang diperbarui oleh reboot.
- Kernel log 7 hari bersih: 0 error, 0 thermal throttle (max 57.3°C).

## Decision
**Needs Human Review** — untuk 2 keputusan:
1. **Reboot rekomendasi, bukan urgent** (sec bisnis: 0-2). libc/libssl patch sudah
   terpasang 27 Nov; 32 proses (termasuk 3 python daemon Hermes-adjacent) pegang lib
   lama. Mesin stabil (kernel log bersih, 57°C, load rendah). Pilih jendela maintenance,
   cek dulu `ssh vps-internal` reachable; container restart=unless-stopped jadi Docker
   services auto-start pasca reboot. **Reboot tidak eksekusi otonom** (67 hari uptime
   + gateway/WhatsApp di host = terlalu berisiko tanpa user standby).
   Flag reboot ada sejak 27 Nov, bukan kondisi baru.
2. **Hold-list 81 paket: keep as-is** — proteksi HW-accel RK3588 yang benar. Perlu
   keputusan kecil: hapus hold `xserver-common/xserver-xorg-core` (ada fix `-security`
   22.04.16 yang diblok hold)? Sebagai gantinya: `apt-get install <pkg>` per paket
   bypass hold — tapi tetap butuh approval karena menyentuh X/graphics stack.

## Risk
- Reboot saat user tidak standby → gateway WhatsApp/Telegram + webreader + vaultwarden
  down sampai container naik lagi (restart=unless-stopped memitigasi, tapi timing
  tidak terkontrol).
- Unhold xserver tanpa validasi → bisa tarik dependensi X stack baru yang belum
  dites di RK3588 (alasan hold awal).
- Tidak ada: semua paket security-flags yang terlihat pending ternyata tertahan
  oleh hold disengaja, bukan patch hilang.

## Lessons Learned
- "N paket upgradable" tanpa dekomposisi hold/security itu angka kosong: 73
  ternyata 28 upgradeable + 45 held-by-design. `apt-mark showhold` wajib sebelum
  panik.
- `reboot-required` di Ubuntu tidak expiry — dia flag permintaan, bukan alarm aktif;
  usia flag (mtime) penting untuk prioritas.
- unattended-upgrades cukup untuk security patch harian; hold-list adalah lapisan
  kedua yang sengaja menahan stack media — dua mekanisme beda yang sering dicampur.

## Next Priority
- User: setujui jendela reboot (atau tunda), dan putuskan unhold xserver* atau
  per-paket `apt-get install`.
- Task follow-up dibuat: `Reboot window (libc/libssl)` — approval-gated, tidak
  dieksekusi tanpa user.
