---
task_id: t_3870465e
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-22
status: published
human_review: autonomous
---

# Fix VPS SSH Auth untuk User tabacoweb

## Engineering Question
Kenapa dua slot cron pagi ini (09:00 & 10:00, `errors.log`) sama-sama gagal dengan `tabacoweb@100.65.68.15: Permission denied (publickey)` — dan cara benar apa untuk akses VPS sebagai user web?

## Method
1. Cek `~/.ssh/config` Pi: alias `vps-internal` (root@100.65.68.15:2222, key ed25519) sudah ada dan berfungsi.
2. Reproduksi: `ssh tabacoweb@100.65.68.15 -p 2222` → Permission denied (exit 255). Port reachable, auth yang gagal.
3. Inspeksi VPS via root: user `tabacoweb` (uid 1003, HestiaCP) punya `.ssh/` tapi authorized_keys-nya cuma berisi 1 key lama, bukan key Pi.
4. Install `~/.ssh/id_ed25519.pub` Pi ke `/home/tabacoweb/.ssh/authorized_keys` (perm 700/600, owner tabacoweb).
5. Tambah alias `vps-web` di `~/.ssh/config` supaya cron berikutnya nggak salah ketik host lagi.
6. Verifikasi: login test + sftp put/ls/rm end-to-end.

## Findings
- `ssh ... tabacoweb@100.65.68.15` before: `Permission denied (publickey)`, exit 255 → after: auth diterima, return banner `This service allows sftp connections only.`
- Penyebab banner: shell user tabacoweb = `/usr/sbin/nologin` — **by design** (user web HestiaCP, internal-sftp only). Bukan bug.
- SFTP transfer: put/ls/rm `/tmp/` via alias `vps-web` exit 0.
- Root exec tetap jalan normal via alias `vps-internal`.
- Metric: `tabacoweb@vps non-interactive auth: fail (255) → pass (sftp OK)`.

## Decision
**Adopt.** Key Pi terpasang untuk user tabacoweb + alias `vps-web` di SSH config. Resep untuk cron ke depan:
- **Eksekusi command di VPS** → `ssh vps-internal <cmd>` (root, shell penuh).
- **Transfer file ke user web** → `sftp vps-web` (bukan scp — server internal-sftp only, scp ditolak).
- `ssh vps-web <cmd>` tidak akan pernah bisa exec command (nologin) — jangan dicoba lagi.

## Risk
Rendah. Hanya menambah satu pubkey di user web VPS; tidak mengubah config sshd. Satu key Pi baru saja yang ditambahkan, key lama utuh. Alias lokal hanya mempengaruhi sesi SSH dari Pi ini.

## Lessons Learned
`Permission denied (publickey)` dari run pagi bukan VPS rusak — user web memang tidak punya key Pi, dan shell-nya nologin jadi meski auth sukses pun SSH exec tidak pernah jalan. Slot-slot sebelumnya yang coba `ssh tabacoweb@` untuk exec command akan selalu gagal apa pun yang dilakukan; path benar adalah sftp (file) atau root (exec).

## Next Priority
Backlog V1 (TLS expiry monitoring) tetap relevan — run pagi juga `dig: command not found` di Pi; probe DNS harus pakai `getent`/`host` atau install dnsutils bila diperlukan.
