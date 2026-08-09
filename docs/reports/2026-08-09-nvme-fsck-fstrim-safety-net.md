---
task_id: t_e62621a9
objective: OBJ-002
date: 2026-08-09
status: draft
---

# Enable Filesystem Auto-fsck + fstrim.timer untuk NVMe Safety Net

## Engineering Question
Audit zram-nvme sebelumnya menemukan 98/99 unsafe shutdowns (99%) tapi fsck auto-check dimatikan dan fstrim.timer disabled. Bagaimana cara termudah mengaktifkan dua safety net ini tanpa disruption?

## Method
1. Cek konfigurasi tune2fs saat ini (mount count, max mount count, check interval)
2. Cek status fstrim.timer dan dukungan TRIM partisi NVMe
3. Apply: `tune2fs -c 30 -i 30d` (auto-fsck setiap 30 mount atau 30 hari)
4. Apply: `systemctl enable --now fstrim.timer` (periodic TRIM mingguan)
5. Jalankan `fstrim -v /` sekali untuk baseline
6. Verifikasi semua perubahan

## Findings (with measurements)

### Auto-fsck (tune2fs)
| Metric | Before | After |
|--------|--------|-------|
| Maximum mount count | -1 (disabled) | **30** |
| Check interval | 0 (none) | **30 days (2,592,000s)** |
| Current mount count | 67 | 67 (will trigger fsck on next reboot) |

Karena mount count (67) sudah melebihi max (30), fsck akan run pada boot berikutnya. Ini exactly safety net yang dibutuhkan mengingat 99% unsafe shutdown rate.

### fstrim.timer (periodic TRIM)
| Metric | Before | After |
|--------|--------|-------|
| Enabled | disabled | **enabled** |
| Active | inactive | **active** |
| Next run | — | Mon 2026-08-10 00:50 WIB |
| Manual trim (first run) | — | **199.7 GiB trimmed** |

199.7 GiB dari 234 GiB total partisi — hampir semua free space di-trim. NVMe butuh TRIM untuk menjaga write performance dan wear leveling.

## Decision
**Adopt.** Dua perubahan config minimal, zero disruption, high safety value:
- fsck otomatis melindungi dari silent corruption setelah 99% unsafe shutdown rate
- TRIM menjaga NVMe performance + longevity (device sudah 5,934 power-on hours)

Tidak perlu reboot. fsck akan run natural pada reboot berikutnya.

## Risk
- **Low:** fsck pada boot berikutnya mungkin memakan 1-3 menit extra. Acceptable tradeoff.
- **fstrim.timer:** Weekly TRIM adalah standard, zero risk di NVMe modern.
- Rollback trivial: `tune2fs -c -1 /dev/nvme0n1p2` dan `systemctl disable fstrim.timer`.

## Lessons Learned
- Safety net yang dimatikan (max mount -1) adalah anti-pattern di environment dengan power instability. Default ext4 (20 mounts) ada untuk alasan.
- fstrim.timer seharusnya enabled by default di Ubuntu server install — ini tertimpa mungkin karena custom image Orange Pi.
- 99% unsafe shutdown rate tidak menyebabkan corruption selama ini karena NVMe PLP (power-loss protection), tapi itu adalah mitigasi hardware, bukan filesystem-level guarantee.

## Next Priority
1. **Investigate unsafe shutdown root cause** — pstore/ramoops untuk capture crash logs. Masih open dari audit sebelumnya.
2. **Monitor fsck result** — setelah reboot berikutnya, check `dmesg | grep -i ext4` untuk hasil fsck.
3. **Dashboard memory anomaly** — gateway PID 1857 menggunakan 68.3% CPU dan 758 MB RSS. Kemungkinan memory leak atau busy loop. Worth investigating.
