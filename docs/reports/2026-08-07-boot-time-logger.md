---
task_id: t_BOOTLOG01
objective: OBJ-002
date: 2026-08-07
status: draft
---

# Boot Time Logger: Auto-Capture setiap Boot

## Engineering Question
Report `2026-08-07-disable-unnecessary-services-reboot-prep.md` menyebutkan
reboot verification tidak bisa dilakukan autonomous di cron job karena process
death saat reboot. Bagaimana caranya capture boot time otomatis tiap boot tanpa
intervensi manual?

## Method
Buat systemd **user** unit (bukan system — hindari sudo untuk write ke `/var/log`):

1. `boot-time-logger.service` — oneshot, runs `systemd-analyze time >> ~/boot-times.log` dengan boot ID + timestamp UTC
2. `boot-time-logger.timer` — `OnBootSec=30s`, `Persistent=true`, enabled
3. Validate dengan `systemd-analyze verify` → pass
4. Test manual run untuk konfirmasi log terisi

## Findings

**Unit verification:** `systemd-analyze verify` → VERIFY_OK (hanya warning pre-existing untuk system unit orang lain, irrelevant).

**Timer status:** `active (running)`, enabled, linked di `timers.target.wants/`.

**Log capture test:** Manual `systemctl --user start` menghasilkan 2 entries di `~/boot-times.log`:
```
=== f704012a6dfc49df9be346dd08359878 2026-08-07T17:00:05Z ===
Startup finished in 4.087s (kernel) + 2min 3.773s (userspace) = 2min 7.860s
multi-user.target reached after 38.249s in userspace
```

**Boot time saat ini (baseline):**
- Kernel: 4.087s
- Userspace: 2m 3.773s
- **Total: 2m 7.860s**
- multi-user.target: 38.249s setelah userspace start

**Files created:**
- `~/.config/systemd/user/boot-time-logger.service` (281 bytes)
- `~/.config/systemd/user/boot-time-logger.timer` (124 bytes)
- `~/boot-times.log` (384 bytes, 2 entries)

## Decision
**Adopt.** Solusi sederhana, zero-dependency, menggunakan stdlib systemd. Timer aktif dan akan auto-capture pada boot berikutnya (30s after boot). Baseline boot time 2m7.8s sudah tercatat — siap untuk trend tracking pasca service-disable yang dilakukan di task sebelumnya.

## Risk
- **Low.** User systemd unit, tidak butuh root. Rollback: `systemctl --user disable --now boot-time-logger.timer && rm unit files`.
- 30s delay (`OnBootSec=30s`) cukup aman — `systemd-analyze time` tetap akurat karena baca data dari kernel yang sudah final di awal boot.
- Log file tidak di-rotate. Untuk volume ini (1 entry per boot), tidak akan jadi masalah dalam bertahun-tahun.

## Lessons Learned
- Problem "cron job mati saat reboot" tidak perlu dipecahkan dari sisi cron. Systemd timer event-driven (`OnBootSec`) adalah tool yang tepat — bukan cron polling.
- User systemd unit cukup untuk kebutuhan ini. System unit + sudo untuk `/var/log` adalah over-engineering untuk log yang cuma 1 baris per boot.

## Next Priority
Setelah reboot berikutnya, compare boot time baru vs baseline 2m7.8s untuk validasi impact dari service-disable (task sebelumnya menonaktifkan beberapa service unnecessary). Kalau userspace time turun signifikan → adopt sebagai permanent. Kalau tidak → investigasi service mana yang masih heavy.
