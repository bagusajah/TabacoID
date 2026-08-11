---
task_id: t_b0d6602a
objective: OBJ-002
date: 2026-08-10
status: draft
human_review: autonomous
---

# APT Pending Updates: 45 Upgradable, 0 Applicable — All ABI-Locked

## Engineering Question
38 security-labeled update menunggu (task body bilang 38, real count 45 total upgradable). Apakah ini paket-paket ABI-locked yang sama dari task sebelumnya (`t_538a6ef9`), atau ada paket baru yang applicable dan bisa di-upgrade?

## Method
1. `apt list --upgradable` — kategorisasi 45 paket by family (ffmpeg/libav, gstreamer, xserver, v4l/media utils)
2. Bandingkan version "to" vs "from" untuk identifikasi genuine version bumps vs suite-reassignment artifacts (same version, different suite label)
3. Cross-reference dengan `apt-mark showhold` — overlap analysis: mana upgradable yang juga held?
4. `apt-get upgrade --dry-run` — konfirmasi apa yang apt akan lakukan jika dijalankan
5. `comm -23` untuk cari paket upgradable tapi NOT held (candidates for actual upgrade)

## Findings (with measurements)

**Key metric: `upgradable_not_held: 0`** — tidak ada satu pun paket yang available untuk upgrade tanpa melepas hold.

| Metric | Value |
|--------|-------|
| total_upgradable | 45 |
| apt-mark showhold | 81 |
| upgradable AND held | 45 (100%) |
| upgradable NOT held | **0** |
| `apt-get upgrade --dry-run` result | **0 upgraded, 0 newly installed, 45 kept back** |
| security-labeled (jammy-security) | 38 |
| non-security (jammy only) | 7 |

**Breakdown by family (all held):**

| Family | Count | Status |
|--------|-------|--------|
| FFmpeg/libav (libavcodec, libavformat, libswscale, etc.) | 16 | Held — Rockchip VPU/MPP ABI lock |
| GStreamer (plugins, core, dev) | 17 | Held — Rockchip media framework |
| X server (xorg-core, dev, legacy, common) | 4 | Held — display/GPU driver dependency |
| V4L/media utils (libv4l, v4l-utils, libdvbv5, mpv, wiringpi) | 7 | Held — hardware I/O layer |

**Version artifact analysis:**
- 22 dari 45 paket menunjukkan version "to" == version "from" — ini **suite-reassignment artifacts** (paket pindah dari `jammy` ke `jammy-security,jammy-updates` repo label tanpa version change). apt tetap menandainya "upgradable" karena suite string berubah.
- 23 paket punya genuine version bump:
  - X server: `2:21.1.4-2ubuntu1.7~22.04.1` → `.16` (security patch)
  - GStreamer: `1.20.3-0ubuntu1` → `-0ubuntu1.1` / `-0ubuntu1.7` (security patches)
  - wiringpi: `2.46` → `2.50-0ubuntu2`
  - Semua tetap held karena dependency chain ke Rockchip vendor overlay.

**Cross-reference dengan task `t_538a6ef9`:** Identical package set. Tidak ada paket baru yang masuk ke held list sejak audit sebelumnya. Backlog stabil.

**System health (no action taken, baseline check):**
- uptime: 2 days 7h, load avg 1.41
- Docker: webreader-api + webreader-nginx both healthy (14h uptime)
- Memory/disk: unchanged from baseline

## Decision
**No action needed.** Semua 45 upgradable packages adalah ABI-locked Rockchip vendor overlay packages yang sengaja di-held di task `t_538a6ef9`. `apt-get upgrade` tidak akan mengubah apa pun (0 upgraded, 45 kept back). Backlog ini adalah **known constraint**, bukan technical debt yang bisa di-resolve tanpa melepas hardware acceleration.

X server security patches (.1 → .16) adalah satu-satunya kategori dengan genuine CVE risk, tapi tetap held karena dependency chain ke `libmali-valhall-g610` (GPU driver). Melepas hold berarti risk ke display output.

## Risk
- **Low:** Media codec CVEs (ffmpeg/gstreamer) tidak di-patch, tapi packages ini tidak exposed ke internet (headless server, tidak ada media processing service public-facing)
- **Medium-low:** X server security patch deferred — tapi display hanya untuk local debug, bukan production service
- **Stable:** Backlog tidak growing — 0 paket baru sejak last audit

## Lessons Learned
- `apt list --upgradable` menampilkan paket yang **suite-reassigned** meskipun version tidak berubah (22 dari 45). Ini misleading — harus selalu compare version string, bukan rely on count.
- apt-mark hold bekerja sebagai intended: 81 paket held, 45 di antaranya tetap muncul di upgradable list tapi apt menolak upgrade (dry run confirms 0 upgraded)
- Vendor overlay lock di Orange Pi RK3588 adalah permanent constraint, bukan temporary tech debt. Harus di-document sebagai architectural decision, bukan di-track sebagai recurring task.

## Next Priority
- **Unhold candidate experiment:** Test apakah X server 4 packages (`xserver-xorg-*`) bisa di-unhold dan upgrade tanpa break `libmali-valhall-g610`. Ini satu-satunya kategori dengan genuine security version bump. Low-risk karena headless server.
- **Stop re-auditing** this package set setiap cycle — sudah confirmed stable 2 cycles. Tandai sebagai architectural constraint di docs.
- Monitor: re-check dalam 2 minggu, bukan setiap cycle.
