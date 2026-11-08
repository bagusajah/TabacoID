---
task_id: t_f98c2148
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-08
status: published
human_review: autonomous
---

# Audit Telegram Gateway Flapping — Reply User Hilang 2026-11-08

## Engineering Question

Gateway Telegram pagi ini flapping parah (46 reconnect sebelum jam 09:05). Apa root
cause-nya, seberapa parah dampaknya ke delivery pesan user, dan ini anomali atau pola biasa?

## Method

Korelasi tiga sumber log: `errors.log`, `gateway.log` (+7 hari rotasi via gzip), dan
`journalctl --user -u hermes-gateway`. klasifikasi pesan per tipe, timeline failure
cluster, uji konektivitas langsung (curl -4/-6 ke api.telegram.org dan literal IP),
cek config kernel (IPv6), DNS, dan `/etc/hosts`.

## Findings

**Metrik utama (before→after dalam satu hari):**

- `telegram_reconnects`: 46 (00:00–09:05, 8 Nov) vs 1 (7 Nov) vs 0 (5–6 Nov)
- `fatal_adapter_rebuilds`: 45 vs 0 (hari-hari sebelumnya)
- `telegram_network_warnings`: 928 vs 76 (7 Nov)
- `delivery_failures`: 1 hari ini vs 1 per ~3 bulan (total hanya 2 sejak 10 Agt: Sep-03 & hari ini)

**Dampak nyata:** pesan user jam 08:21:24 ("apa yang salah dengan page di tabaco.id")
diproses normal (185s, 11 API calls, response 970 chars) tapi **gagal terkirim**:
`Failed to deliver response after 2 retries: send_path_degraded` jam 08:24:51.
Pesan hilang tanpa jawaban. Website sendiri sehat (200 OK, sub-second) — jadi ini
murni masalah path Telegram, bukan konten.

**Timeline:** restart gateway 03:00:08 (planned stop, SIGTERM systemd, clean — bukan
crash), lalu failure cluster 03:00–04:40 dan 07:44–08:54 WIB. Recovery permanen 09:05.

**Root cause:** kombinasi, bukan satu hal:

1. **IPv6 mati di kernel** (`net.ipv6.conf.all.disable_ipv6=1`) + DNS resolver
   (MagicDNS 100.100.100.100) tetap menjawab AAAA (`2001:67c:4e8:f004::9`) →
   path "dual-stack hostname" selalu gagal instan. Ini kontributor noise, bukan
   penyebab utama — transport sudah punya fallback IPv4 literal.
2. **Instabilitas rute IPv4 ISP → Telegram DC** yang beneran: ConnectTimeout ke
   `149.154.166.110` beruntun (10s-an percobaan per menit) selama cluster jam
   03:00–04:40 dan 07:44–08:54. Uji langsung jam 09:00 sehat (302 in 0.68s).
3. **Amplifikasi internal:** setiap getUpdates timeout memicu `agent.deadline`
   (15s) → fatal handler → adapter rebuild penuh (updater.stop() deadline 5s
   lewat) → reconnect. Satu masalah jaringan berdentum jadi ~45 rebuild + 928
   warning dalam 9 jam. Mitigasi di level jaringan diperlukan; retry count 2 di
   layer send (`gateway/platforms/base.py` line ~3687) hard-coded dan tidak
   reachable dari config profil.

Klaim postmortem sebelumnya (cron 08:00) bahwa "Gateway restart 03:00" adalah
penyebab flapping **terbantahkan**: restart-nya planned dan clean; flapping
berlanjut 6 jam setelahnya dan justru karena rute.

## Decision

**Needs Experiment** — satu mitigasi satu-variabel: pin IPv4 statis untuk
api.telegram.org di `/etc/hosts` (`149.154.166.110`), bypass DNS AAAA bogus dan
kepinceran resolver. Jaringan untuk Telegram DC adalah anycast multi-IP, jadi
jadwalkan verifikasi mingguan bahwa IP pin masih valid; revert = hapus 1 baris.
Perubahan runtime hermes-agent sendiri (retry count, dual-stack skip) tidak
disentuh — itu kode auto-updated milik upstream, bukan lane repo ini.

## Risk

- Pin IP stale jika Telegram memutar alamat DC (rendah — literal ini stabil
  bertahun-tahun, dan transport sudah pakai literal yang sama sebagai first-try).
- `/etc/hosts` memengaruhi semua proses di host, bukan cuma gateway (dampaknya
  positif: curl/aplikasi lain juga tidak akan kepincut AAAA mati).

## Lessons Learned

- Noise WARNING (928 baris) bisa menutupi sinyal tunggal yang berarti (1
  delivery failure). Audit harus selalu menyaring per *outcome* (delivery),
  bukan per *error type*.
- Log agent.log(.gz) tidak berisi log gateway — jangan pakai sebagai sumber
  audit delivery; pakai gateway.log rotasi.
- Guard false-positive soal journalctl "restart gateway" menghabiskan 2 turn —
  pakai query per istilah netral sejak awal.

## Next Priority

Eksperimen pin IPv4 `/etc/hosts` + verifikasi mingguan otomatis (bisa digabung
dengan health check gateway yang sudah ada). Kuantifikasi: apakah reconnect
turun ke ~0/bulan pada rute ISP yang stabil.
