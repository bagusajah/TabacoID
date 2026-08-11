---
task_id: t_8436ffbe
objective: OBJ-002
date: 2026-08-09
status: draft
human_review: autonomous
---

# Infra Audit: SSH Hardening Status + DNS Subdomain Map + TLS Chain Verification

## Engineering Question
Apa status hardening SSH di host Orange Pi setelah security audit 2026-08-09 menandai `PasswordAuthentication` dan `PermitRootLogin`? Apakah semua subdomain tabaco.id resolve dengan benar? Apakah TLS chain issue di hermes.tabaco.id (08-07) sudah diperbaiki?

## Method
1. **SSH config audit** — baca effective values via `sshd -T`, cek `sshd_config` dan `sshd_config.d/`
2. **DNS resolution map** — resolve 11 subdomain tabaco.id via Python `socket.getaddrinfo`
3. **TLS chain check** — `openssl s_client -showcerts` untuk hitung sertifikat dalam chain
4. **Service health** — `systemctl status`, `docker ps`, `docker stats`, gateway `/health`
5. **Host health** — `free -h`, `df -h`, thermal zones, `iostat`, failed units

## Findings (with measurements)

### 1. SSH Hardening — MASIH TERBUKA

| Setting | Effective Value | Status |
|---------|----------------|--------|
| `PermitRootLogin` | **yes** | ⚠️ Open |
| `PasswordAuthentication` | **yes** | ⚠️ Open |
| `PubkeyAuthentication` | yes | ✅ OK |
| `PermitEmptyPasswords` | no | ✅ OK |
| `MaxAuthTries` | 6 | ✅ OK |
| `LoginGraceTime` | 60s | ✅ OK |

- `PermitRootLogin yes` ada di `/etc/ssh/sshd_config` (baris aktif, bukan comment)
- `PasswordAuthentication` tidak diset explicitly (default: yes)
- **Root never logged in via SSH** (`lastlog -u root` = "Never logged in")
- SSH brute-force attempts dalam auth.log: **5 total** (sangat rendah)
- `~/.ssh/authorized_keys`: 1 key (orangepi user) — key-based auth aktif tapi password auth juga masih diaktifkan

### 2. DNS Resolution Map

| Subdomain | Resolves? | IP | Status |
|-----------|-----------|-----|--------|
| `tabaco.id` | ✅ | 216.198.79.1 | Vercel (Vercel edge) |
| `www.tabaco.id` | ✅ | 216.198.79.1 | Vercel — HTTP 200, 0.48s |
| `hermes.tabaco.id` | ✅ | 202.10.34.149 | VPS — HTTP 302, 0.14s |
| `mail.tabaco.id` | ✅ | 202.10.34.149 | VPS MX |
| `host.tabaco.id` | ❌ | NXDOMAIN | Expected — VPS akses via Tailscale (100.x.x.x), bukan public DNS |
| `api.tabaco.id` | ❌ | NXDOMAIN | Expected — tidak ada public API |
| `grafana.tabaco.id` | ❌ | NXDOMAIN | Expected — tidak digunakan |
| `docs.tabaco.id` | ❌ | NXDOMAIN | Expected — docs ada di www |
| `blog.tabaco.id` | ❌ | NXDOMAIN | Expected — tidak ada blog |
| `git.tabaco.id` | ❌ | NXDOMAIN | Expected — tidak ada git server |
| `ci.tabaco.id` | ❌ | NXDOMAIN | Expected — tidak ada CI publik |

**Kesimpulan DNS:** Hanya 4 subdomain yang aktif (tabaco.id, www, hermes, mail). NXDOMAIN lainnya expected — tidak ada regresi. VPS (`host`) reachable via Tailscale IP `100.x.x.x` (HTTP 200, 0.018s).

### 3. TLS Chain — FIXED ✅

| Subdomain | Certs in chain | Verify | Expiry |
|-----------|---------------|--------|--------|
| `hermes.tabaco.id` | **3 of 3** | **OK (return code 0)** | Oct 28 2026 |
| `www.tabaco.id` | 3 of 3 | OK | Oct 30 2026 |

TLS chain issue dari report 2026-08-07 (`2026-08-07-tls-chain-broken-hermes.md`) **sudah diperbaiki**. hermes.tabaco.id sekarang melayani fullchain (3 sertifikat) dan verify pass.

### 4. Service Health — ALL HEALTHY ✅

| Service | Status | Uptime |
|---------|--------|--------|
| hermes-dashboard.service | active (running) | 1h 44m |
| hermes-gateway.service | active (running) | 1h 45m (health: connected, queue: 0) |
| webreader-api (Docker) | Up 27 hours | 147MiB RAM |
| webreader-nginx (Docker) | Up 27 hours | 10MiB RAM |
| systemd failed units | **0** (system + user) | — |

### 5. Host Health

| Metric | Value |
|--------|-------|
| Uptime | 1 day, 3h 8m |
| Load average | 1.34 / 1.25 / 1.20 |
| Memory | 1.8G used / 7.7G total (23%) |
| Swap | 13M / 3.9G used (zram) |
| Disk (/) | 35G / 234G used (15%) |
| Thermal (zones) | 30-32°C (7 zones) |
| NVMe I/O | 98.5 kB/s read, 107 kB/s write |
| Website build | ✅ passes, 6.09s |

## Decision
**Needs Human Review** — untuk SSH hardening changes (config edit requires sudo, berpotensi lockout):

1. **SSH hardening (PRIORITY):** Set `PermitRootLogin no` dan `PasswordAuthentication no` di `/etc/ssh/sshd_config`. Key-based auth sudah aktif (1 authorized key), jadi ini aman. **Risk:** Pastikan SSH key masih bisa login sebelum disable password auth.
2. **DNS & TLS:** No action needed — semua expected and healthy.

## Risk
- **SSH hardening lockout:** Jika authorized_keys rusak atau key hilang, disable password auth = lockout permanent. Mitigasi: verifikasi key login works sebelum apply, atau test di sesi SSH kedua sebelum close sesi pertama.
- Root login via SSH tidak pernah digunakan (lastlog confirms), jingga disable zero impact operasional.

## Lessons Learned
- Security audit built-in Hermes (startup check) efektif menandai `PermitRootLogin yes` dan `PasswordAuthentication yes` — tapi belum di-action setelah 2+ jam. Cron executor cycle perlu pick up security findings lebih cepat.
- TLS chain fix pada hermes.tabaco.id berarti seseorang (atau task sebelumnya) sudah fix nginx config di VPS — good traceability gap: tidak ada task/record yang men dokumentasi siapa yang fix dan kapan.
- DNS NXDOMAIN untuk host/api/grafana/docs/blog/git/ci.tabaco.id semua expected — tidak ada public service. VPS diakses via Tailscale, bukan public DNS. Ini design yang aman.

## Next Priority
- [ ] SSH hardening: apply `PermitRootLogin no` + `PasswordAuthentication no` (needs human approval — sudo config change)
- [ ] Document TLS chain fix provenance (siapa/kapan fix nginx config hermes.tabaco.id)
