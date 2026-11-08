---
task_id: t_825a6cb6
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-11-08
status: published
human_review: autonomous
---

# Telegram Gateway Flaky: PMTU Black Hole terukur di Path ke DC Telegram

## Engineering Question
Kenapa gateway Telegram Hermes tiap beberapa menit ConnectTimeout lalu rebuild adapter — padahal Docker semua healthy dan curl ke `api.telegram.org` dari host sering kali lancar?

## Method
1. Kuantifikasi log: hitung event `ConnectTimeout` / `polling degraded` / `Fatal telegram adapter` di `~/.hermes/logs/errors.log` 24 jam.
2. Probe berulang dari host (curl 4x/detik windows) untuk membuktikan kegagalan bersifat box-wide, bukan bug adapter.
3. Diskriminasi layer saat fail window: DNS (getent), TCP (bash /dev/tcp), ping kecil (64B) vs ping besar (1200B, `-M do`), TLS handshake verbose (pesan apa yang terakhir diterima).
4. Ukur path MTU dengan ping `df-flag` binary search ke `149.154.166.110`, bandingkan dengan control (Google IP).
5. Cek sysctl `tcp_mtu_probing`, MTU interface, PMTU cache kernel.

## Findings
- **Skala masalah (errors.log, 24 jam):** 566 event ConnectTimeout, 65 polling-degraded, 49 fatal rebuild adapter. Burst tiap ~5 menit sepanjang hari, self-recover ~15 detik.
- **Bukan bug gateway:** curl biasa dari host ikut gagal episodic — probe 15x berurutan: 8 OK lalu 7 FAIL tanpa ada perubahan di Pi.
- **Bukan DNS:** resolver (Tailscale 100.100.100.100) selalu jawab; TCP :443 ke IP tetap connect bahkan saat episode.
- **Pola drop selektif saat episode:** ping kecil 64B selalu lolos, ping besar 1200B gagal, TLS handshake terhenti dengan **0 pesan balik** — server flight (Certificate, >1400 byte) dibuang diam-diam.
- **Path MTU terukur:** cliff di 1468/1496 byte (FAIL/OK) ke IP Telegram → MTU path ~1492, konsisten PPPoE upstream (modem ISP). Control Google: sama-sama 1492 tapi self-heal — ICMP frag-needed mereka jalan, jadi PMTUD menemukan MTU.
- **Konfigurasi Pi:** `tcp_mtu_probing=0`, eth0 MTU 1500. Kalau ICMP "frag needed" dari jalur PPPoE hilang/tersaring saat brownout, TCP tidak pernah mengecilkan MSS → handshake hang 15s → timeout.
- **IPv6 bukan penyebab:** host tidak punya global v6, curl -6 fast-fail 3ms.
- **Post-fix grading (catcher v2, episode 10:27):** dengan route pin 1492 + mtu_probing=1, episode tetap datang — dan grading ukurannya menunjukkan **≥500B drop semua ke IP Telegram, sementara Google (1428B) lolos di detik yang sama**; eth0 idle (rx 1KB/s). Episode juga menumbangkan lapisan cliff statis >1492B yang sudah dibenahi. Kesimpulan: lapisan utama = **policing selektif per-destinasi upstream (DPI/CGNAT ISP terhadap range 149.154.160.0/20)** — kecil lolos, besar dibuang, dateng-dateng hilang; paket TCP ikut kena, bukan cuma ICMP. Lapisan kedua = cliff statis 1492 (PPPoE) yang deterministik dan kini sudah dibenahi pin route.

## Decision
**Needs Experiment (fase-1 live, fase-2 = bypass path, butuh akses VPS).**
- Terpasang live: `ip route add 149.154.160.0/20 via 192.168.10.1 dev eth0 mtu 1492` + `sysctl net.ipv4.tcp_mtu_probing=1`. Menghabikan lapisan cliff statis (handshake hang deterministik >1492B); episode policing TIDAK teratasi oleh ini.
- Persistensi butuh approval manusia (guard cron blokir tulis `/etc` — boundary benar). Setelah approve, 2 perintah cukup:
  `sudo install -m644 <file> /etc/systemd/system/telegram-mtu-fix.service && sudo systemctl enable --now telegram-mtu-fix.service` (unit: oneshot `ip route replace 149.154.160.0/20 mtu 1492`)
  `sudo install -m644 <file> /etc/sysctl.d/90-tcp-mtu-probing.conf` (isi: `net.ipv4.tcp_mtu_probing = 1`)
  Tanpa persistensi, reboot menghapus fix.
- Fase-2 (follow-up task dibuat): route traffic Telegram lewat VPS (relay/tunnel) untuk mem-bypass policing ISP. Prasyarat: SSH ke VPS dari Pi sekarang gagal pubkey (`Permission denied`) + verifikasi VPS sendiri bersih dari policing (kalau VPS juga kena Kominfo rules, bypass percuma).

## Risk
- `tcp_mtu_probing=1` global: overhead probe kecil (base_mss fallback saat black hole saja); risiko rendah, reverting = `sysctl -w net.ipv4.tcp_mtu_probing=0`.
- Route pin MTU 1492: throughput maksimum turun ~0.5% untuk traffic Telegram saja; reverting = `ip route del 149.154.160.0/20`.
- Kalau episode adalah policing ISP per-destinasi (temuan v2 mengarah ke sini), fase-1 hanya mengurangi baseline — episode tetap; solusi = bypass path (fase-2). Ekspektasi realistis: frekuensi episode turun sebagian (lapisan cliff hilang).

## Lessons Learned
- "Gateway flaky" dengan self-recovery 15 detik hampir selalu jaringan, bukan aplikasi — cek dulu dari layer bawah sebelum menyentuh adapter/reconnect logic.
- PMTU black hole punya signature yang murah dibuktikan: ping kecil OK + ping besar FAIL + TLS hang dengan 0 pesan balik, semuanya dalam satu fail window.
- MTU cliff 1492 di rute rumah (PPPoE) bikin host MTU-1500 rapuh tiap ICMP frag-needed tersaring; Google-type CDN selamat karena ICMP-nya jalan.
- Bedakan MTU black hole vs policing ISP dengan kontrol destinasional di detik yang sama: kalau dest lain lolos ukuran besar saat dest bermasalah drop ≥500B → selektif per-destinasi (DPI), bukan MTU. Kecil-lolos/besar-mati yang episorik + paket TCP ikut kena adalah signature policing.

## Next Priority
1. Human approval: pasang persistensi (2 file dari scratch → `/etc`).
2. ~~Catcher grading~~ selesai — putusan: fase-2 bypass path, task t_c70b4327 dibuat.
3. Monitoring 24 jam: hitung ulang ConnectTimeout/fatal, bandingkan baseline 566/49 untuk mengukur kontribusi lapisan cliff.
