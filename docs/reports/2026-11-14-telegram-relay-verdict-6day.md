---
task_id: t_2466e2ed
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-14
status: published
human_review: autonomous
---

# Verdict 6-Hari Relay VPS Telegram + Keputusan Permanen Fase-1

## Engineering Question

Relay VPS fase-2 (t_c70b4327, dipasang 8 Nov) menjanjikan verdict 24 jam tapi tak
pernah dieksekusi. Setelah 6 hari: apakah relay benar-benar menyembuhkan episode
ConnectTimeout, jalur mana yang gagal saat episode tetap terjadi, apakah watchdog
pernah perlu trigger, dan apa keputusan permanen untuk fase-1 (pin MTU 1492)?

## Method

1. Grep `errors.log` + `agent.log` per hari 9–14 Nov: hitungan ConnectTimeout/
   Timed out/Bad Gateway, frekuensi `Sticky Telegram path 100.65.68.15 failed`.
2. Cross-check sisi VPS via `ssh vps-internal`: status `tg-relay`, journal socat
   (reset per hari), grade VPS→DC Telegram (ping 1300B + HTTPS ke 149.154.166.110).
3. Cek watchdog `tg-stall-watchdog.timer` armed + history trigger.
4. Cek keadaan fase-1: `ip rule/route` pin masih terpasang, `tcp_mtu_probing=1`.
5. Verifikasi delivery Telegram hidup (log cron 09:02 terkirim, message_id ada).

## Findings (with measurements)

**Hari 9–13 Nov: sempurna.**
- errors.log Telegram: 0/0/0/0/0 per hari (vs baseline 566–1448/hari era pra-relay).
- Sticky-relay flap: 0 per hari.

**Malam ini (14 Nov, 00:07–08:14): episode baru dengan mode beda.**
- 44 error Telegram, tersebar ~20 mini-episode (terburuk 01:36–01:42).
- Yang gagal bukan jalur Pi→VPS, tapi **leg relay VPS→DC itu sendiri**: 24×
  `Sticky Telegram path 100.65.68.15 failed`, dan journal socat di VPS mencatat
  `Connection reset by peer` dengan timestamp yang match persis (00:07:34,
  00:27:08, 00:44:17, …). Jadi Telegram DC me-reset koneksi dari IP VPS —
  kemungkinan policing ISP VPS yang episodic, atau rate-limit sisi DC.
- **Self-heal semua dalam <2 menit** — plugin re-walk IP, fallback hostname-direct,
  lalu balik ke relay. Nol intervensi manual, nol watchdog trigger.
- errors.log hari ini: hanya `Timed out` (8) + `Bad Gateway` (4) — ConnectTimeout
  klasik era pra-relay hilang. 0 fatal rebuild.

**Kesehatan jalur saat ini:**
- `tg-relay` active sejak 8 Nov 11:09, uptime kontinu.
- Tailscale Pi→VPS: 22 ms direct (via 202.10.34.149).
- Grade VPS→DC: 0% loss di 1300B, RTT 165.9 ms stabil, HTTPS 302 1.54s.
- Fallback config: `fallback_ips: 100.65.68.15` masih aktif; sticky path terpilih.
- Watchdog: timer armed (tick 09:00–09:05 terlihat), tidak pernah trigger 6 hari.

**Metric:** telegram_connect_timeout: ~690/11 jam (8 Nov, butuh restart manual,
MTTR 8.1 jam) → 44/24 jam (14 Nov, semua self-heal <2 menit, MTTR efektif 0).

## Decision

**Adopt (relay tetap jalur utama)** + **fase-1 dibuang dari rekomendasi.**

1. **fallback_ips tetap.** 5 dari 6 hari sempurna; episode yang tersisa beda kelas:
   mini-episode self-heal, bukan outage 8 jam. Rasio error 690→44 per hari, dan
   MTTR 8.1 jam→<2 menit adalah perbaikan struktural, bukan noise.
2. **Pin MTU 1492 (fase-1) resmi dibuang dari rekomendasi.** Tak pernah terbukti
   efek (verdict 8 Nov), dan sekarang tak relevan — jalur utama lewat relay yang
   bermasalahnya di leg VPS→DC, bukan PMTU di leg Pi→DC. Pin masih terpasang
   non-persisten; **hapus manual saat maintenance window** (`ip route del
   149.154.160.0/20 ... mtu 1492`) — diblok gateway guard cron, jadi butuh
   manusia. Tanpa dihapus pun tak berbahaya: hilang sendiri saat reboot.
3. **Watchdog dipertahankan sebagai safety net** — armed, gratis, dan nyala
   pertama kali episode >6 menit. Hari ini membuktikan self-heal plugin cukup
   untuk episode pendek; watchdog hanya akan menyentuh gateway kalau episode
   kronis balik.
4. **Tidak ada aksi baru untuk flap leg VPS→DC.** Frekuensinya rendah (24×/6 hari,
   hanya hari ini), self-heal konsisten. Kalau frekuensi naik (misal >100/hari),
   opsi berikutnya: unit socat kedua ke IP DC lain (sudah diantisipasi di report
   fase-2 sebagai ponytail-ceiling).

`ponytail:` flap leg VPS→DC belum dibenahi — 1 hari data, self-heal sudah
cukup. Tambah unit socat DC-kedua kalau episode harian naik signifikan.

## Risk

- Episode flap relay bisa berubah karakter (jadi kronis) — watchdog + fallback
  direct adalah dua lapis di belakangnya; monitoring errors.log harian menangkap.
- Penghapusan pin MTU menunggu manusia; sampai saat itu pin tinggal sebagai
  no-op non-persisten.
- VPS tetap single point of failure jalur utama (sama seperti saat adopt fase-2);
  degradasinya graceful, bukan hard-down.

## Lessons Learned

- Verdict yang dijanjikan di report tapi tak dijadwalkan sebagai task = verdict
  gugur. Lebih baik langsung buat task follow-up saat menutup task induk.
- "Sticky path failed" vs "ConnectTimeout direct" adalah dua diagnosis beda —
  grep log Pi saja bikin salah kesimpulan; timestamp match dengan journal socat
  di VPS yang membuktikan flap-nya di leg kedua.
- Self-heal plugin (re-walk IP + graceful fallback) terbukti cukup untuk episode
  pendek — arsitektur berlapis (relay → direct fallback → watchdog) bekerja
  sesuai desain tanpa satu pun trigger.

## Next Priority

- Hapus pin MTU saat maintenance window manusia (satu perintah `ip route del`).
- Kalau episode flap relay jadi harian & kronis: unit socat kedua ke DC
  alternatif (149.154.167.x) + pertimbangkan fallback_ips kedua.
- Verdict watchdog tetap terbuka: kalau suatu hari trigger, catat MTTR-nya.
