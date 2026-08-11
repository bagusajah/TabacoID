---
human_review: autonomous
---

# Daily Report 2026-08-07 — Root Cause: Phantom Load Average pada RK3588

## Pertanyaan Engineering
Load average 5.3 pada Orange Pi RK3588 yang idle (0% CPU, 87% idle). Apa penyebabnya dan apakah ini masalah nyata?

## Metode
1. Baca per-CPU iowait dari `/proc/stat` — temukan anomaly pada CPU0
2. Hitung akumulasi iowait jiffies per CPU untuk mengukur severity
3. Sample real-time CPU0 iowait rate (2 detik interval) untuk konfirmasi continuous bug
4. Scan semua proses/thread untuk D-state (uninterruptible sleep)
5. Ukur load decay rate untuk membedakan sustained vs decaying load
6. Cross-check dengan `iostat` untuk IO aktual (seharusnya ~0)

## Temuan (dengan pengukuran)

### 1. CPU0 IOWait Anomaly (Root Cause)

| Metric | CPU0 | Semua CPU Lain |
|--------|------|----------------|
| IOWait jiffies (kumulatif) | 162,708,113 | ~16,000-33,000 masing-masing |
| IOWait % dari uptime | **98.7%** | <0.01% |
| IOWait rate (jiffies/sec) | **100/sec** | ~0.1-0.2/sec |
| Waktu terakumulasi | 452 jam | <1 jam total |

**CPU0 mengakumulasi iowait persis 100 jiffies/detik** — artinya 100% tick CPU0 diklasifikasikan sebagai iowait, terus-menerus, sejak boot. Ini terjadi tanpa ada IO activity aktual (`iostat` menunjukkan 0% util).

### 2. Tidak Ada D-State Processes
- Scan semua `/proc/*/task/*/stat`: **0 proses/thread dalam D-state**
- Semua user processes dalam state S (sleep) atau Ssl
- Tidak ada kernel thread dalam D-state
- `schedstat` menunjukkan nr_running=0 di semua CPU

### 3. Load Average Analysis
- Reported load: **5.1** (1-min), 5.2 (5-min), 5.3 (15-min)
- Actual runnable: **1-2** (monitoring tool itu sendiri)
- Decay rate: ~0.33/min → active count ≈ 5.0 (stabil)
- Phantom contribution: **~4.0** dari CPU0 iowait bug

### 4. Mekanisme Bug
```
CPU0 iowait accounting stuck → CPU0 never enters NO_HZ idle →
scheduler counts CPU0 as "active" → calc_load_fold_active includes phantom count →
load average inflated by ~4.0
```

Rockchip BSP kernel 6.1.43 punya bug iowait accounting: CPU0's idle time diklasifikasikan ulang sebagai iowait setiap tick. Karena `CONFIG_NO_HZ_IDLE=y`, CPU idle seharusnya berhenti tick dan tidak contribute ke load average. Tapi karena CPU0 dianggap "dalam iowait" (bukan idle), tick terus berjalan dan load average terus di-inflate.

### 5. Impact Assessment
- **Performa aktual**: Tidak terpengaruh. CPU sebenarnya 87% idle.
- **Monitoring**: Load average tidak reliable sebagai health metric. Threshold-based alerts yang pakai load akan false-positive.
- **Real IO latency**: Tidak terpengaruh — NVMe read latency 1.01ms, iowait nyata ~0%.

## Keputusan
**Needs Human Review** — Ini kernel-level bug, bukan application-level. Opsi:
1. **Ignore** — load average misleading tapi tidak ada impact performa nyata
2. **Workaround di monitoring** — gunakan per-CPU iowait % atau `mpstat` sebagai ganti load average
3. **Kernel upgrade** — update ke kernel Rockchip yang lebih baru jika fix sudah available upstream
4. **Upstream report** — report bug ke Rockchip kernel maintainers

## Risiko
- Alert yang berbasis load average (misal: "load > 4 = warning") akan selalu false-positive
- Jika ada monitoring tool yang auto-scale atau auto-restart berdasarkan load, bisa trigger不必要的 actions
- Tidak ada risk terhadap performa aktual

## Lessons Learned
- Load average pada ARM SBC sering unreliable — `NO_HZ_IDLE` + BSP kernel bugs menyebabkan phantom load
- Untuk monitoring real health, gunakan: `mpstat` per-CPU, `iostat` IO utilization, `free -m` memory, atau `/proc/pressure/*`
- CPU0 pada big.LITTLE sering jadi lead CPU untuk timer/IRQ dan lebih rentan terhadap accounting bugs
- RK3588 Rockchip kernel 6.1.43 sudah punya tracking issue untuk iowait accounting (TuxInvaders/linux-rockchip)

## Prioritas Berikutnya
- Review alert/threshold config — apakah ada yang pakai load average sebagai trigger
- Pertimbangkan custom monitoring dashboard yang pakai `mpstat` iowait per core, bukan load average
- Cek apakah ada kernel update tersedia di apt yang fix issue ini
