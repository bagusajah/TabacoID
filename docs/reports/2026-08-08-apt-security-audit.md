---
task_id: t_a1c9fcee
objective: OBJ-002
date: 2026-08-08
status: draft
---

# APT Security Audit: 115 Pending Upgrades Classified & Security Patches Applied

## Engineering Question
115 package upgrades pending di host Orange Pi RK3588. Mana yang security-critical dan harus segera di-apply? Mana yang berisiko break system (terutama Docker containerd major bump)?

## Method
1. Scan semua upgradable packages, filter yang dari `jammy-security` repo
2. Klasifikasi: Ubuntu security vs Docker repo vs Rockchip overlay
3. Cek changelog untuk packages kritis (openssl, glibc, tar, wget, gawk, libarchive) untuk identifikasi CVE
4. Hold Docker repo packages (containerd.io 2.2→2.3 major bump = risk)
5. Apply security upgrades via `apt-get upgrade` dengan `--force-confold`
6. Verify post-upgrade: docker containers, hermes services, memory, disk

## Findings (with measurements)

**Pre-upgrade:** 115 upgradable packages, 82 dari `jammy-security` repo, history.log kosong (0 bytes — no recent upgrades ever applied).

**Classification:**
| Category | Count | Action |
|----------|-------|--------|
| Ubuntu security (CVE-backed) | 64 | **Upgraded** |
| Docker repo (containerd.io major bump) | 6 | **Held** — deferred |
| Rockchip media/gstreamer/codec (HW accel) | 45 | **Pre-held** — not touched |

**Key CVEs patched (64 packages upgraded):**
- `openssl` 3.0.2-0ubuntu1.25 → .26 — **CVE: HollowByte DoS** (LP #2161371)
- `libc6` 2.35-0ubuntu3.13 → .14 — **CVE-2026-4046**: assertion failure via IBM1390/IBM1399 charsets
- `tar` → 1.34...22.04.6 — **CVE-2026-5704**: security regression with nonzero directory sizes
- `wget` → 1.21.2-2ubuntu1.4 — **CVE-2026-15146**: SSRF forgery in FTP (PASV/LPSV validation)
- `gawk` → 1:5.1.0-1ubuntu0.2 — **CVE-2026-40467**: use-after-free in io.c
- `libarchive13` → 3.6.0-1ubuntu1.8 — **CVE-2026-14164**: double-free in init_unpack
- `libgssapi-krb5-2` 1.19.2...0.7 → .8 — Kerberos security
- `libssl3`, `libkrb5-3`, `libpam0g`, `libpam-modules`, `rsyslog`, `samba`, `nodejs`, `linux-libc-dev`, `tailscale` — additional security + routine

**Post-upgrade verification:**
- `packages_upgraded: 64 (115 → 51 remaining, all intentionally held)`
- `docker_containers_healthy: 2/2 (webreader-api, webreader-nginx both Up 17h)`
- `hermes_services: dashboard=active, gateway=active`
- `memory_used: 2.3Gi/7.7Gi (unchanged from baseline)`
- `disk_usage: 15% (34G/234G, unchanged)`
- `service_breakage: 0`

**Deferred packages (with rationale):**
- Docker: `containerd.io` 2.2.6→2.3.3 (major version bump, risk to running containers), `docker-ce` 29.6.2→29.7.2, `docker-compose-plugin` 5.3.1→5.4.0 — held, needs dedicated maintenance window
- Rockchip media stack: `ffmpeg`, `gstreamer1.0-*`, `libavcodec58`, `libmali-valhall-g610`, `librockchip-mpp1`, etc. — pre-held by vendor overlay; upgrading breaks GPU/VPU hardware acceleration

## Decision
**Adopt** — Security-critical patches berhasil di-apply (64 packages, 6 named CVEs patched). Docker upgrade deferred to dedicated maintenance window.

## Risk
- **Low risk realized:** glibc upgrade berjalan clean (no service restart needed, libc-bin trigger handled automatically)
- **Docker deferred risk:** containerd.io masih di 2.2.6 — CVE status perlu di-check terpisah saat maintenance window
- **Rockchip holds:** Media codec CVEs (ffmpeg/gstreamer) tidak di-patch karena vendor overlay lock. Risiko rendah — packages ini tidak exposed ke internet

## Lessons Learned
- history.log kosong = sistem ini belum pernah di-upgrade sejak install. Ini red flag untuk production hygiene
- Orange Pi RK3588 punya vendor overlay yang hold ~45 packages untuk HW acceleration — ini bukan oversight, ini by design
- `apt-get upgrade` (bukan `dist-upgrade`) cukup untuk security patches tanpa install packages baru

## Next Priority
- Schedule Docker maintenance window: upgrade containerd.io 2.2→2.3 + docker-ce, test webreader containers survive restart
- Monitor: re-check `apt list --upgradable` dalam 1 minggu untuk security patches baru
- Consider: unattended-upgrades untuk security-only auto-apply (mengurangi backlog)
