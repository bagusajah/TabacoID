---
task_id: t_de823f75
objective: OBJ-002
date: 2026-08-08
status: draft
---

# Fix rc-local.service Failure: Stale HestiaCP Reference

## Engineering Question
Kenapa `rc-local.service` failed di setiap boot, dan apa dampaknya terhadap reliability host?

## Method
1. Scan systemd failed units: `systemctl --failed` → `rc-local.service` (exit-code 127)
2. Inspect unit: `systemctl status rc-local.service` → `ExecStart=/etc/rc.local start (code=exited, status=127)`
3. Baca `/etc/rc.local`: berisi `/usr/local/hestia/bin/v-update-sys-ip` lalu `exit 0`
4. Verifikasi keberadaan HestiaCP: `ls /usr/local/hestia/` → tidak ada. `dpkg -l | grep hestia` → tidak ada package
5. Backup `/etc/rc.local` ke `/etc/rc.local.bak-20260808`
6. Edit: hapus baris dead reference, sisakan `exit 0` saja
7. `systemctl reset-failed rc-local.service && systemctl start rc-local.service`
8. Verifikasi: exit 0/SUCCESS, 0 failed units

## Findings (with measurements)
- **Root cause:** `/etc/rc.local` memanggil `/usr/local/hestia/bin/v-update-sys-ip` — binary dari HestiaCP yang **tidak pernah terinstall** di host ini (no package, no directory). Exit code 127 = command not found.
- **Failed systemd units (system): 1 → 0**
- **Failed systemd units (user): 0 → 0** (sudah bersih dari task sebelumnya t_2ADDCB2A)
- **rc.local exit code: 127 → 0**
- **Service state: failed → active (exited)**
- **Service ini gagal di setiap boot** sejak host dibuild — jejak HestiaCP dari image/template yang dipakai Orange Pi, tapi software-nya tidak terinstall.

## Decision
**Adopt.** Dead reference dihapus. `rc.local` sekarang clean (hanya `exit 0`). Backup tersimpan di `/etc/rc.local.bak-20260808` untuk rollback.

## Risk
- **Very low.** Baris yang dihapus adalah binary dari software yang tidak ada — tidak mungkin punya efek fungsional.
- HestiaCP kemungkinan jejak dari base image. Kalau di masa depan HestiaCP memang diinstall, tinggal restore barisnya dari backup.

## Lessons Learned
1. **Base image artifact** — Orange Pi / Armbian image kadang membawa config sisa dari template (HestiaCP) yang tidak relevant. Worth auditing `/etc/rc.local`, crontab, dan startup scripts setelah fresh install.
2. **Exit code 127** = "command not found" — langsung tunjukkan dead reference, bukan bug logic.
3. **Failed unit ini selalu ada** di setiap audit systemd sebelumnya tapi tidak pernah di-flag sebagai prio karena tidak blocking service lain. Tetap, 1 failed unit = noise di monitoring dan bisa mask issue lain.

## Next Priority
- `rc-local.service` sendiri sebenarnya legacy compatibility shim. Kalau `/etc/rc.local` kosong (hanya exit 0), pertimbangkan untuk **disable service entirely** (`systemctl disable rc-local`) untuk eliminasi noise — tapi hanya kalau tidak ada rencana menambahkan startup script via rc.local di masa depan.
- Masih ada 115 pending APT updates (termasuk security: accountsservice, ffmpeg, gawk, gstreamer family). Audit dan apply security updates bisa jadi task berikutnya.
