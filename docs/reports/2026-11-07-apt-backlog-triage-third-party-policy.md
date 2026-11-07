---
task_id: t_c14a89f5
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-07
status: published
human_review: autonomous
---

# Triage sisa update backlog: 6 third-party + 45 kept-back — policy + live-restore

## Engineering Question
Pasca-fix pipeline unattended-upgrades (t_571bb51d, 1-Nov), `apt list --upgradable`
masih menunjukkan 51 paket. Apakah itu drift pipeline, dan policy apa yang benar
untuk sisanya yang tidak ter-cover origin UU (Ubuntu-only)?

## Method
1. Klasifikasi semua 51 entri: sumber repo, status hold (`apt-mark showhold`),
   simulasi `apt-get -s upgrade` dan `dist-upgrade`.
2. Cek log UU pagi ini (`/var/log/unattended-upgrades/`) untuk memisahkan
   "sudah dikerjakan" vs "di luar cakupan".
3. Ukur exposure window paket third-party dari dpkg info timestamps + apt history.
4. Upgrade yang aman langsung (tailscale, jellyfin-ffmpeg), defer yang disruptif
   (docker-ce = restart daemon → bounce 7 container), fix root-cause disruptivitas.

## Findings (with measurements)
- **UU pipeline SEHAT, bukan drift.** Run 7-Nov 06:13–06:33 (20 min, exit 0):
  13 paket security Ubuntu terinstall (apt, ca-certificates, libglib2.0, libsnmp,
  python3-pil), log: "All upgrades installed". Sisa 51 = di luar cakapannya.
- **Klasifikasi 51 → 100% terjelaskan:**
  - 38 berlabel `jammy-security` = gstreamer/ffmpeg/xorg/v4l — **semuanya
    bagian dari 78 vendor holds deliberate** (RK3588 media stack, blacklist UU).
    Bukan actionable.
  - 45 "kept back" (bahkan oleh dist-upgrade sim) = subset persis dari holds yang
    sama — apt menolak upgrade paket on-hold. Konsisten, bukan bug.
  - **6 third-party actionable** (patch bump, di luar origin UU): docker-ce
    29.9.2→29.9.3, docker-compose-plugin 5.6.1→5.7.0, tailscale 1.104.4→1.104.5,
    jellyfin-ffmpeg8 8.1.3-1→8.1.3-2 (+2 paket docker pendamping).
- **Exposure window: 6 hari** (semua terakhir di-install/upgrade 1-Nov 11:21,
  ditemukan 7-Nov 14:00). Patch-level semua, bukan major.
- **Backlog: 51 → 49** setelah upgrade tailscale + jellyfin-ffmpeg (keduanya
  post-check hijau: `tailscale ping` ke VPS 66 ms, jellyfin.service active,
  ffmpeg 8.1.3-Jellyfin).
- **Docker tanpa live-restore** (`Live Restore Enabled: false`) → upgrade daemon
  memaksa restart semua 7 container (vaultwarden, webreader×2, cicd-console×2,
  crawl4ai, buildkit). Itulah kenapa didefer, dan itu yang difix.
- **Root-cause fix diterapkan:** `live-restore: true` ditambahkan ke
  `/etc/docker/daemon.json` (backup tersedia; inert sampai restart daemon
  berikutnya — live daemon masih report `false` karena belum restart, by design).

## Decision
**Adopt** — policy: (1) Ubuntu security = UU otomatis (sudah jalan, terbukti);
(2) third-party patch bump = manual cadence mingguan saat Daily Focus, hanya yang
non-disruptif langsung; (3) docker-ce defer sampai live-restore aktif (restart
daemon sekali di maintenance window, setelah itu upgrade docker non-disruptif);
(4) holds vendor jangan dianggap "security backlog" — mereka adalah pins.

## Risk
- live-restore baru efektif setelah restart docker berikutnya; sampai saat itu
  upgrade docker tetap bounce container. Window 6 hari untuk patch bump third-party
  adalah risiko rendah (bukan CVE assess per-paket, semua patch-level).
- Upgrade manual berbasis memory cron bisa bolong — mitigasi: metric `upgradable`
  masuk laporan ops periodik.

## Lessons Learned
- Angka "38 security pending" dari `apt list` misleading saat ada vendor holds:
  label security ≠ actionable security. Selalu silangcek `apt-mark showhold`.
- `dist-upgrade kept back` yang isinya persis daftar holds = sinyal sehat, bukan
  masalah yang perlu "dipaksa" dengan `--with-new-pkgs`.

## Lessons Learned → Next Priority
- Restart docker daemon (aktifkan live-restore, verifikasi `Live Restore Enabled:
  true` + container tidak bounce) di maintenance window, lalu upgrade 4 paket docker.
- Watchdog mingguan: `apt list --upgradable | grep -vc security` sebagai metrik
  third-party drift.
