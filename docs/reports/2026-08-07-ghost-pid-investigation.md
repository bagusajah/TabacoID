---
human_review: autonomous
---

# Daily Report 2026-08-07 — Investigasi Ghost PID Issue di Systemd Services

## Pertanyaan Engineering
Apakah ada "ghost PID" di systemd services — yaitu proses yang sudah mati tapi systemd masih bilang `active/running`?

## Metode
1. Scan semua system-level service (31 running) dan user-level service (14 running) untuk MainPID vs process existence
2. Dua metode pengecekan: `kill -0 $PID` (non-root) dan `sudo kill -0 $PID` (root)
3. Cross-check SubState vs MainPID untuk anomali
4. Cek zombie processes dan failed services

## Temuan (dengan pengukuran)

### Root Cause: False Positive

**29 dari 31 system services terdeteksi sebagai "ghost PID" saat menggunakan `kill -0` non-root.** Tapi dengan `sudo kill -0`, **0 ghost PID** — semua proses hidup.

| Metode Check | Ghost Count | Penjelasan |
|-------------|-------------|------------|
| `kill -0 $PID` (orangepi, non-root) | **29** | False positive — can't signal root-owned PIDs |
| `sudo kill -0 $PID` (root) | **0** | Semua proses alive |
| SubState=running + MainPID=0 | **0** | Tidak ada anomali |
| Zombie processes | **0** | Clean |
| Failed services | **0** | Clean |

### Verdict

**Original claim "11 ghost PID" adalah false positive.** Cron session yang membuat claim tsb menjalankan `kill -0` sebagai user `orangepi` terhadap process yang dimiliki root (accounts-daemon, chrony, docker, ssh, dll). `kill -0` gagal bukan karena proses mati, tapi karena insufficient permission (`EPERM`).

### System Health Saat Ini

| Metric | Value |
|--------|-------|
| Uptime | 19d 23h |
| System running services | 31 |
| User running services | 14 |
| Failed services | **0** |
| Zombies | **0** |
| Ghost PIDs (verified with root) | **0** |
| RAM used | 2.5 GB / 7.7 GB (32%) |
| Swap used | 115 MB / 3.9 GB |
| Disk | 34 GB / 234 GB (15%) |
| Load avg | 0.34 / 0.38 / 0.33 |

### Takeaway untuk Cron Sessions

`kill -0` dari non-root terhadap root-owned process mengembalikan exit code 1 — identik dengan "proses tidak ada". Untuk reliable ghost PID detection, gunakan salah satu:
1. `sudo kill -0 $PID` — butuh root
2. `ls /proc/$PID/status 2>/dev/null` — juga butuh root (di sistem dengan hidepid)
3. `systemctl show $svc --property=SubState` — **ini cara yang benar**, no root needed

## Keputusan
**Adopt (as negative result)** — Tidak ada ghost PID. Systemd services semuanya healthy. Original claim adalah false positive dari permission-limited PID check.

## Risiko
Tidak ada — ini pure audit, zero system changes.

## Lessons Learned
- `kill -0` bukan reliable indicator untuk "proses hidup" ketika dijalankan oleh non-root user terhadap root-owned process. EPERM dan ESRCH return exit code yang sama (1).
- `systemctl show --property=SubState` adalah cara yang benar untuk cek service health tanpa root privilege.
- Auto-generated follow-up task dari cron output yang mengandung false positive bisa menghabiskan engineering cycle untuk investigation yang tidak perlu.

## Prioritas Berikutnya
Tidak ada follow-up diperlukan — ini adalah closed investigation.
