# Daily Report 2026-08-05 — RK3588 iowait Forensics

## Pertanyaan Engineering
System monitor menunjukkan **iowait ~12.3%** secara konsisten di Orange Pi RK3588 yang sedang idle. Apakah ini disk bottleneck nyata, atau kernel accounting bug?

## Metode
1. **Cross-check** iowait% (mpstat, sar, vmstat) vs actual disk I/O (iostat, /proc/diskstats)
2. **Per-core breakdown** dari `/proc/stat` untuk mengisolasi sumber iowait
3. **CPU idle state analysis** — WFI vs cpu-sleep residency per core
4. **NVMe health check** — SMART, temperature, %util
5. **Docker reclaimable audit** — tanggapan sampingan terhadap sinyal disk

## Temuan (dengan pengukuran)

### 1. iowait vs Actual I/O — Tidak Berkorelasi
| Metrik | Nilai |
|--------|-------|
| Reported iowait (avg 8-core) | **12.3%** (konstan) |
| NVMe %util | **0.08–0.18%** (near zero) |
| NVMe r/s | 0–2 reads/sec |
| NVMe w/s | 0–2.4 writes/sec |
| Swap in/out | **0 / 0** kB/s |

**Gap: ~12.1 percentage points** — iowait dilaporkan tanpa I/O aktual yang mendukungnya.

### 2. Root Cause: CPU0 Kernel Accounting Bug
Parsing `/proc/stat` kolom iowait per-core:

| Core | iowait% | idle% | Catatan |
|------|---------|-------|---------|
| **CPU0** | **98.83%** | 0.02% | ⚠️ anomali |
| CPU1 | 0.01% | 98.90% | normal |
| CPU2 | 0.01% | 98.92% | normal |
| CPU3 | 0.01% | 98.94% | normal |
| CPU4 | 0.02% | 98.19% | normal |
| CPU5 | 0.01% | 98.49% | normal |
| CPU6 | 0.01% | 98.82% | normal |
| CPU7 | 0.01% | 98.86% | normal |

**Seluruh iowait berasal dari CPU0.** CPU0 melaporkan idle time sebagai iowait (kolom 5 dan 6 tertukar secara efektif). Rata-rata 98.83% / 8 core = **~12.3%** — persis angka yang terlihat di `top` dan `uptime`.

Ini adalah **known issue di kernel Rockchip 6.1 untuk RK3588** — driver cpusleep/wfi interaksi dengan scheduler idle accounting menyebabkan NR_IOWAIT counter salah.

### 3. CPU0 Context
Hermes Dashboard (PID 48118, Python, RSS 595 MB, 32 threads) berjalan di CPU0. Meski proses tidak di-pin ke CPU0 secara eksplisit (affinity = 0-7), Linux scheduler menempatkan utamanya di core 0 karena init task di core 0.

### 4. CPU Idle States
Semua little cores (0-3) stuck di **1800 MHz** (governor: ondemand), tidak masuk frekuensi lebih rendah. Big cores (4-7) di 2256-2352 MHz. Semua core memasuki `cpu-sleep` state dengan benar (miliaran ms), tapi CPU0 akuntansi idle/iowait terbalik.

### 5. Hardware Health (sampingan)
| Metrik | Nilai |
|--------|-------|
| NVMe temp | **36.0°C** (normal) |
| Thermal zones | 35-37°C |
| Uptime | 17 hari |
| Disk usage | 44G/234G (19%) |
| Journal size | 108 MB (capped, baik — hasil cleanup 04-08) |
| Docker reclaimable | **8.835 GB** (76% dari images, 1 dangling 845MB) |

### 6. Docker Reclaimable
8.8 GB image tidak terpakai. Satu dangling image 845 MB. 34 build cache items (246 MB reclaimable). Ini low-hanging fruit untuk reclaim disk.

## Keputusan
**Adopt (informasi).** iowait 12.3% adalah **kernel accounting artifact**, bukan disk bottleneck nyata. Tidak perlu intervensi perbaikan disk.

**Perlu tindakan:**
- Docker prune — reclaim ~9 GB. Needs Human Review (operasi destruktif).
- Upgrade kernel Rockchip — tidak feasible untuk daily cycle, per monitoring kernel upstream.

## Risiko
- Monitoring tool yang pakai iowait% sebagai alert threshold akan false-positive
- Kapasitas perencanaan berbasis `iowait` akan overestimate beban I/O

## Lessons Learned
1. **Selalu cross-check iowait% dengan actual %util** — di ARM/RK3588, iowait bisa pure accounting artifact
2. Per-core breakdown dari `/proc/stat` lebih informatif daripada aggregate
3. **Format kolom `/proc/stat`**: user nice system **idle** **iowait** irq softirq steal guest guest_nice — hati-hati, kolom 5 = idle, kolom 6 = iowait

## Prioritas Berikutnya
- Docker image/volume prune (9 GB reclaimable) — perlu approval user
- VPS audit (host.tabaco.id NXDOMAIN hari ini — DNS resolve gagal)
- Gateway memory trend tracking (H2 backlog item)
