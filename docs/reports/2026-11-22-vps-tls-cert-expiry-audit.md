---
task_id: t_6f317665
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-22
status: published
human_review: autonomous
---

# Audit TLS Certificate Expiry & Renewal Health — VPS host.tabaco.id

## Engineering Question

Apakah sertifikat TLS di VPS `host.tabaco.id` (HestiaCP) aman dari expiry silent-failure? Berapa days-to-expiry per cert, dan apakah renewal pipeline aktif dan terbukti sukses?

## Method

- Probe publik: `openssl s_client` ke tiap endpoint HTTPS (tabaco.id, www, hermes, mail) dari Pi.
- Probe internal via SSH Tailscale (`vps-internal`, root@100.65.68.15:2222): `openssl x509` ke semua `.pem` di `/home/tabacoweb/conf/{web,mail}/`, cek crontab semua user, `journalctl -u cron` + syslog untuk bukti eksekusi renewal, mtime file cert.
- Hipotesis awal salah arah yang justru jadi temuan: task menyebut certbot — faktanya **VPS tidak punya certbot sama sekali** (no binary, no `/etc/letsencrypt`, no snap, no dpkg). Stack renewal = **HestiaCP 1.10.9** via `v-update-letsencrypt-ssl`.

## Findings

Days-to-expiry per sertifikat (diukur 2026-11-22, semua issuer Let's Encrypt kecuali panel):

| Cert | Expiry | Days |
|------|--------|------|
| www.tabaco.id (Vercel edge) | 2026-12-31 | **39** |
| tabaco.id (Vercel edge) | 2027-01-01 | **40** |
| hermes.tabaco.id (Hestia/LE) | 2027-01-06 | **45** |
| mail.tabaco.id (Hestia/LE) | 2027-01-06 | **45** |
| automate.tabaco.id (Hestia/LE) | 2027-01-06 | **45** |
| workassist.tabaco.id (Hestia/LE) | 2027-01-06 | **45** |
| n8n.tabaco.id (Hestia/LE) | 2027-01-12 | **51** |
| host.tabaco.id panel (self-signed Hestia) | 2027-03-31 | 129 |

Renewal health, bukti berlapis:

1. **Cron aktif**: `hestiaweb` crontab menjalankan `v-update-letsencrypt-ssl` harian 05:52 WIB.
2. **Eksekusi terbukti**: syslog + journalctl cron menunjukkan CMD jalan tiap hari, terakhir **hari ini 2026-11-22 05:52** (5 hari beruntun diverifikasi).
3. **Sukses terbukti**: batch renewal LE Okt 2–8 (notBefore 4 sertifikat identik 2026-10-08 21:5x), mtime `.pem` di-touch 2026-11-07 oleh siklus queue — pipeline hidup, bukan artefak basi.
4. **Zero cert di danger zone**: tidak ada yang <30 hari. `hello.` dan `mobileassist.` tidak punya SSL dir (tanpa HTTPS, tidak di-audit).

Temuan sampingan: DNS publik A record `host.tabaco.id` tidak resolve (akses hanya via Tailscale + panel :8083 di IP publik). Bukan isu TLS, dicatat sebagai catatan.

## Decision

**Adopt** — renewal pipeline sehat, tidak perlu aksi apa pun. Jangan tambah monitoring eksternal: Hestia cron harian + threshold 30 hari sudah menjadi mekanisme itu, dan menambah layer baru untuk 8 sertifikat adalah over-engineering. Trigger re-audit alami: laporan ulang bila ada cert tembus <30 hari, atau ganti-berapa-bulan sekali sebagai spot check.

## Risk

- Single point: renewal bergantung satu cron `hestiaweb`. Jika cron mati diam-diam, cert expired ±Des 31–Jan tanpa alarm — mitigasi: audit spot-check berkala seperti ini (biaya ~1 slot cron).
- Vercel edge certs (www, apex) dikelola Vercel, di luar kendali VPS — historisnya auto dan aman.

## Lessons Learned

- Cek asumsi tooling lebih dulu: task mengasumsikan certbot, kenyataan Hestia. Verifikasi "apa yang benar-benar terpasang" sebelum mengaudit "apakah jalan".
- Bukti renewal butuh 3 lapis: config cron ada → eksekusi terjadi (syslog) → hasilnya terlihat (mtime/notBefore). Satu lapis saja bisa menipu.

## Next Priority

Kembali ke backlog: W2 (TICMI token refresh monitoring) atau H3 (TUI session cleanup) — keduanya core-engineering yang belum tersentuh.
