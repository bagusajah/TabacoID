---
task_id: t_9f40f776
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-21
status: published
human_review: autonomous
---

# APT Security Audit — 38 Patch Tertahan Hold Vendor Rockchip

## Engineering Question
72 paket upgradable terdeteksi di Orange Pi (backlog OS3, belum pernah diaudit). Berapa yang security, kenapa belum ter-patch, dan apa eksposur riilnya?

## Method
Analisis `apt list --upgradable`, `apt-get -s dist-upgrade`, origin `jammy-security`, interseksi dengan `apt-mark showhold` (80 paket held), pemetaan binary/lib paket-held ke proses hidup via `/proc/*/exe` + `dpkg -S`, verifikasi transcoder Jellyfin/Plex, dan cek `/var/run/reboot-required`.

## Findings (with measurements)
- **38 dari 72 paket upgradable berorigin `jammy-security`. 38/38 (100%) tertahan oleh `apt-mark hold` vendor Rockchip** — seluruh stack media (ffmpeg, libav*, GStreamer, xserver-xorg, chromium-browser 110 rkmpp, mpv, v4l-utils). Tidak ada satu pun security-pending yang di luar hold.
- **Unattended-upgrades AKTIF dan sehat** (`20auto-upgrades` = 1/1; patch ruby 3.0.2-7ubuntu2.14 sukses hari ini 07:02) — bukan masalah automasi, murni hold.
- **Non-security pending: 34** (Docker CE 29.9→29.10, containerd, buildx, libreoffice, python3.12 dll) — sudah dijalankan `apt-get install docker-ce` manual pagi ini (09:02), sisanya feature-upgrade.
- **Eksposur decode media tidak tepercaya = RENDAH:** Jellyfin transcode via `jellyfin-ffmpeg8 8.1.3` (bundel sendiri, current, BUKAN ffmpeg distro yang di-hold); Plex via transcoder bundel; tidak ada proses hidup yang memuat binary/lib dari paket held (cek `/proc/*/exe` → 0 overlap); `pgrep mpv/chromium/Xorg` → 0.
- **Hold ini disengaja oleh vendor** (image Rockchip valsunt/lobe-debian menahan ABI mali-g610, librga, rockchip-mpp, gstreamer1.0-rockchip). Un-hold 38 paket berisiko merusak hardware decode RK3580/RK3588 dan X stack.
- **Reboot-pending ADA:** `/var/run/reboot-required` memuat libc6, libssl3, network-manager — patch hari ini (07:02) mengangkat glibc/openssl. Uptime 60 hari, reboot butuh jendela maintenance + approval manusia.

## Decision
**Needs Human Review** — dua pertanyaan untuk user:
1. **Reboot**: perlu jendela maintenance untuk flush libc6/libssl3 (patch yang sudah terpasang, belum aktif). Sayangnya uptime 60h menandakan host stabil; reboot satu-satunya cara mengaktifkan patch itu.
2. **Hold policy**: pilihan — (a) biarkan hold, catat sebagai known-accepted risk dengan eksposur rendah terbukti; (b) un-hold selektif hanya xserver + chromium bila tidak dipakai (belum terbukti perlu). Jangan un-hold seluruh stack media.

## Risk
- Un-hold massal → bisa pecahkan gstreamer1.0-rockchip/mali ABI → hardware decode Jellyfin mati (regresi fungsi media center).
- Reboot tanpa jendela → gangguan gateway Telegram, cron, dan kontainer produksi (webreader, cicd-console).
- Biarkan semua seperti sekarang → CVE pada ffmpeg/xserver distro tetap terbuka, tapi permukaannya nyaris kosong karena tidak ada proses yang memuatnya.

## Lessons Learned
- "72 upgradable" itu sinyal palsu untuk urgency: 38-nya security tapi 100% di belakang hold vendor, sisanya feature updates.
- Transcoder media-center bundel sendiri membuat hold ffmpeg distro praktis tanpa eksposur decode — selalu petakan binary ke proses hidup sebelum menilai severity.
- Loop `apt-cache policy | grep -c security` salah pattern (`a=jammy-security` tidak ada di situ); marker origin hanya muncul di `apt list --upgradable`.

## Next Priority
1. User memilih: jadwalkan reboot atau tolak dengan alasan (patch aktif butuh reboot).
2. Keputusan hold policy (accept / un-hold selektif).
3. Kalau ditolak: catat reboot-pending libc6/openssl di dashboard status agar tidak lupa.
