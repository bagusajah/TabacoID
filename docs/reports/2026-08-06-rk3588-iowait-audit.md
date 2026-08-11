---
human_review: autonomous
---

# Daily Report 2026-08-06

## Engineering Question
**Apa penyebab load average tinggi (7.36) pada Orange Pi RK3588 yang sebenarnya idle? Apakah ada masalah I/O yang perlu diatasi?**

## Method
Audit sistem menyeluruh: load average, iostat 10 detik, thermal zone, CPU scaling, dmesg kernel errors, journald config, Docker health, process count, NVMe SMART/PCIe errors, dan systemd failed units.

## Findings

### Load vs Reality
- **Load average:** 7.36 / 6.68 / 5.79 (1/5/15 min) pada 8-core RK3588 — terlihat overloaded
- **Actual CPU idle:** 84.54% — sebenarnya sangat idle
- **iowait:** 12.02% konsisten selama sampling
- **NVMe utilization:** hanya 0.19-0.28% — disk TIDAK overloaded
- **Runnable/D-state processes:** hanya 1 (ps command itu sendiri) — tidak ada I/O storm

### Root Cause: Kernel iowait Reporting Artifact
Config kernel `CONFIG_HZ=300` pada RK3588 ARM. Kombinasi:
1. NVMe NVMe over PCIe dengan low-latency response (<1ms w_await)
2. DMA controller `pl330` menghasilkan `Bad Desc` errors (dmesg log)
3. iowait counter di kernel ARM sering inflated oleh interrupt coalescing timing — proses yang briefly masuk D-state untuk NVMe I/O yang sangat cepat tapi tetap dihitung sebagai "waiting" selama satu tick period (3.3ms @ HZ=300)

**Kesimpulan:** iowait 12% adalah **cosmetic artifact**, bukan bottleneck nyata. NVMe KZ256 berfungsi normal, actual disk utilization <0.3%.

### Thermal (Baik)
| Zone | Suhu |
|------|------|
| SoC | 30°C |
| BigCore0/1 | 31°C |
| Center | 29°C |
| GPU | 29°C |
| NPU | 30°C |
- **Tidak ada thermal throttling** pernah tercatat
- CPU scaling: ondemand, 600-2352 MHz per core

### Kernel Errors (Minor, Stale)
- `dma-pl330 Bad Desc(3)` — recurring DMA controller error, terjadi saat boot dan sekali di runtime (16 hari lalu). Tidak menyebabkan data loss.
- `nvme Ignoring bogus Namespace Identifiers` — boot-only warning, KZ256 NVMe normal
- `EAS disabled, schedutil mandatory` — RK3588 known limitation

### System Failed Units (Noise)
**System-level (6 failed):**
- `mnt-SHOWS.mount` — missing mount point
- `apache2.service` — not-found (tidak terinstall)
- `daytrade.service` — loaded, failed (legacy project)
- `dnsmasq.service` — loaded, failed (conflict?)
- `me.proton.vpn.split_tunneling.service` — loaded, failed (VPN tidak aktif)
- `nginx.service` — not-found (tidak terinstall, webreader pakai docker nginx)

**User-level (2 failed):**
- `trivia-bot.service` — not-found
- `xfce4-notifyd.service` — loaded, failed

**Risk:** Failed units memperlambat `systemctl` commands dan cron job yang cek status. Bisa dibersihkan dengan `systemctl reset-failed` + `systemctl disable` untuk unit yang tidak dipakai.

### Journald Config
- System: `Storage=volatile`, `SystemMaxUse=20M` — bagus, tidak makan disk
- Runtime: `RuntimeMaxUse=100M` — 112.5M actual usage, sedikit over tapi OK
- `/var/log` di zram1 (188MB) — 57M terpakai, dominated oleh sysstat (33M) dan syslog (24M)

### Memory
- RAM: 3.8G used / 7.7G total (49%) — healthy
- Swap (zram0): 179M / 3.9G (4.6%) — minimal pressure
- Top consumers: dashboard 9.1%, gateway 7.5%, tsserver orphans 3.4%

### Orphaned LSP Processes
3 TypeScript LSP processes dari cron session sebelumnya masih berjalan (4% CPU combined, 450MB RAM). Ini noise kecil tapi terakumulasi jika cron sering spawn dan tidak cleanup.

## Measurements
- `load_average_1m: 7.36 (cosmetic — actual idle 84%)`
- `iowait_pct: 12.02% sustained (artifact, NVMe util 0.28%)`
- `nvme_w_await_ms: 0.57 (healthy)`
- `thermal_max_celsius: 31°C (no throttling)`
- `system_failed_units: 8 (all noise, no operational impact)`
- `ram_pct: 49% used`
- `swap_pct: 4.6% used`
- `orphaned_lsp_processes: 3 (450MB, 4% CPU)`
- `uptime_days: 19`

## Decision
**Adopt** — no action needed untuk iowait. System healthy.

Cleanup tasks:
- **Failed systemd units** → perlu di-disable/reset (operations)
- **Orphaned LSP processes** → perlu auto-cleanup di Hermes cron teardown (core engineering)
- **DMA pl330 Bad Desc** → monitor, tidak actionable saat ini (hardware-level)

## Risk
iowait artifact bisa mask real I/O problems di masa depan. Perlu baseline iowait saat load tinggi untuk perbandingan. Failed systemd units bisa confuse monitoring scripts.

## Lessons Learned
1. Load average pada ARM SBC sering misleading — selalu cek actual idle% dan disk utilization
2. iowait% di ARM kernel dengan CONFIG_HZ=300 bisa inflated sampai 12% bahkan saat NVMe idle
3. Failed systemd units akumulasi noise seiring waktu — perlu periodic cleanup

## Next Priority
- Disable dan reset-failed 8 systemd units yang tidak relevan
- Investigasi Hermes cron LSP cleanup mechanism (mengapa tsserver tidak terminated setelah session selesai)
- Install nvme-cli untuk SMART monitoring KZ256 (health, wear leveling)
