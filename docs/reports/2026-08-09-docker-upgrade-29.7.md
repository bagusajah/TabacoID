---
task_id: t_538a6ef9
objective: OBJ-002
date: 2026-08-09
status: draft
human_review: autonomous
---

# Docker Engine Upgrade 29.6.2 → 29.7.2 + containerd 2.2.6 → 2.3.3

## Engineering Question
Docker engine dan containerd ada update minor. Audit sebelumnya (t_a1c9fcee, 2026-08-07) defer upgrade ini. Apakah aman diapply sekarang, dan berapa downtime yang dihasilkan?

## Method
1. Cek versi sebelum upgrade, status container, dan health endpoint webreader API/nginx
2. Investigasi kenapa packages di-hold (apt-mark showhold)
3. Unhold Docker packages saja (5 package + rootless-extras), biarkan media packages tetap held
4. `apt install --only-upgrade` Docker stack
5. Monitor systemd journal untuk timing daemon restart
6. Verifikasi post-upgrade: version, container health, API response time

## Findings (with measurements)

### Upgrade berhasil — 6 package Docker diupdate:

| Package | Before | After |
|---------|--------|-------|
| docker-ce | 29.6.2 | **29.7.2** |
| docker-ce-cli | 29.6.2 | **29.7.2** |
| docker-ce-rootless-extras | 29.6.2 | **29.7.2** |
| containerd.io | 2.2.6 | **2.3.3** |
| docker-compose-plugin | 5.3.1 | **5.4.0** |
| docker-buildx-plugin | 0.35.0 | **0.36.1** |

### Downtime measurement (dari systemd journal):

| Event | Timestamp (WIB) |
|-------|-----------------|
| Daemon stop | 19:19:43 |
| Daemon start | 19:19:45 |
| Containers loaded | 19:19:47 |
| Container restart | 19:19:46 |

- **Container downtime: ~3 detik** (19:19:43 → 19:19:46), jauh di bawah target <30s
- Daemon restart: 2 detik (graceful shutdown → new daemon up)
- Total apt operation: 28 detik (19:19:25 → 19:19:53)

### Post-upgrade health:

| Endpoint | HTTP | Response Time |
|----------|------|---------------|
| API :8787/health | 200 | 3.4ms |
| Nginx :8181/ | 200 | 2.0ms |

- webreader-api: Up, healthy
- webreader-nginx: Up, healthy
- Hermes dashboard: active (running), tidak terdampak
- Hermes gateway: active, tidak terdampak

### 45 package media tetap di-hold (deliberate decision):

Dari 51 upgradable packages awal, hanya 6 Docker yang diupgrade. Sisa 45 packages semuanya **on hold** karena依赖 ABI vendor Rockchip:

- **libav stack** (16 pkg): libavcodec58, libavformat58, libavutil56, libswresample3, libswscale5, libpostproc55, ffmpeg + -dev variants
- **gstreamer stack** (16 pkg): gstreamer1.0-plugins-{bad,good}, libgstreamer1.0-0, dll.
- **dvb/v4l media** (4 pkg): libv4l, dvb-tools, ir-keytable
- **X.org server** (4 pkg): xserver-xorg-{core,dev,legacy}, xserver-common
- **mpv** (2 pkg): mpv, libmpv1
- **GPIO**: wiringPi

Package-package ini di-hold karena Orange Pi RK3588 pakai vendor SDK Rockchip (libmali GPU driver, librga 2D accel, librockchip-mpp media processing, camera-engine-rkaiq, gstreamer1.0-rockchip1). Upgrade media libraries bisa break ABI compatibility dengan plugin vendor — resikonya hardware acceleration, camera, GPU rendering. Decision: **tidak diupgrade**, hold tetap dipertahankan untuk stabilitas vendor stack.

## Decision
**Adopt** — Docker upgrade diapply berhasil. Media packages sengaja tidak diupgrade (vendor ABI lock), ini risk-managed decision bukan defer.

## Risk
- **Docker 29.7.2** adalah minor release dalam major line 29.x — low risk, backward compatible
- **containerd 2.3.3**: major-ish bump (2.2→2.3), tapi tidak ada breaking change yang documented untuk use case ini
- Container auto-restart dengan `restart: unless-stopped` bekerja sempurna — daemon restart otomatis re-launch containers
- Rollback tersedia: `apt install docker-ce=5:29.6.2-* containerd.io=2.2.6-*` (versi lama masih di apt cache)

## Lessons Learned
1. **Hold list = vendor ABI lock, bukan defer list.** Audit sebelumnya keliru menganggap 45 media packages bisa diupgrade. apt-mark showhold adalah signal kuat: packages di-hold karena alasan teknis (Rockchip vendor dependency), bukan karena "belum sempat"
2. **Daemon restart modern Docker sangat cepat** — 2 detik untuk daemon, 3 detik total container downtime. `restart: unless-stopped` bekerja reliabel
3. **Off-peak window 19:00 WIB** tepat — tidak ada traffic signifikan, window maintenance aman
4. **Upgrade package-by-category** lebih aman dari blanket `apt upgrade` — hanya Docker yang independen dari vendor stack

## Next Priority
- Monitor container stability 24h post-upgrade (watch for containerd 2.3 edge cases)
- 45 held media packages: butuh human decision — apakah vendor Rockchip SDK ada update yang kompatibel dengan libav/gstreamer baru? Jika ya, coordinated upgrade bisa dilakukan. Jika tidak, hold tetap correct behavior
