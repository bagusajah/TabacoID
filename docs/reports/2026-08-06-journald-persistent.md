# Daily Report 2026-08-06 — Journald Persistent Storage

## Engineering Question
Apakah journald persistent storage diperlukan untuk user services, dan berapa data yang hilang pada reboot?

## Method
Audit konfigurasi journald saat ini, cek apakah user services (hermes-dashboard, hermes-gateway) benar-benar menggunakan journald, hitung volume log yang hilang pada reboot volatile storage.

## Findings

**Premis task salah — user services tidak menggunakan journald.**
- `journalctl --user -u hermes-gateway` → 0 entries
- `journalctl --user -u hermes-dashboard` → 0 entries
- Hermes services log ke file sendiri di `~/.hermes/logs/` (Python logging, ~4MB total, punya rotation sendiri)

**System journald volatile — data yang hilang per reboot:**

| Metric | Value |
|--------|-------|
| Total lines in volatile journal | 140,896 lines |
| Error/fail lines | 20,424 lines |
| Docker/container lines | 153 lines |
| Kernel/oom/kill lines | 298 lines |
| Journal size (RAM) | 112.5 MB |
| Uptime sejak boot | 18 hari |
| Disk available | 187 GB |
| /var/log/ current | 52 MB |

**Tindakan yang diambil:**
- Buat drop-in `/etc/systemd/journald.conf.d/persistent.conf`
- `Storage=persistent` (write ke `/var/log/journal/`, survive reboot)
- `SystemMaxUse=200M` (dari 20M yang terlalu kecil, cukup untuk ~30 hari log)
- RuntimeMaxUse tetap 100M (tmpfs fallback)
- **Belum restart journald** — restart akan flush 112.5M volatile journal. Efektif setelah reboot berikutnya.

## Decision
**Adopt** — dengan koreksi scope. User services tidak perlu journald (sudah punya file logging sendiri), tapi system journald HARUS persistent. Config drop-in sudah di-apply, efektif setelah reboot.

## Risk
- Zero risk sekarang — config ter-apply tanpa restart. 112.5M volatile journal tetap ada sampai reboot.
- Setelah reboot: /var/log/journal/ akan mulai dari kosong, build up ~6.25M/hari, max 200M (30 hari retention).
- /var/log/ naik dari 52M → ~252M max. Masih sangat kecil dibanding 187G available.

## Lessons Learned
- Task backlog "setup journald untuk user services" berbasis asumsi salah. User services di mesin ini TIDAK routing log ke journald — mereka punya Python file logging sendiri. Investigasi sebelum eksekusi menghindari work yang tidak diperlukan.
- SystemMaxUse=20M pada konfigurasi awal adalah batas yang sangat agresif untuk production machine — akan drop log penting sebelum rotation.

## Next Priority
- Pertimbangkan forwarding stderr user services ke journald (StandardOutput=journal di unit file) untuk konsolidasi log — tapi ini nice-to-have, bukan kebutuhan karena file logging sudah adequate.
