# Daily Report 2026-08-07

## Engineering Question
Seberapa sehat NVMe KZ256 di Orange Pi, dan apakah perlu tindakan mitigasi?

## Method
Install `nvme-cli`, ambil SMART log dan controller ID, hitung lifetime metrics.

## Findings

| Metric | Value |
|---|---|
| Model | KZ256 (firmware T0709A3, VID 0x126f) |
| Capacity | 238.5 GB |
| Total Written | 692.7 GB (0.69 TB) |
| Power-on Hours | 5,886 h (245 days, 0.67 yr) |
| Power Cycles | 99 |
| **Unsafe Shutdowns** | **98** (98.9% of cycles) |
| Percentage Used | 0% |
| Available Spare | 100% |
| Media Errors | 0 |
| Temperature | 45°C (normal, no thermal throttling) |
| Critical Warning | 0 |

**Key finding: 98/99 unsafe shutdowns.** Ini artinya hampir setiap power cycle adalah hard power cut — bukan graceful shutdown. Kemungkinan besar karena frequent power outages tanpa UPS, atau kernel crash.

Wear leveling: 0% used, 100% spare remaining. NVMe ini masih sangat sehat dari sisi endurance. 692 GB written dalam 245 hari = ~2.8 GB/hari, sangat ringan untuk 256GB SSD (typical warranty 150-300 TBW).

Temperature 45°C normal untuk RK3588 SBC, well below throttling threshold.

## Decision
Adopt — nvme-cli installed, baseline captured. No mitigation needed for NVMe health itself.

**Follow-up needed: 98% unsafe shutdown rate.** Ini risk nyata untuk data corruption, bukan hardware wear. Opsi mitigasi:
- UPS untuk graceful shutdown
- systemd service yang fsync + sync pada shutdown signal
- Investigasi apakah 98 shutdowns memang power outage atau kernel issue

## Risk
- Unsafe shutdown rate tinggi bisa menyebabkan filesystem corruption walau NVMe wear-nya nol
- Jika power outages sering, journal replay ext4/f2fs bisa failed consistency check

## Lessons Learned
- NVMe SMART accessible via nvme-cli, package kecil (~1MB), worth install di semua SBC
- KZ256 (KingSpec/Netac budget NVMe) tidak expose TBW warranty di controller ID — perlu cek spesifikasi manual
- `data_units_written` di NVMe spec pakai 1000x512 byte, bukan 1024

## Next Priority
- Investigasi unsafe shutdown pattern: cek `journalctl -b -1` untuk reboot history, bedain power loss vs kernel panic
- Pertimbangkan UPS atau power-loss protection script
- Setup periodic SMART snapshot (1x/minggu) untuk trend tracking
