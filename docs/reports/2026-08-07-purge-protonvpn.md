---
task_id: t_05DE0CC8
objective: OBJ-002
date: 2026-08-07
status: draft
---

# Purge Proton VPN Packages

## Engineering Question
Apakah Proton VPN packages yang terinstall masih dipakai, dan berapa resource yang bisa dibebaskan kalau dihapus?

## Method
1. Audit packages terinstall: `dpkg -l | grep proton`
2. Cek service status: `systemctl status proton-vpn-service.service`
3. Cek tunnel interface aktif: `ip link show | grep tun`
4. Cek CLI berfungsi: `protonvpn status`
5. Jika dead weight → purge semua packages + apt repo + orphaned deps
6. Verifikasi sistem sehat pasca-purge

## Findings (with measurements)

**Sebelum purge:**
- 7 packages ProtonVPN terinstall: `proton-vpn-cli`, `proton-vpn-daemon`, `protonvpn-stable-release`, `python3-proton-core`, `python3-proton-keyring-linux`, `python3-proton-vpn-api-core`, `python3-proton-vpn-local-agent`
- Total installed size: **4,822 KB (~4.8 MB)**
- CLI broken — import error saat menjalankan `protonvpn status` (ModuleNotFoundError chain)
- Daemon service tidak terdaftar di systemd (`Unit could not be found`)
- Tidak ada tunnel interface aktif (`NO_TUNNEL_IFACE`)
- Split tunneling service: `disabled`

**Setelah purge:**
- Packages remaining: **0**
- Apt repo source: **removed**
- CLI binary: **removed**
- Systemd units: **0**
- Disk used: **34G → 33G** (~1 GB freed, termasuk 26 orphaned dependency packages via `apt autoremove`)
- Orphaned deps removed: `python3-requests`, `python3-sentry-sdk`, `python3-bcrypt`, `wireguard-tools`, `python3-nacl`, dll.

**Sistem health pasca-purge:**
- `hermes-dashboard`: active ✓
- `hermes-gateway`: active ✓
- Docker containers: `webreader-api` Up 25h, `webreader-nginx` Up 5d ✓
- Network: ping 1.1.1.1 = 18ms, 0% packet loss ✓

## Decision
**Adopt.** ProtonVPN adalah dead weight — CLI broken, daemon tidak terdaftar, tidak ada tunnel aktif. Purge membebaskan ~1 GB disk dan menghilangkan 26 dependency packages yang tidak terpakai. Tidak ada dampak ke service production.

## Risk
**Low.** ProtonVPN tidak dipakai untuk routing production (Tailscale handle mesh networking). Kalau VPN diperlukan lagi di masa depan, install ulang via apt straightforward.

## Lessons Learned
Orphaned dependencies dari package yang dipurge sering luput dari `apt remove`. Selalu ikuti dengan `apt autoremove` untuk cleanup menyeluruh — di kasus ini 26 packages tambahan ikut terhapus.

## Next Priority
Task `t_LDKERN01` (Cek kernel update untuk fix iowait accounting bug RK3588) — ready di board.
