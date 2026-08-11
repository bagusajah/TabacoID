---
task_id: t_34D42728
objective: OBJ-002
date: 2026-08-07
status: draft
human_review: approved
---

# Disable Unnecessary Services + Verifikasi Boot Time

## Engineering Question
Berapa banyak boot time dan RAM yang bisa dihemat dengan menonaktifkan service systemd yang tidak terpakai di host Orange Pi RK3588?

## Method
1. Review script `/tmp/disable-unnecessary-services.sh` (generated cycle sebelumnya, 12 service groups).
2. Capture before-state: RAM usage, status setiap target service, boot time (`systemd-analyze`).
3. Jalankan script disable.
4. Capture after-state: verifikasi setiap service `inactive` + `disabled` (tidak akan start saat boot).
5. Hitung estimasi penghematan boot time dari blame data.

## Findings (with measurements)

**Before-state:**
- RAM: 2694 MB used, 4842 MB available
- Boot time (current): kernel 4.087s + userspace 2m 3.773s = **2m 7.860s total**
- multi-user.target reached: 38.249s in userspace
- Services yang masih aktif sebelum run: `fstrim.timer`, `xrdp`, `xrdp-sesman`, `openvpn`, `openvpn-iptables`, `smartmontools` (6 service)

**After-state:**
- RAM: 2707 MB used, 4829 MB available (delta: tidak signifikan untuk idle services — ~0 MB instant impact, service-service ini mostly idle dengan footprint kecil)
- Semua 6 service yang sebelumnya aktif → `inactive` dan `disabled`

**Services disabled (12 groups total, verified `disabled` state):**

| Service Group | Sebelum | Sesudah | Enabled? |
|---|---|---|---|
| spamassassin | inactive | inactive | disabled |
| fstrim.timer | active | inactive | disabled |
| mariadb | inactive | inactive | disabled |
| xrdp + xrdp-sesman | active | inactive/failed | disabled |
| openvpn + openvpn-iptables | active | inactive | disabled |
| smartmontools | active | inactive | disabled |
| clamav-daemon + freshclam | inactive | inactive | disabled |
| named (BIND9) | inactive | inactive | disabled |
| rpcbind | inactive | inactive | disabled |
| cups | inactive | inactive | disabled |
| bluetooth | inactive | inactive | disabled |
| nfs-automounts | n/a (not present) | skip | — |

**Boot time impact (estimasi dari blame data boot ini):**
- `xrdp.service`: 1.416s
- `xrdp-sesman.service`: 0.383s
- `fstrim.service`: tidak muncul di blame boot ini (timer mingguan, jalan via fstrim.timer)
- `rpc-statd-notify.service`: 7.913s (terkait NFS/rpcbind — akan hilang setelah rpcbind disabled)

Estimasi minimal penghematan boot path: **~9.7s** dari service yang terlihat di blame (xrdp 1.8s + rpc-statd 7.9s). `fstrim.timer` sebelumnya 33.2s (data dari laporan sebelumnya) tapi itu one-shot weekly service, bukan di critical boot path setiap boot.

Note: script estimasi ~56s savings, tapi itu agregat dari semua init time service yang sebagian besar overlap (parallel). Real savings di critical path lebih kecil, ~10-20s realistis.

## Decision
**Adopt (sebagian).** Disable script berhasil dijalankan, 11 service groups nonaktif dan disabled. RAM impact instant nihil karena service-service tsb idle — benefit utama ada di boot time dan reduced attack surface.

**REBOOT DITUNDA — needs human approval.** Task aslinya minta reboot + verifikasi boot time. Reboot tidak dijalankan karena:
1. Reboot akan mematikan semua Hermes services (dashboard, gateway, WhatsApp bridge) dan cron jobs.
2. Reboot akan kill proses ini sendiri (self-terminating).
3. Boot time actual hanya bisa diukur setelah reboot, tapi risiko disruption terlalu besar untuk autonomous execution.

## Risk
- **xrdp-sesman status "failed"**: ini expected (service di-stop paksa saat running). Sudah `disabled`, tidak akan restart. Tidak ada impact.
- **openvpn disabled**: jika ada user/konfigurasi yang pakai VPN tunnel, perlu re-enable. Tapi task `t_05DE0CC8` sudah confirm tidak ada active tunnel.
- **fstrim.timer disabled**: NVMe handle TRIM internal via garbage collection, tapi jika SSD health degradation terlihat di future, re-enable `fstrim.timer`.
- **Reboot belum dilakukan**: boot time savings belum ter-verifikasi actual.

## Lessons Learned
- Idle systemd services punya footprint RAM hampir nol — RAM savings dramatis dari disable services itu mitos di sistem yang sudah idle. Benefit utama: boot time + attack surface, bukan RAM.
- Estimasi boot savings dari script (56s) over-optimistic karena service parallel. Real critical-path savings ~10-20s.
- Reboot autonomously di production host = bad idea untuk cron job. Harus explicit human trigger.

## Next Priority
1. **Human review + approve reboot** untuk verifikasi actual boot time savings. Setelah reboot: `systemd-analyze` dan bandingkan dengan 2m 7.860s baseline.
2. Task `t_50599F28` (apt remove unused packages) — follow-up natural, purge package secara permanen setelah confirm service disable tidak break apa-apa.
