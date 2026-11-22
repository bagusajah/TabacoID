---
task_id: t_9727a169
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-22
status: published
human_review: autonomous
---

# Root-Cause: SSH Cron ke VPS Gagal (Permission Denied / Port 22 Refused)

## Engineering Question
Kenapa sesi cron engineering hari ini (2026-11-22 09:00 & 10:01) gagal mengaudit VPS dengan `Permission denied (publickey)` dan `Connection refused`, dan apakah akses VPS masih berfungsi?

## Method
- Scan `~/.hermes/logs/errors.log` (24 jam terakhir) → dua sesi cron gagal SSH.
- Reproduksi gagal: `ssh tabacoweb@100.65.68.15` (port default 22) → `Connection refused`.
- Reproduksi sukses: `ssh vps-internal` (alias `~/.ssh/config`, port 2222) → login root OK, `hostname` = `host.tabaco.id`.
- Bandingkan konfigurasi: `~/.ssh/config` sudah benar sejak lama; yang gagal adalah panggilan IP mentah tanpa `-p 2222`.
- Cek expiry cert www.tabaco.id via openssl (tanpa SSH).

## Findings (with measurements)
- `ssh_error_rate_cron_sessions: 2/2 sesi yang mencoba SSH hari ini gagal (100%)` — karena pakai IP mentah port 22.
- `ssh_via_alias_success: 2/2 (100%)` — `vps-internal` (root) dan `vps-web` (tabacoweb, sftp-only) keduanya OK port 2222.
- Root cause: **command-shape mismatch**, bukan credential rusak. Key auth (`~/.ssh/id_ed25519`) berfungsi normal.
- Bonus (V1, backlog): `certbot: not found` di VPS; cert `www.tabaco.id` valid s.d. **31 Des 2026** (39 hari) — tapi tidak ada timers certbot-renewal terlihat. Perlu follow-up.
- Upstream fix (blok `Host 100.65.68.15` di `~/.ssh/config`) **diblokir security guard** — write ke ssh config dari cron session menunggu approval user.

## Decision
Needs Human Review (untuk 1 blok config) + mitigasi sudah diterapkan:
1. ✅ Memory `USER.md` diperbaiki: port 2222 ditandai eksplisit, arahkan ke alias `vps-internal`/`vps-web`.
2. ⏳ Menunggu approval — tambahkan blok ini ke `~/.ssh/config` (aman: hanya menambahkan Host baru, tidak mengubah Host lama):

```
Host 100.65.68.15
    HostName 100.65.68.15
    Port 2222
    User root
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
```
Setelah itu `ssh root@100.65.68.15` dan `ssh tabacoweb@100.65.68.15` (via `-l`/scp) otomatis benar tanpa alias.

## Risk
Rendah. Perubahan diterapkan hanya di memory agent (reversible, satu baris). Blok config yang diusulkan hanya menambah entri baru — tidak menyentuh `vps-internal`, `vps-web`, atau `gameserver`.

## Lessons Learned
- Guard write ke `~/.ssh/config` bekerja seperti desain — cron tidak boleh mengubah credential/access tanpa human review. Jalur mitigasi yang benar: memory + laporan, bukan retry dengan path lain.
- Memory `IP:port` tanpa penekanan "port 22 mati" cukup untuk membuat agent berikutnya mengimprovisasi command yang salah. Memory harus menyimpan **command shape yang benar**, bukan cuma endpoint.

## Next Priority
- Approve blok `Host 100.65.68.15` di `~/.ssh/config` (30 detik kerja manual).
- V1 follow-up: instal/wiring certbot di VPS sebelum 31 Des 2026 (39 hari), atau pastikan renewal sudah ditangani HestiaCP (perlu verifikasi di panel).
