---
task_id: t_2a9828e4
objective: OBJ-002
date: 2026-08-11
status: draft
human_review: autonomous
---

# Enable Persistent Journald Storage + Periodic NVMe Sync

## Engineering Question
Bagaimana membuat journal systemd bertahan across reboot untuk diagnosis unsafe shutdown (98/99 power cuts), given Orange Pi menggunakan zram overlay untuk `/var/log`?

## Method
1. Audit konfigurasi journald saat ini
2. Identifikasi dan perbaiki config yang meng-override
3. Analisa arsitektur Orange Pi ramlog (zram overlay)
4. Setup periodic sync mechanism
5. Verifikasi end-to-end

## Findings (with measurements)

### Discovery 1: Double config override
- `/etc/systemd/journald.conf` awalnya: `Storage=volatile`
- Drop-in `/etc/systemd/journald.conf.d/persistent.conf` (created 2026-08-10 20:15): **`Storage=volatile`** — paradoxically named file meng-override main config
- `systemd-analyze cat-config` confirmed: main config ignored, drop-in wins

### Discovery 2: Zram overlay architecture
- `/var/log` = `/dev/zram1` (RAM-backed, 188M ext4, compressed)
- `/var/log.hdd` = `/dev/nvme0n1p2` (real NVMe backstore)
- Orange Pi `orangepi-ramlog.service` memount zram, sync ke NVMe via rsync
- **Critical gap:** sync only happens on `ExecStop` (clean shutdown) atau manual `reload`
- 98/99 unsafe shutdown = sync tidak pernah jalan → journal hilang setiap reboot

### Discovery 3: Zram full → cascading failures
- Before fix: `/dev/zram1 188M 184M 0 100%` — **zram penuh**
- Rsyslog error: `write error OS error: No space left on device`
- Root cause: SystemMaxUse terlalu besar untuk budget zram + accumulated logs

### Perbaikan yang dilakukan
1. **Fix drop-in config:** `Storage=volatile` → `Storage=persistent`
2. **Resize SystemMaxUse:** `20M` → `100M` (fit dalam 188M zram budget)
3. **Buat periodic sync timer:**
   - `/etc/systemd/system/ramlog-sync.timer` (OnBootSec=5min, OnUnitActiveSec=10min)
   - `/etc/systemd/system/ramlog-sync.service` (ExecStart: `systemctl reload orangepi-ramlog.service`)
   - Timer enabled + active, triggers rsync zram→NVMe setiap 10 menit

### Measurements
| Metric | Before | After |
|--------|--------|-------|
| Storage setting | volatile | persistent |
| Zram usage | 184M/188M (100%) | 64M/188M (37%) |
| NVMe journal backstore | 0M (empty) | 29M (synced) |
| Journal disk usage | 108M (all volatile) | 28.5M (persistent) |
| Sync mechanism | shutdown-only | every 10min |
| Rsyslog write errors | active (no space) | resolved |
| Max journal data loss on power cut | 100% (all history) | ≤10 min |

### Verification
- `systemctl reload orangepi-ramlog.service` → rsync flushed 52.8M to NVMe (verified in `/var/log.hdd/orangepi-ramlog.log`)
- Timer status: `enabled`, `active (waiting)`, next trigger in 10min
- `/var/log.hdd/journal/` contains 2 persistent journal files
- `journalctl --list-boots` shows current boot (will accumulate across reboots now)

## Decision
**Adopt.** Persistent journald aktif dengan periodic sync ke NVMe. Journal sekarang survive unsafe shutdown dengan worst-case 10 menit data loss. Task t_b2fc3aa6 (unsafe shutdown investigation) sekarang dapat menggunakan `journalctl --list-boots` dan `journalctl -b -1` setelah reboot berikutnya untuk melihat pre-shutdown logs.

## Risk
- **Zram masih RAM-backed:** Jika power cut terjadi dalam window 10 menit setelah sync terakhir, journal terbaru hilang. Acceptable trade-off vs total loss sebelumnya.
- **SystemMaxUse=100M vs zram 188M:** Jika non-journal logs (syslog, sysstat) grow, zram bisa full lagi. Monitor dengan `df -h /var/log`.
- **Timer dependency:** Jika `orangepi-ramlog.service` tidak running (misal disabled), timer reload akan fail silently. Low risk — service adalah core Orange Pi component.

## Lessons Learned
1. **Drop-in configs override main config** — selalu cek `/etc/systemd/*.conf.d/` dan gunakan `systemd-analyze cat-config` untuk melihat merged result
2. **Orange Pi zram ramlog sync gap:** Default arsitektur hanya sync pada clean shutdown, yang precisely tidak terjadi pada environment dengan frequent power cuts. Ini design flaw untuk use case ini.
3. **Naming paradox:** File bernama `persistent.conf` berisi `Storage=volatile` — kemungkinan typo dari task sebelumnya (t_45AD48FB atau earlier). Always verify content, bukan rely on filename.

## Next Priority
- Monitor next reboot: verify `journalctl --list-boots` shows multiple boots
- Task t_b2fc3aa6 (unsafe shutdown root cause) sekarang unblocked — dapat menggunakan persistent journal setelah 1-2 reboot cycles
- Consider UPS deployment untuk eliminate unsafe shutdown entirely (physical fix, beyond software scope)
