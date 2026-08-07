# Daily Report 2026-08-07 — Fix TLS Certificate Chain pada hermes.tabaco.id

## Pertanyaan Engineering
Bagaimana memperbaiki TLS certificate chain yang tidak lengkap pada hermes.tabaco.id, dan apakah fix-nya survive HestiaCP rebuild?

## Metode
1. SSH ke VPS via Tailscale (`ssh -p 2222 root@100.65.68.15`)
2. Identifikasi file cert yang dipakai nginx (`ssl_certificate` directive)
3. Bandingkan isi file: `.crt` (leaf), `.ca` (intermediate), `.pem` (fullchain)
4. Fix live config: ganti `.crt` → `.pem`
5. Fix template: ganti `%ssl_crt%` → `%ssl_pem%` di `hestia-tailscale-proxy.stpl`
6. Reload nginx, verifikasi chain completeness dan TLS verification

## Temuan (dengan pengukuran)

### Cert File Analysis (VPS)

| File | Cert Count | Isi |
|------|-----------|-----|
| `hermes.tabaco.id.crt` | 1 | Leaf certificate saja |
| `hermes.tabaco.id.ca` | 2 | 2 intermediate certificates |
| `hermes.tabaco.id.pem` | 3 | Fullchain (leaf + intermediates) |

### Fix Applied
1. **Live config** (`/etc/nginx/conf.d/domains/hermes.tabaco.id.ssl.conf`):
   - `ssl_certificate` diubah dari `.crt` → `.pem`
2. **Template** (`/usr/local/hestia/data/templates/web/nginx/hestia-tailscale-proxy.stpl`):
   - `ssl_certificate` diubah dari `%ssl_crt%` → `%ssl_pem%`

`%ssl_pem%` adalah variabel HestiaCP yang valid, dipakai oleh semua template resmi (laravel, wordpress, joomla, dll).

### Verification (before → after)

| Metric | Before | After |
|--------|--------|-------|
| Certificates served | 1 of 3 | 3 of 3 |
| `openssl verify_return_error` | FAIL (code 21) | OK (code 0) |
| `nginx -t` | — | syntax ok |
| Dashboard HTTPS response | — | HTTP 302, 130ms |

## Keputusan
**Adopt** — Fix diterapkan dan terverifikasi. Chain lengkap, TLS verification OK.

## Risiko
- Rendah: nginx reload saja, tanpa downtime.
- Template fix memastikan rebuild HestiaCP tidak revert perubahan.
- Jika cert di-renew oleh Let's Encrypt, file `.pem` akan diupdate otomatis oleh HestiaCP/certbot — chain tetap lengkap.

## Lessons Learned
- HestiaCP memisahkan cert files: `.crt` (leaf), `.ca` (chain), `.pem` (fullchain). Template harus pakai `%ssl_pem%`, bukan `%ssl_crt%`.
- Custom proxy template awal (`hestia-tailscale-proxy`) pakai `%ssl_crt%` — ini mewarisi pola dari HestiaCP default yang kurang tepat untuk Let's Encrypt. Template resmi HestiaCP (php-fpm) semua pakai `%ssl_pem%`.
- SSH ke VPS: `ssh -p 2222 root@100.65.68.15` (port 2222, user root, via Tailscale).

## Prioritas Berikutnya
- [ ] Audit semua subdomain di VPS untuk konsistensi SSL chain
- [ ] Tambah monitoring: alert jika certificate chain count < 3
