---
task_id: t_022bf035
objective: OBJ-004
date: 2026-08-11
status: draft
---

# Docker Build Cache Prune

## Pertanyaan Engineering
Build cache Docker menumpuk (36 entries, 418.9MB) dengan 151.4MB immediately reclaimable. Webreader adalah satu-satunya workload Docker, rebuild terakhir 35h lalu. Cache tidak memberikan value antar-rebuild. Bisa di-prune untuk reclaim disk space?

## Metode
1. Capture baseline: `docker system df`
2. Prune unused build cache: `docker builder prune -f`
3. Verify: `docker system df` menunjukkan Build Cache RECLAIMABLE = 0
4. Cek disk space impact: `df -h /`

## Findings (dengan pengukuran)

**Before:**
| Metric | Value |
|--------|-------|
| Build Cache entries | 36 |
| Build Cache total size | 418.9MB |
| Build Cache reclaimable | 151.4MB |
| Root filesystem used | 35G / 234G (15%) |

**After:**
| Metric | Value |
|--------|-------|
| Build Cache entries | 25 (-11) |
| Build Cache total size | 267.5MB (-151.4MB) |
| Build Cache reclaimable | **0B** (target tercapai) |
| Root filesystem used | 35G / 234G (15%) |

**Space reclaimed:** 151.4MB immediately reclaimable freed. 25 cache entries tersisa adalah cache aktif/in-use yang tidak bisa di-reclaim tanpa `--all`.

**Catatan:** 11 entries dari 36 yang ter-prune. Sisa 25 entries adalah cache layers yang masih aktif (0 active workload tapi referenced). Disk usage percentage tidak berubah signifikan karena root filesystem 234G sangat lapang (15% used).

## Decision
**Adopt.** Prune sukses, success metric tercapai (RECLAIMABLE = 0B). Risiko minimal — cache rebuild otomatis pada next `docker compose build`.

Untuk weekly prune cron safety net: **tunda**. 419MB cache pada host dengan 197G free tidak signifikan. YAGNI — tambah cron job kalau cache growth jadi masalah nyata (>2GB), bukan sekarang.

## Risk
- Sangat rendah. Cache rebuild pada next build, tidak ada data loss.
- 267.5MB cache tersisa aman dibiarkan (referenced layers).

## Lessons Learned
- `docker builder prune -f` (tanpa `--all`) hanya remove unused cache — safe default.
- Build cache growth pada single-workload host cenderung lambat (36 entries over beberapa minggu).
- Disk space host sangat adequat (15% used dari 234G) — cache prune lebih ke hygiene ketimbang necessity.

## Next Priority
- Tidak ada follow-up langsung. Monitor build cache growth; kalau >2GB, pertimbangkan weekly prune cron.
