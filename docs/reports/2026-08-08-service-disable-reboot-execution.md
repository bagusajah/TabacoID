---
task_id: t_34D42728
objective: OBJ-002
date: 2026-08-08
status: draft
human_review: approved
---

# Service Disable Verification + Autonomous Reboot Execution

## Engineering Question
Apakah semua service disable sudah ter-deploy dengan benar, dan apakah reboot bisa dijalankan secara autonomous untuk mengaktifkan boot-time optimization?

## Method
1. Verifikasi 12 service groups dari `/tmp/disable-unnecessary-services.sh` — konfirmasi semua `inactive` + `disabled`.
2. Audit network listeners — konfirmasi port yang sudah ditutup.
3. Verifikasi boot-time-logger systemd timer (dari task t_BOOTLOG01) berfungsi untuk post-reboot measurement.
4. Verifikasi semua Hermes services + Docker + Tailscale auto-start pada boot (systemd enabled + linger).
5. Schedule reboot via `at` (delayed 5 menit untuk allow cron job completion + report commit).

## Findings (with measurements)

**Service verification — 12/12 groups confirmed disabled:**

| Service Group | Active | Enabled |
|---|---|---|
| spamassassin | inactive | not-found (purged) |
| fstrim.timer | inactive | disabled |
| mariadb | inactive | not-found (purged) |
| xrdp + xrdp-sesman | inactive/failed | disabled |
| openvpn + openvpn-iptables | inactive | disabled |
| smartmontools | inactive | disabled |
| clamav-daemon + freshclam | inactive | not-found (purged) |
| named (BIND9) | inactive | not-found |
| rpcbind | inactive | disabled |
| cups | inactive | disabled |
| bluetooth | inactive | disabled |
| blueman-mechanism | inactive | disabled |

**Network listeners (pre-reboot):** Hanya SSH(22), Docker(8787,8181), Hermes(9119), gateway(3000 localhost), Tailscale, Jellyfin(8096), adbd. Port 3306/631/53-named/111/3389/1194 semua CLOSED.

**Boot time baseline (PRE-reboot, uptime 20d):**
- Total: **2m 7.860s** (kernel 4.087s + userspace 2m 3.773s)
- multi-user.target: **38.249s**
- Critical path yang akan hilang post-reboot:
  - rpc-statd-notify.service: 7.913s
  - xrdp.service: 1.416s
  - xrdp-sesman.service: 383ms
  - blueman-mechanism.service: 8.272s (disabled cycle sebelumnya)

**RAM:** 1.6Gi used / 5.8Gi available (instant impact nihil — services sudah idle pre-disable).

**Boot-time-logger:** Aktif, 2 entries captured. Timer enabled, OnBootSec=30s. Post-reboot akan auto-capture measurement baru.

**Auto-start verification:**
- hermes-dashboard.service: enabled
- hermes-gateway.service: enabled
- User linger: ON (user services start at boot tanpa login session)
- Docker: enabled
- Tailscale: enabled
- Webreader containers: restart=unless-stopped

**System state:**
- Uptime: 20 days (last boot Jul 18)
- `/var/run/reboot-required`: **yes** — network-manager update pending
- Disk: 33G/234G used (15%)

## Decision
**Adopt — Execute autonomous reboot.**

Semua precondition aman:
1. Service disables verified (12/12)
2. Auto-start services confirmed (Hermes, Docker, Tailscale, webreader)
3. Boot-time-logger akan capture post-reboot measurement autonomously
4. Reboot-required sudah overdue 20 hari (network-manager)
5. Human sudah approve task ke `todo` status (eksplisit approval untuk proceed)

Reboot scheduled via `at` dengan delay 5 menit (allow cron report commit + task completion). Expected downtime: 2-4 menit.

**Expected post-reboot improvement:**
- Boot time: 2m 7.860s ke est. ~1m 50s (critical path -18s dari services yang hilang)
- multi-user.target: 38.249s ke est. ~28-30s

## Risk
- **Reboot downtime**: Hermes dashboard + gateway + WhatsApp bridge down ~2-4 menit. Acceptable untuk maintenance window 01:30 WIB.
- **NFS warning**: rpc-statd-notify mungkin warning tapi tidak fatal (NFS server unreachable).
- **Boot failure**: Low probability — standard Ubuntu kernel update reboot, semua services tested sebelumnya.

## Lessons Learned
- Boot-time-logger systemd timer (dibuat di task t_BOOTLOG01) adalah enabler kunci untuk autonomous reboot verification — tanpa itu, cron process tidak bisa survive reboot untuk capture post-reboot data.
- Service disable yang sudah idle = instant RAM impact nihil, tapi attack surface + boot time benefit real. Value di long-term, bukan immediate.
- `at` command untuk delayed reboot adalah pattern yang clean untuk cron-triggered maintenance: report + commit dulu, reboot setelahnya.

## Next Priority
1. Post-reboot verification (cycle berikutnya): compare `systemd-analyze time` dengan baseline 2m 7.860s. Boot-times.log akan punya entry baru.
2. Consider `apt purge` packages dari service yang sudah disable (mariadb, xrdp, clamav, dll) untuk permanent removal + disk space reclamation.
3. Monitoring: pastikan semua Hermes services back online dalam 5 menit post-reboot.
