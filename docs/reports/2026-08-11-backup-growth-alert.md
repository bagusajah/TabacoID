---
task_id: t_652a8afc
objective: OBJ-002
date: 2026-08-11
status: draft
---

# Backup Growth Alert & Root Cause Analysis

## Engineering Question
Backup harian Hermes tumbuh 2.3x dalam 5 hari (26M→58M). Apakah growth ini berbahaya untuk disk, dan apakah root cause-nya? Bisakah kita pasang alert untuk catch anomali di masa depan?

## Method
1. Ekstrak ukuran harian dari `backup-state.json` (5 entries: Aug 7–11)
2. Breakdown ukuran setiap item yang di-backup dengan `du -sh`
3. Analisis `state.db` internal: table-level size via `dbstat`, message count, FTS index layout
4. Cek retention behavior script backup
5. Tambah size-delta alert ke `hermes-backup.sh`
6. Validasi script syntax + alert logic

## Findings (with measurements)

### Growth trend (compressed archive bytes)
| Date | Size | Delta | 
|------|------|-------|
| Aug 7 | 26.3M | — |
| Aug 8 | 36.5M | +10.1M |
| Aug 9 | 47.7M | +11.2M |
| Aug 10 | 55.4M | +7.8M |
| Aug 11 | 60.1M | +4.7M |

Delta melambat dari puncak +11M (Aug 8-9) ke +4.7M (Aug 11). Tren: **decelerating**.

### Root cause: `state.db` = 141.5M (98% dari archive)
Breakdown item backup (uncompressed):
- `state.db`: **141M** (dominan)
- `skills/`: 11M
- `plugins/`: 4.5M
- `whatsapp/session/`: 3.7M
- `cron/`: 2.6M
- Sisanya: <500K each

### state.db internal (total 141M)
- `messages` table: 70.4M
- `messages_fts_trigram_data`: **54.2M** ← FTS trigram index
- `messages_fts_data`: 13.7M ← FTS index (old layout)
- `sessions`: 4.6M
- FTS total: **68.6M** (47% dari DB)

**Key finding:** `fts_storage_version: 1` di state_meta — artinya FTS masih pakai layout lama yang menyimpan **duplicate copy** setiap message. Hermes punya `optimize-storage` (v23 migration) yang bisa reclaim space signifikan dengan rebuild FTS ke compact external-content layout.

### Message volume
- Total messages: 25,933 (active: 25,452, compacted: 427)
- Sessions: 551
- Peak day: Aug 6 (5,755 messages) — executor cycle heavy

### Disk pressure projection
- `/home` free: 197G (15% used)
- Backup dir saat ini: 248M (7 archives)
- Steady-state di delta 5M/day: ~511MB (7 archives, 7-day retention)
- Fraction of /home: **0.25%**
- Timeline sampai pressure: **8+ tahun** — tidak ada concern disk

### Retention
Script sudah prune dengan benar: `find ... -mtime +7 -delete`. 7-day retention bekerja — archives Aug 4 dan sebelumnya sudah hilang.

## Decision
**Adopt** (partial). 

Yang dilakukan:
1. ✅ Size-delta alert (+15M threshold) ditambahkan ke `hermes-backup.sh` — fires WhatsApp alert kalau backup melonjak abnormal
2. ✅ Root cause terdokumentasi: state.db growth dari message + FTS duplication

Yang direkomendasikan sebagai follow-up task (tidak dieksekusi di cycle ini):
- Jalankan `hermes sessions optimize-storage` untuk migrate FTS ke v23 layout — estimated reclaim ~50-60M dari state.db (FTS trigram 54M + FTS data 13M akan di-eliminate/dramatically reduce karena external-content mode tidak duplicate)
- Evaluate `hermes sessions prune` untuk sesi lama (>30 hari, non-critical) kalau message count terus tumbuh

## Risk
- Alert threshold 15M bisa false-positive kalau ada legitimate spike (misal: setelah optimize-storage migration yang defrag FTS). Acceptable — lebih baik over-alert daripada miss.
- `optimize-storage` belum dijalankan — butuh dedicated task karena ada disk-space prompt confirmation dan harus verify gateway stays responsive.

## Lessons Learned
1. FTS old-layout duplication adalah silent disk hog — state.db nyaris 2x lebih besar dari yang seharusnya
2. Backup growth deceleration menandakan initial burst (first-time executor cycles, message accumulation) bukan linear growth
3. Alert di backup script cukup dengan baca prev entry dari state file — no separate tracking DB needed (ponytail: reuse existing state)

## Next Priority
1. Create task: `hermes sessions optimize-storage` migration (estimated reclaim 50-60M dari state.db)
2. Monitor alert berikutnya — kalau no alert dalam 7 hari, threshold working
3. Optional: `hermes sessions prune --older-than 30d` kalau session count keep growing
