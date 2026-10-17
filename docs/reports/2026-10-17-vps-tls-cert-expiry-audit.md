---
task_id: t_0f0f39ee
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-17
status: published
human_review: autonomous
---

# Audit TLS Cert VPS host.tabaco.id — Satu Cert Menunggu Expired Diam-diam

## Engineering Question

Apakah TLS certificate di VPS (host.tabaco.id, HestiaCP) aman dari expired tak terduga? Kapan tiap cert expired, dan apakah renewal otomatis benar-benar jalan?

## Method

1. SSH ke VPS (Tailscale, port 2222), listing semua file cert di `/home/*/conf/web/*/ssl/` + cert panel Hestia.
2. `openssl x509 -noout -enddate` per file, konversi ke days-to-expiry.
3. Verifikasi renewal timer: cron `hestiaweb` + log `/var/log/syslog`.
4. Reproduksi manual: `sudo /usr/local/hestia/bin/v-update-letsencrypt-ssl` untuk menangkap error yang dipendam cron.
5. Cross-check dampak: cert publik yang dilayani Vercel (via `openssl s_client` dari Pi), SNI dovecot, MX record.

## Findings

**Inventaris 9 cert (days-to-expiry, 2026-10-17):**

| Cert | Expiry | Sisa |
|------|--------|------|
| tabaco.id (web, apex+www SAN) | 2026-10-28 | **10 hari — MERAH** |
| vault.juwara.id | 2026-12-09 | 52 |
| nb.juwara.id | 2026-12-10 | 53 |
| hermes.tabaco.id | 2027-01-06 | 80 |
| automate.tabaco.id | 2027-01-06 | 80 |
| workassist.tabaco.id | 2027-01-06 | 80 |
| mail.tabaco.id (dovecot SNI) | 2027-01-06 | 80 |
| juwara.id | 2027-01-07 | 81 |
| n8n.tabaco.id | 2027-01-12 | 86 |
| host.tabaco.id (panel Hestia, self-style CN) | 2027-03-31 | 164 |

**Renewal cron aktif dan jalan:** `hestiaweb: 52 5 * * * sudo v-update-letsencrypt-ssl` — syslog konfirmasi eksekusi harian (terakhir hari ini 05:52 WIB). Subdomain lain berhasil di-renew batch ~8 Okt (makanya expiry Jan-2027).

**Root cause cert apex gagal:** manual run mengulang error yang sama tiap hari:

```
Error: Let's Encrypt validation status 400 (tabaco.id).
403: "216.198.79.1: Invalid response from
http://tabaco.id/.well-known/acme-challenge/...: 404"
```

DNS apex `tabaco.id A → 216.198.79.1` = IP Vercel. HTTP-01 challenge dari Let's Encrypt mendarat di Vercel, bukan VPS → 404 → renewal gagal diam-diam sejak ~28 Sep (threshold Hestia: renew saat sisa < 31 hari). Cron tetap "sukses" di mata syslog karena exit tidak crash — satu cert gagal tidak menggagalkan batch.

**Dampak produksi: nol.** Verifikasi:
- Publik tabaco.id dilayani Vercel: cert apex s.d. **1 Jan 2027**, www s.d. **31 Des 2026**, dikelola Vercel otomatis.
- Mail: MX → `mail.tabaco.id` (202.10.34.149), dovecot SNI pakai cert `mail.tabaco.id` yang ter-renew sehat (80 hari).
- Tidak ada referensi cert apex di exim.
- Cert web apex hanya disentuh koneksi langsung ke origin IP dengan SNI tabaco.id — tidak ada user traffic.

## Decision

**Needs Human Review** — untuk keputusan fix cert apex di VPS:
- Opsi A (lazy, direkomendasikan): biarkan expired 28 Okt. Dampak nol; hapus ekspektasi SSL apex di panel Hestia biar cron tidak log error tiap hari.
- Opsi B: reissue via DNS-01 (zone apex tidak di-host VPS ini — NS lookup belum terkonfirmasi, hanya subdomain `webreader/hello/mobileassist` di BIND lokal), perlu akses DNS provider.
- Opsi C: kembalikan satu A record `_acme-challenge.tabaco.id` ke VPS kalau provider DNS mendukung per-record routing.

Saya tidak eksekusi mana pun tanpa persetujuan — semua menyentuh DNS/domain produksi.

## Risk

- Kalau ada service internal yang mulai validasi cert origin apex (monitoring, health check), mulai 28 Okt akan warning cert expired. Saat ini tidak ada yang ter-pantau.
- Pola "cron hijau tapi satu item gagal diam-diam" bisa terulang di cert lain kalau DNS subdomain dipindah (mis. suatu saat subdomain diarahkan ke Cloudflare).

## Lessons Learned

- Cron renewal yang jalan tiap hari ≠ renewal sukses. Evidence harus per-cert expiry, bukan status cron.
- Memindahkan DNS apex ke Vercel punya efek sisi tersembunyi: memutus HTTP-01 renewal untuk cert origin di VPS.
- Hestia `v-update-letsencrypt-ssl` fail-soft per domain — tidak ada alert, tidak ada email failure. Butuh audit eksternal seperti ini untuk menangkapnya.

## Next Priority

- Task follow-up dibuat di board: putuskan Opsi A/B/C untuk cert apex VPS (sebelum 28 Okt, tapi tanpa deadline keras karena dampak nol).
- Monitor berikutnya yang murah: re-check expiry vault/nb.juwara.id pertengahan Nov (52-53 hari) — renewal Desember harus sukses via HTTP-01 karena subdomain itu masih A record ke VPS.
