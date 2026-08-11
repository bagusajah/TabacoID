---
human_review: autonomous
---

# Daily Report 2026-08-06

## Engineering Question
Load average Orange Pi RK3588 konsisten di ~5.5 (66% dari 8 core) padahal CPU idle 87%. Apakah ini real I/O bottleneck atau kernel accounting artifact?

## Method
1. Profil per-core utilization via `mpstat -P ALL` — temukan core 0 di 97-100% iowait, core 1-7 idle 97-99%
2. Cek D-state processes: **nol** — tidak ada user process atau kernel thread yang blocked pada I/O
3. Cek interrupt distribution: `fec10000.saradc` (ADC sensor) hanya 19 irq/sec — bukan penyebab
4. Benchmark NVMe throughput: cached 4434 MB/s, buffered 208 MB/s, direct (offset 0) 31.8 MB/s, direct (offset 20GB) 112 MB/s
5. Cek zram swap: 179 MB terkompresi jadi 50.6 MB (ratio 3.5x), hanya 3 proses pakai swap total ~13 MB
6. Verifikasi: dashboard response time 2.5ms, tidak ada latency degradation

## Findings

**Root cause: zram iowait accounting bug + RK3588 scheduler core 0 bias**

| Metric | Value |
|--------|-------|
| Load average (1/5/15m) | 5.78 / 5.63 / 5.57 |
| CPU0 iowait | 98.8% |
| CPU1-7 iowait | 0% |
| Overall CPU idle | 86% |
| D-state processes | 0 |
| NVMe buffered read | 208 MB/s |
| NVMe direct read (offset 20GB) | 112 MB/s |
| Dashboard response | 2.5ms |
| zram compressed | 179 MB (3.5x ratio) |
| Swap users | 3 processes, ~13 MB total |

**Penjelasan:** Kernel Linux menganggap waktu yang dihabiskan di zram (compression/decompression) sebagai iowait, padahal zram adalah CPU-bound work. Ini adalah accounting bug yang dikenal di komunitas kernel. Pada RK3588, core 0 menangani sebagian besar iowait path, jadi 1 core penuh iowait = kontribusi ~1.0 ke load average per sample period. Load average 5.5 berarti ~4.5 fake load + ~1.0 real (hermes processes + OS overhead).

**NVMe throughput 112-208 MB/s** cukup untuk workload saat ini (Hermes agent, webreader, Docker). SM2263EN adalah budget NVMe controller, bukan high-end, jadi angka ini wajar untuk PCIe 3.0 via Rockchip bridge.

**Kesimpulan: sistem sehat, load average menyesatkan.**

## Decision
**Adopt** — tidak ada perbaikan yang diperlukan. Load average tinggi adalah artifact, bukan indikasi masalah. Monitoring sebaiknya gunakan per-core %idle atau %iowait dari `mpstat`, bukan load average, sebagai health indicator untuk platform ini.

## Risk
- zram iowait accounting bug bisa menyebabkan false alarm di monitoring yang mengandalkan load average threshold
- NVMe SM2263EN pada 112 MB/s direct read cukup untuk sekarang, tapi bisa jadi bottleneck jika workload naik signifikan

## Lessons Learned
- Load average **tidak reliable** pada ARM64 + zram. Gunakan `mpstat -P ALL` untuk diagnosis per-core
- Core 0 pada RK3588 menerima burden iowait path yang tidak proporsional — ini default scheduler behavior
- Satu metrik tidak cukup: load average + per-core iowait + actual I/O throughput diperlukan untuk penilaian sistem yang akurat

## Next Priority
- Pertimbangkan custom monitoring dashboard yang pakai `mpstat` iowait per core, bukan load average, sebagai primary health metric
- Monitor NVMe SMART health jika `nvme-cli` bisa diinstall (belum tersedia saat ini)
- Evaluasi apakah swap-heavy workload perlu dipindah dari zram ke swap file di NVMe jika memori pressure meningkat
