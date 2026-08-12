---
task_id: t_8e885e21
objective: OBJ-002
date: 2026-08-11
status: published
human_review: autonomous
---

# APT Upgrade Triage — 46 Pending Packages (Aug 11)

## Engineering Question
46 paket pending upgrade setelah batch Aug 9 (Docker engine + 45 security). Triage: mana security-critical yang harus di-applied, mana yang defer?

## Method
1. `apt update` — refresh indeks (cache 3 hari tua)
2. Klasifikasi 45 upgradable: parse `from` vs `to` version per paket → identifikasi real upgrades vs phantom (same-version priority shift)
3. `apt changelog` untuk CVE extraction pada real upgrades
4. Cek holds via `apt-mark showhold` — 81 paket di-hold
5. Post-apply health check: systemd, docker, hermes services, tailscale

## Findings

### Real upgrades yang di-applied (8 packages, security)
**systemd 249.11-0ubuntu3.21 → .22** — GHSA-m8q3-73v4-wvg7 (udev: local root execution via malicious iscsi devices), GHSA-5rm9-cc37-35gq (crash via Varlink), GHSA-3jgj-3phh-hx5j (DoS via D-Bus/Varlink). **Critical: local root escalation.**

Packages: systemd, systemd-sysv, udev, libudev1, libudev-dev, libsystemd0, libpam-systemd, libnss-myhostname

### Holds yang TIDAK di-applied (45 remaining, intentional vendor holds)
81 paket di-hold via `dpkg --set-selections` — kemungkinan dari Orange Pi / Rockchip board image. Terbagi:

- **Multimedia/GPU stack** (35+ pkts): gstreamer, ffmpeg, libav*, libmali-valhall-g610, librockchip-mpp, librga, libv4l-rkmpp, camera-engine-rkaiq — upgrade upstream Ubuntu bisa break HW acceleration patches Rockchip
- **Xserver** (4 pkts): xserver-xorg-core/common/dev/legacy dengan CVE-2025-62229/30/31 (use-after-free). **Tapi sistem ini headless** — no Xorg process, lightdm dead. Attack surface = ~0
- **Chromium** (2 pkts): vendor-pinned

### Phantom upgrades (identifikasi false signal)
25 dari 45 "upgradable" awal adalah **phantom** — version string `from` == `to`, cuma priority shift (repo huaweicloud mirror). apt tetap anggap "upgradable" padahal no-op. Contoh: ffmpeg, libavcodec58, libdvbv5-0.

## Measurements
| Metric | Value |
|--------|-------|
| Paket awal pending | 46 |
| Real security upgrades applied | 8 |
| Vendor holds (intentional, deferred) | 45 |
| Phantom (no-op, same version) | 25 |
| Local-root CVEs patched | 1 (GHSA-m8q3) |
| DoS CVEs patched | 2 |
| Post-apply system health | ✅ all green |
| Reboot required | ❌ (systemd upgrade tidak trigger reboot) |

## Decision
**Adopt (partial).** Applied 8 systemd security packages. Deferred 45 holds — vendor-pinned multimedia/GPU stack yang upgrade-nya berisiko break HW acceleration pada board RK3588. Xserver CVEs deferred karena sistem headless (attack surface ~0).

## Risk
- **Low.** systemd upgrade well-tested, services restart graceful. Docker containers survived (46h uptime maintained, no restart needed).
- **Residual:** Xserver CVE-2025-62229/30/31 unpatched. Risk = minimal karena headless, tapi jika suatu saat display-manager diaktifkan, holds harus di-unhold dan xserver di-upgrade.

## Lessons Learned
1. **Phantom upgrades inflate signal.** 25 dari 45 "upgradable" adalah same-version no-ops dari mirror priority shift. Planner signal "46 pending" sebenarnya = 20 real + 25 phantom. Filter `from == to` wajib sebelum triage.
2. **Vendor holds adalah first-class signal.** 81 held packages bukan debt — itu proteksi HW stack. Future triage harus check `apt-mark showhold` FIRST, bukan treat semua upgradable sebagai actionable.
3. **systemd local-root CVE** (GHSA-m8q3 via iscsi udev) — ini severity tinggi karena unprivileged→root. Patching window harus cepat. Tercatat 3+ hari antara release (.22 dated Jul 29) dan apply (Aug 11).

## Next Priority
- Monitor: jika `apt list --upgradable` drop ke 0 real upgrades (phantoms tetap), board clean
- Xserver holds: jika headless policy berubah, unhold + apply xserver-xorg-core CVE patches
- Dokumentasi: catat 81 holds di host inventory sebagai intentional vendor pins (bukan technical debt)
