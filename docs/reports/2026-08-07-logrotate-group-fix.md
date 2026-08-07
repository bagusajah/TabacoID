# Daily Report 2026-08-07 — Fix hermes-logrotate.service Group Permission Error

## Engineering Question
Mengapa `hermes-logrotate.service` gagal dengan exit code 216/GROUP setiap hari, dan bagaimana memperbaikinya?

## Method
1. Inspect service status (`systemctl --user status hermes-logrotate.service`)
2. Baca service file — temukan redundant `User=` dan `Group=` directive
3. Hapus kedua directive (user services sudah run as invoking user)
4. Reload daemon, trigger service, verifikasi exit code

## Findings

**Root cause:** Service file memiliki `User=orangepi` dan `Group=orangepi` di `[Service]` section. Pada systemd user services (`--user`), kedua directive ini redundant dan berbahaya — systemd sudah menjalankan service sebagai user yang memanggilnya. `Group=orangepi` menyebabkan systemd mencoba `setgid` yang gagal dengan `EPERM` (exit 216/GROUP).

**Error message:**
```
hermes-logrotate.service: Failed at step GROUP spawning /usr/sbin/logrotate: Operation not permitted
```

**Fix:** Hapus `User=` dan `Group=` dari service file. Systemd user services inherit UID/GID dari session.

**Measurement:**
- `hermes-logrotate.service` exit code: `216/GROUP` → `0/SUCCESS` ✅
- Log rotate execution time: 98ms
- Dampak: log rotation sudah berjalan normal kembali. Tanpa fix, semua Hermes log files (`gateway.log`, `errors.log`, `agent.log`, dll) akan terus bertambah tanpa rotasi — potensi disk fill.

**File changed:**
- `~/.config/systemd/user/hermes-logrotate.service` — hapus `User=` dan `Group=` lines

## Decision
**Adopt** — fix minimal, root cause langsung teratasi, service sudah terverifikasi.

## Risk
Minimal. User services sudah run sebagai `orangepi` — tidak ada privilege change.

## Lessons Learned
`User=` dan `Group=` di systemd `--user` services bukan hanya redundant, tapi bisa menyebabkan `EPERM` pada step GROUP. Best practice: jangan set User/Group di user services.

## Next Priority
- Verifikasi logrotate berjalan normal besok (cek state file update)
