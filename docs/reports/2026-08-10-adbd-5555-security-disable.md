---
task_id: t_5b1a0e27
objective: OBJ-002
date: 2026-08-10
status: draft
human_review: autonomous
---

# Disable adbd:5555 Exposure di 0.0.0.0 (Security Follow-up)

## Engineering Question
Audit SSH/network sebelumnya mendeteksi adbd listening di `0.0.0.0:5555`. Apakah ini perlu running, dan kalau tidak, bagaimana cara disable-nya secara permanen?

## Method
1. Identifikasi proses: `ss -tlnp` → PID 803 (`/usr/bin/adbd`), parent PID 801 (`/usr/bin/usbdevice start`)
2. Trace root cause: `usbdevice.service` (Orange Pi BSP) → runs `/usr/bin/usbdevice start` → sources `/etc/profile` → membaca `/etc/profile.d/usbdevice.sh` yang set `USB_FUNCS="adb"` → spawn adbd via FunctionFS
3. Verifikasi usage: grep seluruh project repo (TabacoID, webreader, cicd-release-console) — tidak ada reference ke adb/5555/android debugging. Board ini headless server, bukan device Android yang butuh USB debugging.
4. Risk assessment: adbd binds `0.0.0.0:5555`, reachable dari semua host di LAN `192.168.10.0/24`. Tidak exposed via VPS/Tailscale. Adbd versi android-tools 4.2.2 (sangat lama) dengan TCP mode — potential shell access untuk siapa saja di LAN.

## Findings (with measurements)

**Before:**
- `LISTEN 0 0 0.0.0.0:5555 0.0.0.0:*` — adbd exposed ke seluruh LAN
- 1 proses adbd (PID 803) + 1 proses usbdevice supervisor (PID 801)
- Config: `/etc/profile.d/usbdevice.sh` → `export USB_FUNCS="adb"`

**After:**
- `listeners on 5555: 0` ✓
- 0 proses adbd/usbdevice running
- Config: `USB_FUNCS` dikomentari di `/etc/profile.d/usbdevice.sh` dengan ponytail comment explaining why

**Changes made:**
1. `/etc/profile.d/usbdevice.sh` — commented out `export USB_FUNCS="adb"` (backup: `usbdevice.sh.bak-20260810`)
2. Killed PID 803 (adbd) — supervisor (801) exited naturally
3. `usbdevice.service` now inactive; on reboot will run but with empty `USB_FUNCS` → no adbd spawn

**Metric:** `port_5555_listeners: 1 → 0` (sebelum: 1 listener di 0.0.0.0, sesudah: 0)

## Decision
**Adopt.** adbd di-disable permanen. Headless server Orange Pi tidak butuh Android USB debugging. Port 5555 yang terbuka ke LAN adalah attack surface tanpa use case. Revert path jelas: uncomment line di `/etc/profile.d/usbdevice.sh` dan reboot.

## Risk
- **Low.** Tidak ada consumer adbd di seluruh infrastruktur Hermes.
- Jika di masa depan butuh ADB (e.g., flash firmware via USB OTG), uncomment `USB_FUNCS="adb"` di `/etc/profile.d/usbdevice.sh` + reboot.
- Backup config tersimpan di `/etc/profile.d/usbdevice.sh.bak-20260810`.

## Lessons Learned
- Orange Pi BSP image pre-configured dengan USB gadget adb mode untuk development convenience. Ini security debt yang harus di-audit saat deploy ke production.
- Root cause tracing: bukan hanya kill proses, tapi temukan config source (`/etc/profile.d/usbdevice.sh`) yang menyebabkan spawn di boot. Patch di config level, bukan process level.

## Next Priority
- Consider audit USB gadget functions lainnya (rndis, mtp, uvc) — saat ini `USB_FUNCS` kosong, jingga semua non-aktif. Sudah optimal.
- SSH/network audit follow-up lainnya masih bisa di-cek untuk exposure serupa.
