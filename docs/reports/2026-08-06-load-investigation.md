# Daily Report 2026-08-06 — Load Investigation: "RK3588 Overloaded?"

## Pertanyaan Engineering
Report 2026-08-06-dashboard-reliability menyebut "load 4.20 pada 4-core RK3588 — overloaded". Apakah benar sistem ini overloaded, atau ada kesalahan identifikasi?

## Metode
1. Verifikasi core count aktual (`lscpu`, `/proc/cpuinfo`)
2. Cross-check load average vs core count
3. Analisis load distribution per-core (sar -P ALL)
4. Run queue depth analysis (`sar -q`)
5. Iowait breakdown (sudah diteliti di report 2026-08-05-iowait-forensics)
6. Hermes memory growth trend (memory-baseline.log 16h)

## Temuan (dengan pengukuran)

### 1. Core Count: BUKAN 4-Core, 8-Core

| Metrik | Nilai |
|--------|-------|
| Laporan sebelumnya | "4-core RK3588" ❌ |
| Core aktual | **8 core** (4x Cortex-A76 @ 2.35 GHz + 4x Cortex-A55 @ 1.8 GHz) ✅ |
| Sumber | `lscpu`, `/proc/cpuinfo` |

`nproc` = 8, `/proc/cpuinfo` menunjukkan processor 0-7.

### 2. Load Average: TIDAK Overloaded

| Metrik | Nilai |
|--------|-------|
| Load 1m/5m/15m | **3.14 / 3.33 / 3.32** |
| Core count | 8 |
| Load per core | **~0.39** (normal) |
| Run queue (runq-sz) | **0-1** (hampir selalu 0) |
| Blocked tasks | 1 (konstan, scheduler artifact) |

Load average 3.14 di 8 core = **39% theoretical capacity**. Run queue kosong berarti tidak ada process yang menunggu CPU. Sistem ini **underutilized**, bukan overloaded.

### 3. Load History (sar -q hari ini)

| Periode | ldavg-1 | ldavg-5 | ldavg-15 |
|---------|---------|---------|----------|
| Rata-rata hari ini | **3.26** | 3.25 | 3.25 |
| Range | 3.05 – 3.61 | 3.12 – 3.38 | 3.16 – 3.35 |
| Std dev | ~0.15 | — | — |

Load sangat stabil — fluktuasi <10% sepanjang hari. Tidak ada spike, tidak ada trend naik.

### 4. Per-Core CPU Utilization (saat ini)

| Core | Type | %idle | %user | %iowait |
|------|------|-------|-------|---------|
| CPU0 | A55 | 98% | 1.4% | ~0%* |
| CPU1 | A55 | 98.8% | 0% | 0% |
| CPU2 | A55 | 98.8% | 0% | 0% |
| CPU3 | A55 | 98.9% | 0% | 0% |
| CPU4 | A76 | 98.1% | 0% | 0% |
| CPU5 | A76 | 98.4% | 0% | 0% |
| CPU6 | A76 | 98.7% | 0% | 0% |
| CPU7 | A76 | 98.8% | 0% | 0% |

*CPU0 iowait di sar realtime ~0%, tapi cumulative /proc/stat menunjukkan 98% iowait (sudah diinvestigasi di 2026-08-05-iowait-forensics — kernel accounting bug).

Semua core ~99% idle. Tidak ada core yang saturated.

### 5. Hermes Memory Growth (16 jam)

| Proses | 05:00 WIB | 21:00 WIB | Growth | Rate |
|--------|-----------|-----------|--------|------|
| Dashboard (Python main, PID 48118) | 666 MB | 710 MB | +44 MB | **2.75 MB/h** |
| Subprocess (Python TUI, PID 1973422) | 384 MB | 607 MB | +223 MB | **13.9 MB/h** |
| Total Hermes | 1.05 GB | 1.32 GB | +267 MB | **16.7 MB/h** |

Subprocess (Node TUI entry) growth rate signifikan — 13.9 MB/hour. Dashboard growth lebih modest. Total system memory: 3.4G used / 7.7G (44%), masih plenty of headroom.

### 6. System Resources

| Metrik | Nilai | Status |
|--------|-------|--------|
| Memory available | 3.9 GB | ✅ healthy |
| Swap used | 179 MB / 3.9 GB | ✅ minimal |
| Disk / | 45G / 234G (20%) | ✅ healthy |
| NVMe %util | <1% | ✅ idle |
| Dashboard uptime | 3 hari | ✅ stable |
| Gateway uptime | 2 hari | ✅ stable |
| Docker containers | 2/2 healthy | ✅ |
| Journal errors 24h | 0 | ✅ |

## Keputusan
**Adopt (correction).** Premis "4-core overloaded" adalah **salah**. RK3588 ini 8-core (4 A76 + 4 A55), load 3.1 = underutilized. Run queue kosong, semua core ~99% idle.

Investigasi ini membuktikan bahwa **monitoring alert di report sebelumnya adalah false positive** — disebabkan oleh kesalahan identifikasi core count (4 vs 8).

**Memory growth perlu diperhatikan:** Subprocess Hermes tumbuh ~14 MB/jam. Dalam 3 hari bisa mencapai ~1.2 GB growth (dari 384 MB baseline). Ini belum kritis (memory available 3.9 GB) tapi trendnya perlu di-monitor.

## Risiko
- Report sebelumnya membuat kesimpulan "overloaded" yang salah — ini bisa menyebabkan overprovisioning atau panik tidak perlu
- Memory growth trend subprocess belum ada root cause — bisa jadi Node.js GC pattern atau memory leak

## Lessons Learned
1. **Selalu verifikasi `nproc`/`lscpu` sebelum menyimpulkan overload** — load average tanpa core count adalah angka tanpa konteks
2. Load average yang "looks high" (3.x) bisa jadi normal di 8-core — bandingkan dengan core count, bukan insting
3. Run queue depth (`sar -q` runq-sz) lebih reliable daripada load average untuk判断 saturation

## Prioritas Berikutnya
- Investigasi memory growth rate subprocess Hermes — apakah Node.js GC atau genuine leak
- Cek Docker reclaimable (9 GB dari report kemarin — belum di-prune)
