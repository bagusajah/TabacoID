---
task_id: t_b72ab31c
objective: OBJ-002
date: 2026-08-09
status: draft
human_review: autonomous
---

# Audit ZRAM Compression + NVMe SMART Health

## Engineering Question
Seberapa efisien konfigurasi ZRAM (swap + /var/log) di Orange Pi RK3588? Dan apakah NVMe menunjukkan tanda-tanda degradasi, wear, atau thermal issue setelah 5,933 jam operasi?

## Method
Membaca langsung dari sysfs (`/sys/block/zram*/mm_stat`, `/sys/class/thermal/thermal_zone*`), NVMe SMART log via `nvme smart-log`, dan `dmesg` untuk event throttling/undervoltage. Baseline audit, no changes applied.

## Findings (with measurements)

### ZRAM Swap (zram0)
| Metric | Value |
|--------|-------|
| Algorithm | lzo-rle |
| Disksize | 3,967 MB |
| Orig data | 78,602,240 bytes (75 MB) |
| Compressed | 20,367,540 bytes (19.4 MB) |
| Compression ratio | **3.85:1 (74.1% reduction)** |
| Currently used | 75 MB swap (of 3.9 GB) |

### ZRAM /var/log (zram1)
| Metric | Value |
|--------|-------|
| Algorithm | zstd |
| Disksize | 200 MB |
| Orig data | 115,834,880 bytes (110 MB) |
| Compressed | 14,455,442 bytes (13.6 MB) |
| Compression ratio | **8.01:1 (87.5% reduction)** |

zstd pada zram1 (/var/log) jauh lebih efektif dari lzo-rle pada zram0 (swap) — expected karena log text sangat compressible.

### NVMe SMART Health
| Metric | Value | Assessment |
|--------|-------|------------|
| Power-on hours | 5,933 h (~247 days) | — |
| Wear (percentage_used) | **0%** | Excellent |
| Media errors | **0** | Clean |
| NVMe error log | 0 entries | Clean |
| Temperature | 45°C | Normal |
| Data written | 675 GB | Low for NVMe |
| Critical warning | 0 | None |
| Thermal throttle events | 0 | None |
| **Unsafe shutdowns** | **98 / 99 power cycles (99%)** | **⚠️ Risk** |

### Thermal & CPU
- Semua thermal zones: 34-35°C (idle, malam hari)
- No throttling events in dmesg
- No undervoltage/brownout events
- CPU freq: 600-1800 MHz (dynamic, governor: ondemand)

## Decision
**Adopt (monitoring baseline established).** Hardware dalam kondisi excellent kecuali satu finding:

**⚠️ Unsafe shutdowns: 98 dari 99 power cycles.** Ini berarti hampir setiap power-off adalah hard cut (power loss / forced off) bukan clean shutdown. Risiko:
- NVMe masih sehat (0% wear, 0 media errors) — NVMe modern punya power-loss protection (PLP) di DRAM cache, tapi tetap bukan best practice
- Filesystem: mount count 67, maximum mount count -1 (disabled auto-fsck) — potensi silent corruption jika hard power-off saat write burst

**Recommendation:** Setup systemd service untuk graceful shutdown via UPS, atau minimal pasang `fsck.repair=yes` di kernel cmdline dan aktifkan periodic filesystem check. Consider enabling `fstrim.timer` jika belum.

## Risk
- **Immediate:** 99% unsafe shutdown rate bisa cause filesystem corruption pada power-loss saat write. Probability rendah saat ini karena NVMe belum show errors, tapi cumulative.
- **Long-term:** Wear 0% setelah 247 days — NVMe will outlast the device.

## Lessons Learned
- ZRAM sangat efektif di Pi ini: swap compression 3.85:1 menghemat ~55 MB RAM, log compression 8:1 menghemat ~96 MB. Total ~151 MB RAM saved.
- zstd untuk log (zram1) jauh superior ke lzo-rle untuk swap (zram0). Tradeoff: lzo-rle lebih cepat untuk random-access swap pattern, zstd better ratio untuk sequential log writes. Konfigurasi sudah optimal.
- NVMe health metrics tidak ada alert yang perlu action segera selain unsafe shutdown rate.

## Next Priority
1. **Investigate unsafe shutdown root cause** — apakah power cut, kernel panic, atau OOM? Setup `pstore`/`ramoops` untuk capture crash logs.
2. **Enable periodic filesystem check** — set maximum mount count to 20-30 untuk auto-fsck safety net.
3. **Monitor zram swap pressure** — jika swap usage naik signifikan, pertimbangkan zstd untuk zram0 juga (tradeoff CPU vs RAM).
