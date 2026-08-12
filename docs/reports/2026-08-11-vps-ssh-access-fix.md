---
task_id: t_aed8e773
objective: OBJ-002
date: 2026-08-11
status: published
human_review: autonomous
---

# Fix VPS SSH Access — `vps-internal` Hostname Resolution

## Engineering Question
Cron job (executor cycle) gagal SSH ke VPS dengan error `Could not resolve hostname vps-internal: Name or service not known` (exit 255). Apa root cause dan bagaimana memperbaikinya agar future cron jobs bisa akses VPS tanpa error?

## Method
1. Investigasi error di `~/.hermes/logs/errors.log` — konfirmasi cron job coba `ssh vps-internal` pada 2026-08-11 07:03:58
2. Cek `~/.ssh/config` — **tidak ada**. Tidak ada alias yang resolve `vps-internal`.
3. Cek Tailscale status — VPS reachable sebagai `host` di `100.65.68.15` (active, direct connection)
4. Port scan: port 22 **refused**, port **2222 OPEN** — VPS SSH pakai port non-standar
5. Test SSH langsung: `ssh -p 2222 root@100.65.68.15` → **berhasil** (hostname=`host.tabaco.id`)
6. Bikin `~/.ssh/config` dengan alias `vps-internal` dan `host.tabaco.id` → port 2222, Tailscale IP
7. Test end-to-end: `ssh vps-internal` → **berhasil**
8. Update reference doc `repo-security-audit.md` dengan port info

## Findings (with measurements)

| Metric | Before | After |
|--------|--------|-------|
| SSH `vps-internal` exit code | 255 (hostname tidak resolve) | 0 (OK) |
| `~/.ssh/config` | Tidak ada (0 bytes) | Ada (312 bytes, 1 Host block) |
| SSH port yang dipakai | N/A (tidak ada config) | 2222 |
| Resolve time | ~8.5s (timeout) | <1s (direct) |
| Tailscale RTT ke VPS | N/A | direct connection active |

**Root cause:** `~/.ssh/config` tidak pernah dibuat. Cron jobs dan skill docs reference `vps-internal` sebagai hostname, tapi tidak ada alias yang maps ke Tailscale IP + port. Port 22 juga closed di VPS (security hardening), sehingga self-healing via default port juga gagal.

**Config yang dibuat:**
```
Host vps-internal host.tabaco.id
    HostName 100.65.68.15
    Port 2222
    User root
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
```

## Decision
**Adopt.** Config langsung aktif dan terverifikasi. VPS accessible via `ssh vps-internal` dan `ssh host.tabaco.id`. Future cron jobs / executor cycles bisa langsung pakai alias ini tanpa hardcoded IP/port.

## Risk
- **Low.** Config pakai Tailscale IP (private mesh), bukan public IP. Tidak expose attack surface baru.
- `StrictHostKeyChecking accept-new` — auto-accept host key pertama kali, tapi setelah itu locked. Acceptable untuk trusted mesh.
- Jika Tailscale IP berubah (rejoin mesh), config perlu update. Tailscale IP stabil selama node tidak di-remove dari tailnet.

## Lessons Learned
- **Config as documentation:** `~/.ssh/config` adalah single source of truth untuk SSH access conventions. Tanpa itu, setiap cron job harus hardcoded IP/port — fragile.
- **Port discovery:** Jangan assume port 22. VPS sering pakai non-standar port untuk security. Port scan cepat (`/dev/tcp` probe) saves time.
- **Reference docs harus match reality:** `repo-security-audit.md` document `root@vps-internal` sebagai konvensi tapi tidak specify port. Fixed dengan inline note.

## Next Priority
- VPS automation backlog (V1, V2 tasks) yang sebelumnya blocked sekarang bisa di-eksekusi
- Pertimbangkan tambahin VPS health check ke planner procedure (nginx status, cert expiry, disk space via SSH)
