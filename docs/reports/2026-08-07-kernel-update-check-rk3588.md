---
task_id: t_LDKERN01
objective: OBJ-002
date: 2026-08-07
status: draft
human_review: approved
---

# Cek Kernel Update RK3588 untuk Fix Iowait Accounting Bug

## Engineering Question
Apakah ada update kernel RK3588 (lebih baru dari 6.1.43 / build 1.1.8) tersedia
via apt yang akan fix iowait accounting bug yang menyebabkan loadavg/iowait
terlihat tinggi di monitoring?

## Method
1. Inspeksi versi kernel terinstall (`uname`, `dpkg -s`).
2. Cek kandidat update via `apt-cache policy` dan `apt list --upgradable`.
3. Cek repo Orange Pi terkonfigurasi di `/etc/apt/sources.list*`.
4. Ukur iowait real-time (sampling delta 1s) vs kumulatif `/proc/stat` untuk
   konfirmasi bug ada di kernel ini.

## Findings (with measurements)

**Kernel terinstall:**
- `6.1.43-rockchip-rk3588` (build `1.1.8`, source `linux-6.1.43-rockchip-rk3588`)
- Maintainer: `Orange Pi <leeboby@aliyun.com>`
- Uptime: 20 hari

**Update availability:**
- `apt-cache policy linux-image-current-rockchip-rk3588`:
  - Installed: `1.1.8` | Candidate: `1.1.8` → **tidak ada update**
- `apt list --upgradable | grep -iE "linux|kernel|rockchip"`: **kosong**
- Tidak ada repo Orange Pi / Armbian / Rockchip di `sources.list.d` (hanya
  huaweicloud ubuntu-ports jammy + app/docker/nginx/tailscale pihak ketiga).
- Kernel OPI dirilis sebagai `.deb` lokal tanpa repo online → update manual
  wajib flashing image Orange Pi 5 lebih baru.

**Konfirmasi iowait accounting bug:**
- iowait real-time (delta 1s dari `/proc/stat`): **0.00%**
- `vmstat 1 3` live: `wa` kolom = 0, 0, 0
- iowait kumulatif total CPU: **12.27%** (169,784,989 jiffies)
- iowait kumulatif per-CPU: **cpu0 = 98.04%**, cpu1–cpu7 = 0.01–0.02%
- → Angka kumulatif iowait **tidak valid** untuk monitoring; metric inflate
  terjadi pada cpu0 akumulatif (snapshot sejak boot). Hanya sampling delta
  yang akurat.

**Paket Orange Pi terkunci (`apt-mark showhold`):**
- `camera-engine-rkaiq`, `gstreamer1.0-rockchip1*`, `librga*`,
  `librockchip-mpp*`, `libv4l-rkmpp`, `rktoolkit`, `rockchip-mpp-demos`,
  `wiringpi` — semua di-hold, update kernel via apt berisiko konflik
  dependensi dengan BSP ini.

## Decision
**Reject** (untuk path apt) — Tidak ada update kernel via apt yang tersedia
(build 1.1.8 = candidate tertinggi, repo OPI tidak dikonfigurasi). Upgrade
kernel manual via reflash image Orange Pi 5 yang lebih baru adalah opsi
tersedia namun high-risk (wajib re-flash eMMC/SD, hold 9 paket BSP akan
konflik, downtime host, belum ada konfirmasi fix accounting bug di build
OPI yang lebih baru).

**Workaround operasional yang sudah terbukti:** monitoring iowait di host ini
**wajib pakai delta sampling** (e.g. `vmstat 1`, `/proc/stat` diff), BUKAN
cumulative counter. Alert berbasis cumulative iowait akan false-positive.

## Risk
- **Low** untuk status quo (kernel lama, tapi stabil 20 hari uptime, iowait
  real-time 0%). Bug hanya cosmetik di metric, bukan performance issue.
- **High** jika upgrade manual tanpa verifikasi image OPI baru benar-benar
  mengandung patch iowait accounting — risiko downtime & re-flash untuk
  perbaikan cosmetic.

## Lessons Learned
1. RK3588 kernel 6.1.43 (OPI build 1.1.8) memang punya bug iowait accounting
   — tetapi *manifestasinya hanya di cumulative counter cpu0*, bukan di
   actual scheduler behavior.
2. Monitoring host ini harus filter metric iowait cumulative; pakai
   rate-based (delta per interval).
3. Orange Pi 5 kernel = `.deb` lokal tanpa online repo → seluruh ekosistem
   paket BSP (1.1.8) terkunci, isolated dari upstream Ubuntu kernel.

## Next Priority
- **Follow-up:** Tambah catatan di konfigurasi monitoring (Grafana/alert
  rules) untuk ignore iowait cumulative di host ini, pakai derivative.
- **Watch:** Pantau rilis image Orange Pi 5 baru (build > 1.1.8) — jika ada
  changelog menyebut iowait/accounting/proc/stat fix, baru worth re-flash.
