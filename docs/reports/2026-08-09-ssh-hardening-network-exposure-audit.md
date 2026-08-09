---
task_id: t_5a1b7ff3
objective: OBJ-002
date: 2026-08-09
status: draft
---

# Audit SSH Hardening Posture + Network Exposure

## Engineering Question

Seberapa aman posture SSH dan network exposure Orange Pi ini? Hermes `security_audit` sudah flag SSH password auth default-on — apakah ini real risk atau noise? Service apa saja yang exposed dan butuh attention?

## Method

Audit konfigurasi SSH aktif (`sshd -T`), enumerate semua listening port beserta process-nya, cek firewall status, review brute-force history 30 hari, dan map network topology (NAT, Tailscale, VPS reverse proxy).

## Findings (with measurements)

### SSH Configuration — `sshd -T` effective values:

| Setting | Value | Risk |
|---------|-------|------|
| `passwordauthentication` | **yes** | HIGH — brute-forceable |
| `permitrootlogin` | **yes** | HIGH — root direct login |
| `pubkeyauthentication` | yes | OK |
| `maxauthtries` | 6 (default) | MEDIUM |
| `port` | 22 (default) | LOW |

Hanya **1 authorized_keys** entry untuk user orangepi — pubkey auth sudah aktif, jadi password auth tidak necessary.

### Network Topology:
- **Local IP:** 192.168.10.236 (behind NAT router 192.168.10.1)
- **External IP:** 36.69.183.209 (dynamic ISP, **not** static)
- **Tailscale:** 100.72.213.56 (twihay) — admin mesh aktif
- **VPS:** node `host` (202.10.34.149) aktif, reverse-proxy hermes.tabaco.id → Pi

**NAT insight:** Pi berada di belakang router rumah. Port 22 di 0.0.0.0 hanya exposed ke internet **if** router forward port 22. External IP dynamic → kemungkinan tidak di-forward, tapi **belum terverifikasi**.

### Services bound to 0.0.0.0 (LAN-exposed):

| Port | Process | Risk Assessment |
|------|---------|-----------------|
| 22 | sshd | **HIGH** — password auth + root login on |
| **5555** | **adbd** (Android Debug Bridge) | **MEDIUM** — unexpected, ADB over network |
| 8096 | jellyfin | LOW — media server, LAN-only OK |
| 8181 | webreader-nginx | MEDIUM — TICMI proxy API |
| 8787 | webreader-api | MEDIUM — TICMI proxy API |
| 9119 | hermes dashboard | MEDIUM — control plane |

Port 3000 (gateway) dan 5037 (ADB host) correctly bound ke 127.0.0.1.

### Firewall:
- **UFW: inactive** (tidak terinstall)
- iptables: 70 rules (Docker-managed, bukan firewall app-level)

### Brute-force history:
- **3 attempts** in 30 days (auth.log + rotated) — rendah, tapi log rotation baru reset setelah reboot hari ini
- **fail2ban: not installed** — tidak ada auto-ban untuk repeat offenders

## Decision

**Needs Human Review** — perubahan SSH config adalah production risk (bisa lockout akses). Recommend hardening actions untuk di-apply manual:

### Priority Recommendations:

1. **[HIGH] Disable SSH password auth:**
   ```bash
   echo "PasswordAuthentication no" | sudo tee /etc/ssh/sshd_config.d/10-hardening.conf
   ```
   Prerequisite: verify key-based login works via Tailscale SSH first.

2. **[HIGH] Disable root login:**
   ```bash
   echo "PermitRootLogin no" | sudo tee -a /etc/ssh/sshd_config.d/10-hardening.conf
   ```

3. **[MEDIUM] Disable ADB over network (port 5555):**
   ```bash
   sudo setprop service.adb.tcp.port -1  # atau stop adbd service
   ```
   ADB network listener tidak ada alguna justification di server headless.

4. **[MEDIUM] Install fail2ban** untuk SSH brute-force protection:
   ```bash
   sudo apt install fail2ban
   ```

5. **[LOW] Verify router tidak forward port 22** ke Pi — konfirmasi NAT isolation.

## Risk

- **Lockout risk:** Jika password auth di-disable tanpa verify key login via Tailscale, bisa lose akses SSH. Mitigasi: test `ssh -i ~/.ssh/id_rsa orangepi@100.72.213.56` dulu.
- **Jellyfin exposure:** Port 8096 di 0.0.0.0 OK untuk LAN usage, tapi kalau router forward = media library exposed ke internet.

## Lessons Learned

1. **`host.tabaco.id` tidak resolve DNS** — VPS hostname tidak punya A record. hermes.tabaco.id dan www.tabaco.id resolve ke 202.10.34.149 (VPS), tapi `host.` subdomain missing. Bukan masalah karena Tailscale mesh yang connect, tapi inconsistent dengan documentation.
2. **Hermes security_audit scanner akurat** — flag-nya valid, bukan false positive seperti scanner injection warning sebelumnya.
3. **52 pending apt upgrades** (38 security-tagged) semua multimedia (gstreamer/ffmpeg) dan xserver-xorg packages — **tidak relevant** untuk headless server. Bisa di-upgrade dengan low risk, tapi priority rendah.

## Next Priority

Apply SSH hardening recommendations (setelah human review). Setelah itu, audit `host.tabaco.id` DNS record gap dan router port-forwarding posture.
