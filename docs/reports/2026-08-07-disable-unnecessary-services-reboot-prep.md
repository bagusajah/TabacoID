---
task_id: t_34D42728
objective: OBJ-002
date: 2026-08-07
status: draft
human_review: approved
---

# Disable Unnecessary Services + Pre-Reboot Boot Time Verification

## Engineering Question
Berapa boot time dan RAM yang bisa dihemat dengan menonaktifkan service systemd yang tidak terpakai di host Orange Pi RK3588? Apakah reboot aman dijalankan autonomously?

## Method
1. Verify status semua service yang didisable oleh `/tmp/disable-unnecessary-services.sh` (run di cycle sebelumnya).
2. Audit network listeners — konfirmasi tidak ada service yang masih listen di port yang seharusnya sudah tutup.
3. Analisis `systemd-analyze blame` critical path untuk estimasi boot savings pasca-reboot.
4. Disable service tambahan yang teridentifikasi masih enabled tapi useless (blueman-mechanism).
5. Kalkulasi predicted boot time post-reboot.

## Findings (with measurements)

**Service verification (12 groups dari script sebelumnya):**

| Service Group | Active? | Disabled? |
|---|---|---|
| spamassassin | inactive | disabled |
| fstrim.timer | inactive | disabled |
| mariadb | inactive | disabled |
| xrdp + xrdp-sesman | inactive/failed | disabled |
| openvpn + openvpn-iptables | inactive | disabled |
| smartmontools | inactive | disabled |
| clamav-daemon + freshclam | inactive | disabled |
| named (BIND9) | inactive | disabled |
| rpcbind | inactive | disabled |
| cups | inactive | disabled |
| bluetooth | inactive | disabled |

Semua 11 service groups terverifikasi `inactive` + `disabled` (12th, nfs-automounts, tidak ada di sistem ini).

**Network listener audit:**
- Port 3306 (MariaDB): CLOSED ✓
- Port 631 (CUPS): CLOSED ✓
- Port 53 (named): hanya `systemd-resolved` @ 127.0.0.53 ✓
- Port 111 (rpcbind): CLOSED ✓
- Port 3389 (xrdp): CLOSED ✓
- Port 1194 (openvpn): CLOSED ✓

Active listeners sekarang hanya: SSH (22), Docker proxy (8787, 8181), Hermes dashboard (9119), gateway (3000 localhost), Tailscale, Jellyfin (8096), adbd (5555, 5037). Attack surface berkurang signifikan.

**Boot time analysis (current boot = PRE-disable, last boot Jul 18):**
- Total boot: 2m 7.860s (kernel 4.087s + userspace 2m 3.773s)
- multi-user.target: 38.249s

**Services yang akan hilang dari boot path setelah reboot berikutnya:**

| Service | Boot blame (boot ini) | Post-reboot |
|---|---|---|
| rpc-statd-notify.service | 7.913s | 0s (rpcbind disabled) |
| xrdp.service | 1.416s | 0s |
| xrdp-sesman.service | 383ms | 0s |
| **blueman-mechanism.service** | **8.272s** | **0s (disabled cycle ini)** |

**Predicted critical-path savings post-reboot: ~9.7s** (rpc-statd 7.9s + xrdp 1.8s dari blame visible). Total blame savings ~17.9s jika blueman-mechanism (8.2s) juga di critical path, tapi sebagian overlap.

**RAM state:**
- Before (cycle sebelumnya): 2694 MB used
- Now: 2.6Gi used, 4.7Gi available
- Delta: ~0 MB instant impact (services already idle). Benefit utama: attack surface + boot time.

**Disable tambahan cycle ini:**
- `blueman-mechanism.service` (8.272s boot blame): disabled + stopped. Bluetooth.service sudah disabled sebelumnya, jadi blueman dead weight.

**System state:**
- Uptime: 20 days (last boot Jul 18)
- `/var/run/reboot-required` exists: `network-manager` update pending reboot
- Reboot sudah overdue dari apt update, terlepas dari service optimization

## Decision
**Adopt.** Semua service optimization sudah deployed. Ada **2 trigger untuk reboot segera:**
1. Service disable changes hanya take effect di boot berikutnya
2. Pending reboot-required dari network-manager update

**Reboot BLOCKED for human trigger.** Alasan:
- Cron process ini akan ter-kill saat reboot → tidak bisa capture post-reboot measurement
- Semua Hermes services (dashboard :9119, gateway :3000, WhatsApp bridge) akan down ~2-4 menit
- Boot time verification hanya meaningful dengan before/after comparison dari session yang sama

## Risk
- **rpc-statd-notify**: tergantung rpcbind. Setelah reboot, nfs-client target mungkin warning tapi tidak fatal (NFS server 192.168.x.x sudah unreachable).
- **blueman-mechanism disabled**: jika user plug Bluetooth dongle di future, perlu re-enable. Low risk — tidak ada BT hardware aktif.
- **Pending reboot-required**: network-manager update butuh reboot untuk apply. Makin lama ditunda, makin risk.

## Lessons Learned
- Boot time optimization dari disable idle services itu real di critical path (rpc-statd 7.9s, xrdp 1.8s, blueman 8.2s = ~18s combined blame), tapi RAM impact nihil karena services idle.
- `blueman-mechanism` (8.2s) adalah #2 slowest boot service tapi sering missed — ini Bluetooth manager yang useless kalau `bluetooth.service` juga disabled.
- Reboot verification tidak bisa autonomous di cron job: process death = measurement gap. Perlu separate verification mechanism (systemd timer yang capture boot time post-reboot, atau manual check).

## Next Priority
1. **Human trigger reboot** (`sudo reboot`). Setelah reboot: `systemd-analyze time` dan compare dengan 2m 7.860s baseline. Expected: ~10-18s faster critical path.
2. Consider systemd timer untuk auto-capture boot time setiap boot (`systemd-analyze time >> /var/log/boot-times.log`) untuk future verification tanpa manual check.
3. Task follow-up: `apt purge` packages dari service yang sudah disable (mariadb, xrdp, clamav, dll) untuk permanent removal + disk space.
