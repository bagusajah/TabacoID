# Daily Report 2026-08-07 — Audit Systemd Boot Services

## Pertanyaan Engineering
Boot time Pi adalah 2 menit 7 detik. Service mana yang tidak perlu dan berapa potensi penghematan?

## Metode
1. `systemd-analyze blame` — breakdown waktu per service
2. `systemd-analyze time` — total boot time
3. Cross-reference setiap slow service: apakah dipakai?
4. Cek `/etc/fstab` untuk NFS mount yang timeout
5. Verifikasi NVMe discard support (apakah fstrim perlu?)
6. Cek enabled services yang tidak perlu

## Temuan (dengan pengukuran)

### 1. Boot Time Breakdown

| Service | Waktu | Diperlukan? |
|---------|-------|-------------|
| `mnt-SHOWS.mount` | **1m 30s** | ❌ NFS server (192.168.x.x) unreachable |
| `fstrim.service` | **33.2s** | ❌ NVMe handle discard natively |
| `spamassassin.service` | **12.8s** | ❌ Tidak ada MTA yang pakai SpamAssassin |
| `lightdm.service` | **1.8s** | ⚠️ Ada desktop session aktif |
| `blueman-mechanism.service` | **8.3s** | ❌ Desktop Pi, bukan laptop BT audio |
| `rpc-statd-notify.service` | **7.9s** | ❌ Tidak ada NFS client/server aktif |
| `mariadb.service` | **5.7s** | ❌ Tidak ada app yang pakai MariaDB |
| `openvpn-iptables.service` | **1.6s** | ❌ OpenVPN tidak aktif (Pi pakai Tailscale) |
| `xrdp.service` | **1.4s** | ❌ RDP, redundant dengan SSH + Tailscale |
| **Total eliminable** | **~2m 02s** | (tanpa lightdm) |

**Total boot: 2m 07.9s → potensi: ~6s** (meninggalkan lightdm)

### 2. NFS Mount /mnt/SHOWS — 90s Timeout

```
/etc/fstab: 192.168.x.x:/nfs/SHOWS /mnt/SHOWS nfs defaults,_netdev,x-systemd.automount 0 0
```

- Server 192.168.x.x **unreachable** (ping timeout, not in ARP table)
- Mount sudah di-mask tapi automount unit masih generated dari fstab
- Setiap access ke `/mnt/SHOWS` triggers 90s mount timeout
- **Fix:** Hapus baris dari `/etc/fstab` atau comment out

### 3. fstrim pada NVMe — Redundan

- NVMe discard_max_bytes: 2,199,023,255,040 (2TB)
- NVMe handle TRIM internally, fstrim adalah redundant layer
- 33 detik setiap boot, 559ms CPU
- **Fix:** Disable `fstrim.timer`

### 4. Layanan Tidak Terpakai

| Service | RAM (saat berjalan) | Status |
|---------|---------------------|--------|
| spamassassin | 66 MB (3 processes) | Enabled, tidak ada MTA |
| mariadb | ~50 MB | Enabled, tidak ada app pakai |
| openvpn | - | Enabled, tidak pernah connect |
| xrdp | - | Enabled, redundant dengan SSH |
| blueman-mechanism | - | Enabled, Pi bukan laptop |

### 5. Layanan yang Dipertahankan

- `lightdm` — Ada desktop session aktif (session c1, user 1000 on seat0). Tidak disable tanpa konfirmasi.
- `docker.service` — Webreader dan layanan lain bergantung.

### 6. Failed Units

| Unit | Error | Severity |
|------|-------|----------|
| `hermes-logrotate.service` | exit-code 216/GROUP | Medium — sudah di-track (task t_853B7B24) |
| `nvmf-autoconnect.service` | Module nvme-fabrics not found | Low — 6ms, expected |

## Keputusan
**Needs Human Review** — Perubahan systemd memerlukan konfirmasi karena:
1. Desktop session aktif — lightdm tidak bisa di-disable tanpa diskusi
2. MariaDB mungkin diinstal untuk suatu tujuan yang belum diketahui
3. XRDP mungkin digunakan untuk remote desktop sesekali

## Rekomendasi (prioritas)

1. **Hapus NFS mount dari fstab** — `mnt-SHOWS` di `/etc/fstab`, save 90s boot, 0 risk
2. **Disable fstrim.timer** — `systemctl disable fstrim.timer`, save 33s boot, 0 risk (NVMe native discard)
3. **Disable spamassassin** — `systemctl disable --now spamassassin`, save 13s boot + 66MB RAM
4. **Disable mariadb** — `systemctl disable --now mariadb`, save 6s boot + 50MB RAM
5. **Disable openvpn + xrdp + blueman** — Save ~12s boot combined

**Total potensi: ~2m boot time → ~6s, ~116MB RAM freed**

## Risiko
- MariaDB bisa ada data penting — cek dulu: `mysql -e "SHOW DATABASES;"` (skip hari ini, human task)
- Desktop user mungkin butuh xrdp — cek dulu dengan human

## Lessons Learned
- `systemd-analyze blame` langsung reveal bottlenecks — harusnya jadi standard boot audit step
- NFS mount dari fstab tetap trigger automount meski mount unit sudah di-mask
- fstrim pada NVMe adalah waste — NVMe controller handle TRIM secara hardware

## Prioritas Berikutnya
- Human review: disable daftar service di atas
- Investigasi gateway memory leak (task t_24C44827 — already blocked, higher priority)
- Fix hermes-logrotate.service (task t_853B7B24 — already blocked)
