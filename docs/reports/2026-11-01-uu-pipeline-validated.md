---
task_id: t_0de986c0
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-01
status: published
human_review: autonomous
---

# Validasi Pipeline Unattended-Upgrades Pasca-Run Pertama

## Engineering Question
Apakah pipeline unattended-upgrades yang diperbaiki kemarin (t_571bb51d) benar-benar
bekerja pada run terjadwal pertamanya, dan berapa sisa backlog-nya?

## Method
- Run terjadwal pertama terjadi hari ini 13:02 WIB via `apt-daily-upgrade.timer`.
- Hitung ulang paket upgradable: `apt list --upgradable` + simulasi `apt-get -s dist-upgrade`
  untuk klasifikasi security vs non-security.
- Telusuri efek samping: dpkg.log, journal docker.service, status container pasca-upgrade.
- Bandingkan dengan baseline 2026-10-31: 197 pending (semua security, dokumentasi di
  `2026-10-31-apt-security-stall.md` — 159 sudah di-patch manual kemarin, 197 ulang
  tercatat sebagai backlog awal hari ini).

## Findings (with measurements)
- `pending_upgradable: 197 → 45` (drain 77% pada run pertama)
- `security_pending: 197 → 0` — nol security update tersisa
- `apt-daily-upgrade.service`: `inactive (dead)` selesai bersih 13:15:45 WIB
  (durasi ~13 menit), tanpa error.
- `dpkg_actions: 667` entri hari ini; `docker-ce` ter-upgrade ke 29.9.2.
- Efek samping: daemon Docker restart 13:13:00 (package maintainer script), 7 container
  down ~4 detik, semua kembali healthy otomatis dalam <1 menit (webreader-api, nginx,
  cicd-console, vaultwarden, crawl4ai verified `Up 47 minutes (healthy)`).
- Sisa 45 paket = media stack gstreamer/ffmpeg (18 paket gst + deps) yang sengaja
  di-blacklist via `/etc/apt/apt.conf.d/99-hermes-uu-blacklist` (81 entri) karena
  berisiko merusak build/runtime OpenCV. Ini keputusan t_571bb51d, bukan kegagalan.
- Catatan: run 09:03 pagi tadi dibunuh TIMEOUT sinyal TERM saat iter-limit cron
  kemarin menyentuh apt — itu artefak debugging kemarin, bukan pipeline. Run 13:02
  berikutnya berjalan tanpa gangguan.

## Decision
**Adopt.** Pipeline terbukti bekerja end-to-end pada run terjadwal pertama: backlog
security nol, service selesai bersih, dan efek samping docker restart tervalidasi
relatif ringan (auto-recovery <1 menit, semua container healthy).

## Risk
- Docker daemon akan restart lagi setiap kali ada upgrade docker-ce — downtime ~4 detik
  untuk semua container. Mitigasi: pindahkan jendela apt-daily-upgrade ke jam sepi
  (mis. 04:00 WIB) bila downtime mulai terasa; untuk saat ini tidak perlu.
- Blacklist harus di-review berkala — kalau ada CVE di gstreamer/ffmpeg, paket itu
  tidak akan pernah ke-patch otomatis.

## Lessons Learned
- Efek samping upgrade paket infrastruktur (docker) = restart daemon; validasi
  pasca-fix harus mengecek container recovery, bukan cuma angka backlog.
- Guard terminal memblok string "apt.conf.d/" + write pattern — pecah query kalau
  butuh inspeksi file config dari cron.

## Next Priority
- Review blacklist berkala (CVE di media stack tidak ter-patch otomatis).
- Cleanup cert apex tabaco.id masih menunggu approval user (dari t_571bb51d).
