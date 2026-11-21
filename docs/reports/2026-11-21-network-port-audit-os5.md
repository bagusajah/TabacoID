---
task_id: t_a867d086
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-21
status: published
human_review: autonomous
---

# Network Port Audit — Orange Pi (backlog OS5)

## Engineering Question
Port apa saja yang listening di Orange Pi (host semua lane), siapa pemiliknya,
dan apakah ada exposure yang berisiko? Sebelumnya baru 7 port Docker yang eksplisit;
sisanya (8096, 8222, 1194, 111, plus 5 port high-numbered) tidak terpetakan.

## Method
- `ss -tlnp` / `ss -ulnp` via sudo untuk mapping pid/proses penuh.
- `rpcinfo -p` untuk port RPC (NFS stack).
- Cross-check `docker ps` published ports dan `systemctl list-units` running services.
- `tailscale serve/funnel status` untuk cek ekspos publik via Tailscale.
- Cek firewall: `ufw` (tidak terinstall), `/proc/net/ip_tables_names` (kosong = tanpa rule iptables).
- SSH hardening: grep `sshd_config` + drop-in `99-hardening.conf`, hitung failed login di auth.log.
- Konfigurasi tidak diubah sama sekali — ini audit read-only.

## Findings

**Metric: port TCP terpetakan 7/18 → 18/18 (100%); UDP 14/14 (100%).**
Semua listener kini punya pemilik identik, nol proses misterius.

| Port | Proto | Proses | Keterangan |
|------|-------|--------|------------|
| 22 | tcp | sshd | PasswordAuth **no**, PermitRootLogin **no** (drop-in 99-hardening). Failed password: 1. |
| 53 | tcp/udp | systemd-resolved | Stub lokal 127.0.0.53 — aman. |
| 111 | tcp/udp | rpcbind + rpc.statd | Stack NFS **client** (lockd 46027/38354, statd 54929/48461) untuk mount ke NAS 192.168.10.238. Bukan NFS server (`/etc/exports` absen). |
| 323 | udp | chrony | 127.0.0.1 saja — aman. |
| 1194 | udp | openvpn-server@server | VPN server, intentional (akses remote). |
| 3001 | tcp | docker-proxy → cicd-console-app | Lane CICD console. |
| 3306 | tcp | docker-proxy → new-cicd-console-db | **MySQL/MariaDB di 0.0.0.0** ⚠️ |
| 7359 | udp | jellyfin | Auto-discovery DLNA — khas Jellyfin. |
| 8096 | tcp | jellyfin | Media server, intentional. |
| 8181/8787 | tcp | webreader-nginx / webreader-api | Lane webreader. |
| 8222 | tcp | vaultwarden | **Password manager di 0.0.0.0** ⚠️ |
| 8788 | tcp | python3 (hermes-webui) | Punya auth sendiri (SERVICE_USER/PASS). |
| 11235 | tcp | crawl4ai | MCP server crawl4ai. |
| 41641 | udp | tailscaled | Port transport Tailscale — normal. |

- **Ekspos publik via Tailscale: nol** — `serve` dan `funnel` tidak aktif.
- **Firewall lokal: kosong** — tidak ada iptables rules, ufw tidak terinstall. Perlindungan
  sepenuhnya bergantung pada NAT router (LAN home) + Tailscale ACL.
- SSH aman: hardening drop-in menang atas `sshd_config` utama (PermitRootLogin yes
  di file utama *di-override* oleh `99-hardening.conf`), password auth disabled,
  cuma 1 failed attempt (background noise).

## Decision
**Adopt (temuan) + Needs Human Review (2 rekomendasi hardening, tanpa perubahan otomatis):**

1. **Vaultwarden (8222) → bind ke Tailscale IP saja** (`100.72.213.56:8222:80` di compose).
   Password manager adalah aset paling sensitif di box ini; saat ini bisa dijumlah
   dari seluruh LAN.
2. **MySQL cicd-console (3306) → bind 127.0.0.1** (`127.0.0.1:3306:3306`).
   Kemungkinan besar legacy publish; app compose network biasanya tidak butuh host port.

Dua perubahan ini menyentuh docker-compose + restart container → butuh approval user,
sesuai aturan (tidak ada perubahan firewall/config tanpa review).

## Risk
- Tanpa iptables rules, keamanan = NAT router. Kalau ada port-forward lama di router
  atau perangkat LAN lain compromised, semua service di atas reachable. Risiko diterima
  untuk home lab, tapi 2 rekomendasi di atas memperkecil blast radius murah-murah.
- OpenVPN 1194 tetap intentional — verifikasi router tidak port-forward kecuali memang dipakai.

## Lessons Learned
- `ss -tlnp` tanpa sudo menyembunyikan pid root — sekali sudo langsung selesai semua.
- Port "misterius" high-numbered hampir selalu aux stack yang sudah dikenal
  (di sini: NFS client lockd/statd) — cek `rpcinfo` dulu sebelum curiga.
- Drop-in `sshd_config.d/*.conf` mengoverride nilai file utama — jangan panik
  lihat `PermitRootLogin yes` di `sshd_config` sebelum cek drop-in.

## Next Priority
- Eksekusi 2 rekomendasi bind di atas setelah approval (task terpisah, sistem host-os).
- Optional: pasang aturan iptables minimal (allow LAN + tailscale0, drop lainnya)
  kalau user mau defense-in-depth di luar NAT.
