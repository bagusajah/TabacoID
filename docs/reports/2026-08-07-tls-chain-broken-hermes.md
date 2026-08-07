# Daily Report 2026-08-07 — TLS Certificate Chain Incomplete pada hermes.tabaco.id

## Pertanyaan Engineering
Apa yang menyebabkan `hermes.tabaco.id` gagal TLS verification (return code 21), dan berapa dampaknya terhadap client yang mengakses?

## Metode
1. `openssl s_client -showcerts` ke hermes.tabaco.id dan www.tabaco.id — hitung jumlah sertifikat dalam chain
2. Verifikasi manual: `openssl s_client -verify` kedua subdomain
3. Tes dengan Python `ssl.create_default_context()` dan `curl` — ukur failure rate
4. Cek tanggal cert dan issuer untuk analisis root cause
5. Cross-check: berapa subdomain terpengaruh

## Temuan (dengan pengukuran)

### 1. Chain Completeness

| Subdomain | Certificates served | Verify result | Issuer |
|-----------|-------------------|---------------|--------|
| www.tabaco.id | 3 (leaf + 2 intermediate) | OK (return code 0) | Let's Encrypt YR1 |
| hermes.tabaco.id | **1** (leaf only) | **FAIL** (return code 21) | Let's Encrypt YR2 |

`hermes.tabaco.id` hanya melayani leaf certificate tanpa intermediate chain. Error: `unable to verify the first certificate`.

### 2. Client Impact

| Client | Result |
|--------|--------|
| `curl` (no `-k`) | FAIL: SSL certificate problem |
| Python `urllib` (default context) | FAIL: CERTIFICATE_VERIFY_FAILED |
| Browser (cached intermediate) | Mungkin OK — browser cache intermediate YR2 dari site lain |
| Browser (fresh/incognito) | FAIL — tidak ada chain untuk validasi |
| Mobile apps / API clients | FAIL — kebanyakan tidak cache intermediates |

### 3. Cert Details

```
hermes.tabaco.id:
  Issuer: Let's Encrypt YR2
  Valid: Jul 30 11:41:09 2026 GMT — Oct 28 11:41:08 2026 GMT
  Chain: 1/3 (missing 2 intermediates)

www.tabaco.id:
  Issuer: Let's Encrypt YR1
  Valid: Aug 1 15:42:02 2026 GMT — Oct 30 15:42:01 2026 GMT
  Chain: 3/3 (complete)
```

### 4. Root Cause

Nginx reverse proxy di VPS (`host.tabaco.id`) punya dua server block dengan konfigurasi SSL certificate yang berbeda:
- `www.tabaco.id` → `ssl_certificate /path/to/fullchain.pem` (3 certs) ✓
- `hermes.tabaco.id` → kemungkinan menggunakan `cert.pem` saja (1 cert) ✗

Let's Encrypt YR2 intermediate tidak tersedia di client yang belum pernah mengunjungi site lain yang memakai YR2. Beda dengan YR1 yang sudah banyak tersebar di web dan di-cache oleh semua browser.

### 5. Measurements

| Metric | Value |
|--------|-------|
| Certificates served (hermes) | 1 of 3 needed |
| Certificates served (www) | 3 of 3 |
| TLS handshake success (openssl) | www: OK, hermes: FAIL |
| Python HTTPS request | FAIL |
| Cert expiry (hermes) | 83 hari lagi |
| host.tabaco.id connectivity | OK (Tailscale, no public HTTPS) |

## Keputusan
**Needs Human Review** — Fix memerlukan akses ke VPS nginx config:

1. Di VPS, ubah `ssl_certificate` untuk `hermes.tabaco.id` server block dari `cert.pem` → `fullchain.pem` (atau setara certbot output)
2. `nginx -t && systemctl reload nginx`
3. Verifikasi: `openssl s_client -showcerts hermes.tabaco.id | grep -c BEGIN`

## Risiko
- Fix hanya butuh nginx reload, tidak ada downtime
- Cert masih valid 83 hari — tidak urgent tapi harus diperbaiki karena API clients gagal

## Lessons Learned
- Let's Encrypt YR2 intermediate belum se-cached YR1 di browser/client. Site yang hanya serve leaf cert akan gagal verifikasi pada client fresh.
- Perbedaan issuer (YR1 vs YR2) antar subdomain di domain yang sama menunjukkan certbot mungkin dijalankan terpisah tanpa konfigurasi chain yang konsisten.
- `openssl s_client -showcerts | grep -c BEGIN` adalah quick check yang berguna untuk audit TLS chain completeness.

## Prioritas Berikutnya
- [ ] SSH ke VPS, fix nginx config untuk hermes.tabaco.id (fullchain.pem)
- [ ] Audit semua subdomain di VPS untuk konsistensi SSL chain
