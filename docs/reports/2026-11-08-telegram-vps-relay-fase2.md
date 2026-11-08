---
task_id: t_c70b4327
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-08
status: published
human_review: autonomous
---

# Telegram Fase-2: VPS Relay Lewat Policing ISP

## Engineering Question
Episode drop Telegram (policing selektif per-destinasi ISP, ≥500B ke 149.154.160.0/20) tidak bisa dibenahi dari sisi Pi. Bisakah API traffic dilewatkan via VPS host.tabaco.id yang terbukti bersih dari policing, dan apakah fase-1 (route pin MTU 1492) sebenarnya berefek?

## Method
1. Rekap episode dari `errors.log` (11 jam, boundaries gap >5 menit).
2. Uji prereq task: (a) SSH Pi→VPS, (b) grade ukuran paket VPS→DC Telegram (ping -s 40/480/1300 + HTTPS).
3. Cek apakah plugin Telegram punya jalur native untuk reroute — ditemukan `platforms.telegram.extra.fallback_ips` + sticky-path logic dengan graceful fallback (tidak perlu /etc/hosts, tidak perlu DNAT — keduanya diblok guard cron).
4. Pasang socat L4 relay di VPS: `TCP-LISTEN:443,bind=100.65.68.15,fork` → `TCP:149.154.166.110:443` (tailscale0 only, bukan IP public yang dipakai nginx), systemd unit `tg-relay.service`.
5. Verifikasi end-to-end dengan `curl --resolve api.telegram.org:443:100.65.68.15` + getMe bersertifikat token.
6. Set `platforms.telegram.extra.fallback_ips: '100.65.68.15'` via `hermes config set`, restart gateway via planned-stop marker (prosedur resmi, drain ~35s).
7. Buktikan dari log gateway: fallback IPs aktif, sticky path terpilih, connected, nol error pasca-restart.

## Findings (with measurements)

**Fase-1 verdict: tidak terbukti efek.** Pin `149.154.160.0/20 mtu 1492` terpasang live 10:23, tapi 4 episode tetap lewat sesudahnya (10:28→10:36, 10:42→10:52, dst) dengan ~90 ConnectTimeout/jam. Pemulihan ~10:58 lebih konsisten dengan akhir episode policing daripada efek pin. ICMP 1300B yang lolos jam 11:00 bukan bukti pin (episode sudah selesai).

**Episode pagi ini (baseline):** degradation hampir kontinu 03:00–10:58, ~690 ConnectTimeout dalam 11 jam, puncak 83–94/jam jam 03–05.

**Prereq VPS:**
- SSH root key Pi→VPS ternyata SUDAH beres (task body outdated — yang gagal dulu itu user `tabacoweb`; `vps-internal` alias berfungsi).
- Grade VPS→149.154.166.110: 0% loss di 40/480/1300B, RTT stabil ~167ms (vs Pi yang episodic drop ≥500B).

**Relay end-to-end (sebelum config flip):** getMe via relay HTTP 200 ×3, TLS handshake valid, payload JSON bot asli, steady-state ~1.0s (TLS ~0.55s).

**Pasca-flip (bukti log 11:13–11:14):**
- `[Telegram] Telegram fallback IPs active: 100.65.68.15`
- `[Telegram] Using sticky IPv4 Telegram API path 100.65.68.15`
- `✓ telegram connected` (polling mode) dalam 15 detik, attempt pertama
- errors.log pasca-restart: nol ConnectTimeout

**Metric:** telegram_connect_timeout: ~690/11jam (episode 03:00–10:58) → 0 sejak 11:14 (instan; verdict 24h menyusul). getMe via relay: 200 OK, ~1.0s.

## Decision
**Adopt** — dengan catatan desain:
- Relay bind hanya ke 100.65.68.15 (tailscale0) — tidak terekspos internet publik, tak sentuh nginx 443.
- Tidak ada kontrak baru: SNI + Host header dipertahankan (plugin rewrite path), jadi relay transparan TLS.
- Graceful degradation tetap ada: sticky path gagal (VPS mati) → fallback hostname-direct otomatis, tidak hard-dependency.
- Rollback satu perintah: `hermes config unset platforms.telegram.extra.fallback_ips` + restart planned-stop; relay dimatikan `systemctl disable --now tg-relay` di VPS.
- Biaya: Rp0 (VPS existing, socat idle ~2MB RSS).

`ponytail:` relay target IP tunggal 149.154.166.110 (DC2) di-hardcode di unit — kalau DNS round-robin Telegram pindah DC, tambah unit kedua untuk IP DC lain.

## Risk
- VPS jadi single point of failure jalur utama Telegram (mitigasi: fallback direct otomatis, episode policing kan jeleknya juga).
- Reliasi IP DC Telegram bisa berubah; monitoring 24h akan menangkap kalau relay tiba-tiba gagal TLS.
- Fase-1 route pin masih terpasang (non-persisten, hilang saat reboot) — biarkan; tak terbukti merugikan tapi juga tak terbukti menolong. Keputusan permanen fase-1 ditunda sampai data 24h fase-2.

## Lessons Learned
- Task body prereq kadang basi: verifikasi dulu sebelum anggap "butuh input user" — SSH key ternyata sudah hidup.
- Guard cron blokir `/etc/hosts` dan iptables DNAT, tapi jalur app-config native (fallback_ips plugin) lebih bersih dari keduanya: tidak butuh privilege, punya fallback built-in, dan terbukti dari log.
- `hermes config set` tanpa prefix `platforms.` mendarat ke top-level key yang salah — selalu verify YAML parse setelah set.

## Next Priority
- Verdict 24h: ConnectTimeout harian harus <50, fatal rebuild <5 (success_metric task). Cek besok: grep errors.log per jam + sticky path masih relay.
- Kalau stabil: keputusan permanen fase-1 (buang atau persistenkan) + pertimbangkan relay unit kedua untuk DC fallback.
