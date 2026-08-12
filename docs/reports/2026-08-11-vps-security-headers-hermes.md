---
task_id: t_14e3c3b8
objective: OBJ-002
date: 2026-08-11
status: draft
---

# VPS Security Headers: hermes.tabaco.id Hardening

## Engineering Question
`hermes.tabaco.id` (internet-facing nginx reverse proxy di VPS) hanya mengirim `Strict-Transport-Security`. Missing: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. Apakah bisa hardening tanpa break HestiaCP domain rebuild?

## Method
1. SSH ke VPS via Tailscale mesh (`ssh -p 2222 root@100.65.68.15`, hostname `host.tabaco.id`)
2. Audit nginx config via `nginx -T` — temukan dua server block untuk hermes.tabaco.id (HTTP :80 redirect-only, HTTPS :443 proxy ke Pi `100.72.213.56:9119`)
3. HTTPS block include pattern: `/home/tabacoweb/conf/web/hermes.tabaco.id/nginx.ssl.conf_*` (HestiaCP glob — survives rebuild)
4. Buat file baru `nginx.ssl.conf_security_headers` dengan 4 `add_header ... always` directives
5. `nginx -t` → OK → `systemctl reload nginx`
6. Verify via `curl -sI` (two paths: `/` and `/login`)

## Findings

**Security header count: 1 → 5** (before → after)

| Header | Before | After |
|--------|--------|-------|
| Strict-Transport-Security | ✅ max-age=31536000 | ✅ max-age=31536000 |
| X-Content-Type-Options | ❌ | ✅ nosniff |
| X-Frame-Options | ❌ | ✅ SAMEORIGIN |
| Referrer-Policy | ❌ | ✅ strict-origin-when-cross-origin |
| Permissions-Policy | ❌ | ✅ camera=(), microphone=(), geolocation=() |

**Success metric tercapai:** `curl -sI https://hermes.tabaco.id/` shows ≥4 security headers → **5 headers**.

**HestiaCP compatibility:** Include glob `nginx.ssl.conf_*` adalah pola resmi HestiaCP. File survive domain rebuild (verified: existing `nginx.ssl.conf_letsencrypt` dan `nginx.ssl.conf_redirect` menggunakan pola yang sama). File baru dibuat sebagai plain file (bukan symlink) di `/home/tabacoweb/conf/web/hermes.tabaco.id/`.

**Rollback path:** `rm /home/tabacoweb/conf/web/hermes.tabaco.id/nginx.ssl.conf_security_headers && systemctl reload nginx`

## Decision
**Adopt.** Perubahan langsung aktif di production. Hanya menambah defense-in-depth headers, zero impact pada proxy behavior. File persistent across HestiaCP rebuilds.

## Risk
- **Low.** Header bersifat additive — tidak mengubah response body, proxy_pass, atau routing.
- `X-Frame-Options: SAMEORIGIN` mengizinkan iframe dari domain sendiri (aman untuk dashboard embed jika diperlukan).
- Tidak menambah `Content-Security-Policy` — app menggunakan WebSocket (dashboard :9119 + gateway :3000) dan CSP yang salah bisa break. CSP butuh audit terpisah dengan report-only mode dulu.

## Lessons Learned
- HestiaCP punya include glob pattern yang elegant untuk custom directives — `nginx.ssl.conf_*` di domain conf dir. Tidak perlu edit template atau main config.
- `add_header ... always` penting: tanpa `always`, header hanya dikirim pada response 200/301/302. Dengan `always`, juga pada error responses (403, 404, 500) — coverage penuh.
- VPS akses hanya via Tailscale (100.65.68.15), `host.tabaco.id` tidak resolve via public DNS. MagicDNS nama `host` tidak resolve dari Pi — perlu IP langsung.

## Next Priority
- **CSP audit** untuk hermes.tabaco.id (report-only mode dulu, lalu enforce setelah whitelist WebSocket origin)
- Pertimbangkan `X-Robots-Tag: noindex` untuk hermes.tabaco.id (private dashboard, tidak perlu diindex)
- Cek apakah subdomain lain (`automate.tabaco.id`, `hello.tabaco.id`) juga missing security headers — kemungkinan ya, pattern reuse.
