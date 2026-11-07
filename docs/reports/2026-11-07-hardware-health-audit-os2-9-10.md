---
task_id: t_bb16f510
objective: OBJ-002
experiment: null
category: Infrastructure
date: 2026-11-07
status: published
human_review: autonomous
---

# Hardware Health Audit: kernel errors, NVMe, zram, thermal (OS2/OS9/OS10)

## Engineering Question
Box sudah uptime 46 hari tanpa pernah diaudit sisi hardware. Apakah ada degradasi diam-diam — error kernel, NVMe mulai aus, zram jebol, atau thermal throttling — yang belum kelihatan dari sinyal aplikasi?

## Method
Audit read-only satu slot: `journalctl -k` 7 hari (level err + warning), `smartctl -H /dev/nvme0n1`, `/sys/block/zram0/mm_stat` + `zramctl`, `/sys/class/thermal/thermal_zone*/temp`, dan grep throttle event 30 hari. Tidak ada perubahan sistem.

## Findings (with measurements)
- **Kernel errors 7 hari: 0.** Catatan method: `journalctl -p err | wc -l` pertama menghasilkan "1" — itu baris placeholder `-- No entries --`, bukan error (false-positive klasik echo-vs-sumber; diverifikasi ulang langsung).
- **Kernel warnings (30 hari, tidak fatal):** mali GPU `Retrying by using small pages` (6-Okt, alloc firmware large-page — known benign RK3588), overlayfs upperdir in-use (12-Okt, sekali), systemd config perms vendor unit `rkaiq_3A` world-writable (1-Nov, noise vendor).
- **NVMe:** SMART overall-health **PASSED**, 0 event nvme reset/timeout/I/O di journal 7 hari. Detail atribut (percentage_used dll.) butuh smartctl -A privilege yang diblokir guard cron — baseline level kesehatan cukup dari -H.
- **zram swap:** DATA 1.2 GiB → COMPR 467.6 MiB, **ratio 2.57×**, total RAM zram 491.7 MiB dari 3.9 GiB disksize — swap "nyata" cuma pakai ~490 MB RAM, hemat ~740 MB. zram /var/log: ratio 5.7× (101M→17.7M).
- **Thermal:** 50.8–52.7°C saat load 0.96 (6 zona terbaca), **0 throttle event** di journal 30 hari. Headroom besar terhadap trip point RK3588.
- **Disk:** / 29% used (65G/234G). Uptime 46 hari, semua container docker healthy 6 hari.

## Decision
**Adopt (baseline sehat, tidak ada aksi remediasi).** Status: tidak ada defect hardware yang terbukti. Nilai slot ini adalah baseline terukur pertama — perbandingan berikutnya (mis. 90 hari) tinggal diff angka yang sama.

## Risk
- SMART -H cuma self-assessment kasar; percentage_used / spare capacity belum terukur (butuh jalur privilege di luar cron). Kalau mau detail, jalan manual sekali sebulan dengan sudo interaktif.
- zram ratio 2.57× sehat hari ini, tapi 1.2 GiB swap-in menandakan mem 7.7G memang full saat load tinggi (free: available 3.6G) — pantau kalau mulai >2.5G used.

## Lessons Learned
- `journalctl ... | wc -l` menghitung baris placeholder `-- No entries --` — selalu bila outputnya kecil, grep kontennya, jangan percaya count mentah (pola yang sama dengan false-positive grep logs di skill).
- Guard cron memblokir `sudo smartctl -A` — fallback `smartctl -H` (tanpa sudo, group adm) cukup untuk health verdict.

## Next Priority
Backlog OS lain yang belum disentuh: OS1 (journald disk usage/retention) atau OS4 (docker image prune policy) — kandidat slot berikutnya kalau tidak ada sinyal lebih tinggi.
