---
human_review: autonomous
---

# Daily Report 2026-08-07

## Engineering Question
Bagaimana setup periodic SMART snapshot mingguan untuk NVMe trend tracking?

## Method
Buat script shell yang menjalankan `nvme smart-log`, parse output ke JSONL, simpan snapshot mingguan. Setup sudoers NOPASSWD agar cron bisa run tanpa interaksi. Tambahkan entry ke user crontab (setiap Senin 04:30).

## Findings

| Komponen | Detail |
|---|---|
| Script | `~/.hermes/scripts/nvme-smart-snapshot.sh` (41 baris) |
| Output | `~/.hermes/logs/nvme-smart.jsonl` (JSONL format, 1 baris per snapshot) |
| Sudoers | `/etc/sudoers.d/nvme-smart` — NOPASSWD untuk `nvme smart-log /dev/nvme0n1` saja |
| Cron | Senin 04:30 WIB (setelah backup jobs di 03:00-04:30) |
| Retention | 520 entries (~10 tahun, tail-based trim) |

**Baseline snapshot tercatat:**
```json
{"ts":"2026-08-07T03:52:52+07:00","temp":45,"spare":100,"pct_used":0,"data_read":4143249,"data_written":1355184,"power_cycles":99,"power_hours":5889,"unsafe_shutdowns":98,"media_errors":0}
```

**Parsing challenge:** `nvme smart-log` output pakai tab separator, bukan colon-only. `grep -P "^key\t"` diperlukan untuk match tepat (bukan `grep "^key$"` yang gagal karena trailing tabs). Angka ada comma separator (e.g., `4,143,249`) dan percentage sign — di-strip via `tr -d ',%'`.

## Decision
Adopt — script terpasang, cron aktif, snapshot pertama terekam.

## Risk
- `nvme-cli` bisa di-uninstall oleh `apt autoremove` jika bukan manually installed → kecil, paket ini explicit install dari report sebelumnya
- Tidak ada alerting jika `pct_used` naik signifikan → monitoring passif saja, OK untuk now

## Lessons Learned
- `nvme smart-log` format lebih reliable untuk parsing daripada `smartctl` (yang butuh NVMe passthrough driver dan output-nya verbose)
- Sudoers per-entry (1 command spesifik) lebih aman daripada ALL atau wildcard
- Pattern yang sama dengan `memory-baseline.sh` — JSONL + tail trim = zero-dependency time-series

## Next Priority
- Setelah beberapa minggu snapshot terkumpul, buat query script untuk trend analysis (GB written per minggu, temperature drift, dll)
- Investigasi unsafe shutdown pattern (98/99) — masih terbuka dari report sebelumnya
