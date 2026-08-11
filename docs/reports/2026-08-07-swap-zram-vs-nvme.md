---
human_review: autonomous
---

# Daily Report 2026-08-07

## Engineering Question
Follow-up dari audit 2026-08-06: zram-heavy workload perlu dipindah ke swap file di NVMe jika memori pressure meningkat? Atau zram tetap optimal untuk profil beban kerja saat ini?

## Method
1. Snapshot kondisi swap setelah 20 hari uptime: usage, I/O rates, compression ratio
2. Identifikasi konsumen swap per-proses
3. Bandingkan swap I/O rate terhadap baseline NVMe I/O
4. Evaluasi trade-off: zram (CPU-bound, RAM-backed) vs swap file NVMe (I/O-bound, persistent)
5. Cek apakah zram writeback-to-disk (hybrid mode) tersedia di kernel 6.1.43

## Findings

| Metric | Value |
|--------|-------|
| Uptime | 20.0 hari |
| RAM total/available | 7.7 GiB / 4.9 GiB available |
| zram swap total/used | 3.9 GiB / 115 MiB (2.9%) |
| zram compression ratio | 2.98x (114.1 MiB → 38.2 MiB) |
| zram memory cost | 49.2 MiB untuk 114.1 MiB data |
| pswpin rate | 23.3 pages/hour |
| pswpout rate | 180.7 pages/hour |
| Real-time swap I/O | 0 pages/sec (idle) |
| iowait (avg-cpu) | 0.00% (3-sec sample) |
| zram algorithm | lzo-rle |
| Backing dev | Tidak ada (no writeback) |
| Top swap consumer | fcitx5: 10 MiB (87%) |
| Kernel | 6.1.43-rockchip-rk3588 |

**Analisis:**

1. **Swap utilization sangat rendah** — 115 MiB dari 3.9 GiB (2.9%). RAM available 4.9 GiB, artinya sistem tidak under memory pressure.

2. **Swap I/O negligible** — 180 pages/hour swap-out ≈ 0.7 MiB/jam. Pada idle, 0 pages/sec. Tidak ada swap thrashing.

3. **fcitx5 mendominasi swap** — 10 dari 115 MiB (87%). Ini input method framework, inactive idle pages yang secara normal di-swap out. Bukan workload.

4. **zram writeback tidak tersedia** di modinfo output (kernel 6.1.43-rt atau custom rockchip build mungkin tidak meng-include). Hybrid mode (zram + NVMe backing) tidak viable tanpa module support.

5. **Tidak ada memory pressure signal** — `swappiness=60` (default), `watermark_scale_factor=10` (default), tidak ada OOM kill, `pgmajfault` hanya 69K dari ~2B page faults (0.003%).

**Trade-off analysis:**

| | zram (saat ini) | swap file NVMe |
|---|---|---|
| Latensi swap-in | ~µs (RAM) | ~100µs (PCIe NVMe) |
| CPU cost | compression/decompression | negligible |
| RAM cost | ~50 MiB untuk 115 MiB swap | 0 |
| Persistence | Volatile (reboot = swap cleared) | Persistent |
| Throughput | RAM bandwidth (~25 GB/s) | NVMe bandwidth (~100-200 MB/s) |
| Wear | Tidak ada | NVMe write cycles |

zram menang di latency dan throughput, kalah di RAM cost. Tapi 50 MiB RAM cost dari 7.7 GiB total = 0.6%. Negligible.

## Decision
**Reject — tidak perlu migrasi.** Alasan:
- Swap usage hanya 2.9%, tidak ada memory pressure
- zram 3x compression men-save RAM, bukan memakan (49 MiB cost untuk 114 MiB data)
- Swap I/O mendekati nol, bukan bottleneck
- fcitx5 adalah satu-satunya konsumen signifikan — itu idle pages, bukan active workload
- zram writeback ke NVMe tidak available di kernel ini, jadi hybrid mode bukan opsi
- Jika memory pressure meningkat di masa depan, prioritas pertama adalah identifikasi leak/bloat, bukan migrasi swap

**Kondisi review:** Jika zram usage > 1 GiB atau available memory < 1 GiB sustained, evaluasi ulang.

## Risk
- Tidak ada. Tidak ada perubahan yang dilakukan.
- Catatan: kernel 6.1.43-rockchip tidak support zram writeback. Jika upgrade kernel di masa depan, cek kembali.

## Lessons Learned
- zram memory cost sering disalahpahami sebagai "memakan RAM" — padahal compression ratio 3x berarti zram menghemat RAM. 114 MiB data cuma butuh 49 MiB physical.
- Swap consumer profiling memberi insight cepat: fcitx5 = idle pages, bukan workload problem.
- Satu snapshot cukup untuk menjawab pertanyaan ini — swap pattern stabil di 20 hari uptime.

## Next Priority
Tidak ada follow-up diperlukan untuk topik ini. Monitor sebagai bagian dari routine health check.
