# Daily Report 2026-08-07

## Engineering Question
Service mana saja di systemd yang mengonsumsi resource tanpa diminta, dan berapa RAM yang bisa direclaim?

## Method
1. List semua enabled services (`systemctl list-unit-files --state=enabled`)
2. Check active status, memory usage (`systemctl show --property=MemoryCurrent`)
3. Verifikasi apakah ada consumer: socket connections, process dependencies, fstab mounts
4. Disable & stop service yang aman, measure before/after RAM

## Findings

### Service yang di-disable (7 service, 0 side effect)

| Service | RAM Sebelum | Alasan Disable |
|---------|-----------|----------------|
| clamav-daemon | 1,151 MB | Antivirus di headless server, zero value |
| clamav-freshclam | 91 MB | Signature updater untuk AV yang dimatikan |
| mariadb | 72 MB | Running tapi zero socket connections, zero DB queries |
| named (BIND9) | 44 MB | Tidak listening di port manapun, config default kosong |
| rpcbind + socket | 1 MB | NFS portmapper, semua NFS mount di fstab sudah di-comment |
| rpc-statd-notify | ~0 MB | NFS peer notification, tidak ada NFS active |
| kerneloops | 1 MB | Kernel crash reporter di headless, pointless |

### Service yang dipertahankan (needs human review)

| Service | RAM | Alasan Keep |
|---------|-----|-------------|
| jellyfin | 336 MB | Ada log activity terbaru (Aug 7), mungkin dipakai |
| xrdp | 1 MB | Remote desktop, mungkin dipakai untuk akses sesekali |
| fstrim.timer | ~0 MB | Weekly NVMe TRIM, berguna untuk SSD health |

### Measurement

| Metric | Sebelum | Sesudah | Delta |
|--------|---------|---------|-------|
| RAM used | 3,677 MB | 2,606 MB | **-1,071 MB** |
| RAM available | 3,868 MB | 4,939 MB | **+1,071 MB** |
| Swap used | 148 MB | 115 MB | **-33 MB** |
| Active services | 56 enabled | 49 enabled | -7 |

### Verifikasi post-cleanup
- Hermes dashboard: active ✓
- Docker (webreader-api, webreader-nginx): running ✓
- Docker containers: tidak terdampak ✓
- Tailscale: active ✓

## Decision
**Adopt** — 7 service didisable, 1GB RAM direclaim tanpa side effect.

## Risk
- **clamav**: Jika nanti butuh AV scan manual, `sudo systemctl start clamav-daemon` masih bisa.
- **mariadb**: Kalau ada app yang butuh MySQL, perlu re-enable. Tapi saat ini zero connections.
- **named**: BIND9 not needed — DNS sudah ditangani oleh systemd-resolved + Tailscale MagicDNS.

## Lessons Learned
- clamav-daemon sendirian makan 1.1GB (14% total RAM). Ini biggest single win.
- named.enabled tapi tidak listening — install lalu lupa configure.
- `MemoryCurrent` via `systemctl show` lebih reliable daripada `ps aux` untuk service-level accounting.

## Next Priority
- Jellyfin (336MB) dan xrdp: tanya user apakah masih dipakai. Kalau tidak, +337MB lagi.
