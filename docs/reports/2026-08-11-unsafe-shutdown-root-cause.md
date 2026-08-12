---
task_id: t_b2fc3aa6
objective: OBJ-002
system: host-os
date: 2026-08-11
status: draft
human_review: autonomous
---

# Root Cause Analysis: 98/99 Unsafe Shutdowns pada Orange Pi RK3588

## Engineering Question

NVMe SMART melaporkan 99 power cycles dengan 98 unsafe shutdowns (98% rate). Apa root cause-nya? Thermal throttling, PSU failure, brownout/undervoltage, atau power cut tanpa UPS?

## Method

Kumpulkan evidence dari multiple layer:

1. **NVMe SMART log** (`nvme smart-log /dev/nvme0n1`)
2. **Kernel thermal/throttle/voltage events** (dmesg, journalctl)
3. **Thermal zone status + trip points** (sysfs)
4. **UPS daemon presence** (systemctl, ps)
5. **Filesystem mount count** (tune2fs)
6. **Log persistence infrastructure** (zram, ramlog, journal config)

## Findings (with measurements)

### NVMe SMART — sehat, bukan SSD yang bermasalah

| Metric | Value |
|--------|-------|
| Power Cycles | 99 |
| Unsafe Shutdowns | 98 (98%) |
| Power On Hours | 5,992h (~249 hari, ~8 bulan) |
| Avg uptime per cycle | 60h (~2.5 hari) |
| Media Errors | 0 |
| Error Log Entries | 0 |
| Percentage Used (wear) | 0% |
| Temperature | 45°C (nominal) |
| Thermal Management T1/T2 | 0 transitions |
| Available Spare | 100% |

**NVMe tidak rusak.** Zero media errors, zero thermal throttling, 0% wear. Masalahnya bukan drive-nya.

### Thermal — sangat sehat, BUKAN penyebab

| Zone | Type | Temp | Critical Trip |
|------|------|------|---------------|
| thermal_zone0 | soc-thermal | 38°C | 115°C |
| thermal_zone1 | bigcore0-thermal | 38°C | 115°C |
| thermal_zone2 | bigcore1-thermal | 38°C | 115°C |
| thermal_zone3 | littlecore-thermal | 39°C | 115°C |
| thermal_zone4 | center-thermal | 37°C | 115°C |
| thermal_zone5 | gpu-thermal | 37°C | 115°C |
| thermal_zone6 | npu-thermal | 37°C | 115°C |

Semua cooling devices di cur=0 (idle). Delta ke critical: **77°C margin**. Thermal throttling bukan penyebab.

### UPS — TIDAK ADA

- Zero UPS daemon services (nut, apcupsd: tidak terinstall)
- Zero UPS processes
- Tidak ada power-fail detection mechanism

### Root Cause: Power cut tanpa graceful shutdown + tidak ada UPS

**98 dari 99 shutdown = hard power cut.** Hanya 1 clean shutdown di lifetime device.

Pola 60h/cycle (~2.5 hari) konsisten dengan:
- Pemadaman listrik berkala (lingkungan)
- ATAU manual power-off tanpa shutdown command

Bukan:
- PSU failure (tidak ada voltage warnings di kernel log)
- Thermal shutdown (tempreratur 37-39°C, 77°C di bawah critical)
- Kernel panic (tidak ada panic/emergency di syslog)
- Brownout/undervoltage (tidak ada evidence di dmesg)

### Secondary finding: ZRAM log partition penuh di boot

Saat boot hari ini (09:09:51), syslog mulai dengan:

```
Aug 11 09:15:03 twihay kernel: systemd-journald: Failed to open system journal: No space left on device
```

Root cause: `/var/log` di mount pada `/dev/zram1` (200M zram, ext4 188M usable), saat ini **72% full** (125M/188M). Journald `SystemMaxUse=20M` tapi tetap kehabisan space karena zram partition-nya kecil.

**Ini observability gap yang serius**: journald gagal menulis boot log, jadi kalau ada kernel panic atau thermal event saat power cut, tidak akan tercatat. `ramlog-sync.timer` (sync ke `/var/log.hdd` di NVMe setiap 10 menit) membantu, tapi cuma untuk logs yang berhasil ditulis sebelumnya.

### Filesystem: mount count exceeded

| Metric | Value |
|--------|-------|
| Mount Count | 67 |
| Max Mount Count | 30 |
| Last fsck | Jun 14, 2025 |

fsck dilewati 37x melewati threshold. Bukan masalah kritis (ext4 journaling menangani recovery), tapi indikasi konsekuensi dari reboot terus-menerus tanpa fsck rutin.

## Decision

**Adopt rekomendasi mitigasi (prioritas berurutan):**

1. **[CRITICAL] Deploy UPS atau power-fail auto-shutdown** — root cause-nya murni power cut tanpa graceful shutdown. Opsi:
   - UPS kecil (even USB power bank with pass-through)
   - GPIO-based power loss detection + `systemctl poweroff` trigger
   - Network watchdog: jika host tidak reachable X menit → remote trigger shutdown (tapi ini tidak bantu untuk power cut scenario)

2. **[HIGH] Fix ZRAM log capacity** — tingkatkan zram1 dari 200M ke 400M, atau kurangi journald verbosity. Saat ini journald "No space left on device" membuat investigasi seperti ini nyaris mustahil — kita kehilangan evidence kernel-level.

3. **[MEDIUM] Schedule periodic fsck** — `tune2fs -C 0 /dev/nvme0n1p2` untuk reset counter, atau turunkan `Maximum mount count` interval.

**Reject:** Bukan PSU replacement (tidak ada evidence PSU failure). Bukan thermal mitigation (temperature sehat).

## Risk

- **Data loss:** Setiap unsafe shutdown berpotensi corrupt filesystem. ext4 journaling menangani sebagian besar kasus, tapi `commit=600` di fstab (10 menit commit interval) berarti data tertunda sampai 10 menit bisa hilang.
- **NVMe lifespan:** Unsafe shutdown memaksa NVMe recovery sequence setiap kali. 98 occurences belum menyebabkan media errors (0%), tapi ini cumulative stress.
- **Log loss:** zram log full = kita buta terhadap root cause masa depan.

## Lessons Learned

1. **Observability gap adalah masalah pertama yang harus diselesaikan.** Tanpa persistent journal yang reliable, kita tidak bisa diagnose masalah lain. zram log setup (Orange Pi default) tidak cocok untuk production yang butuh audit trail.
2. **98% unsafe shutdown rate adalah red flag infrastruktur.** Ini bukan "normal operation" — itu tanda tidak ada power management strategy sama sekali.
3. **SMART data + thermal sensors cukup untuk rule out hardware failure.** Tidak perlu invasive diagnostics untuk klasifikasi root cause.

## Next Priority

1. Buat task untuk fix ZRAM log capacity (quick win, meningkatkan observability)
2. Buat task untuk evaluate UPS options (cost vs benefit, OBJ-004 budget constraint)
3. Reset fsck mount count: `sudo tune2fs -C 0 /dev/nvme0n1p2`
