---
task_id: t_af1a1ca3
objective: OBJ-002
date: 2026-08-11
status: draft
human_review: autonomous
---

# Verifikasi & VACUUM state.db — FTS v23 Compact Layout

## Engineering Question
State.db 141M+ dengan FTS old-layout yang menyimpan duplikat setiap message. Apakah migrasi ke v23 compact layout sudah dilakukan, dan berapa space yang bisa di-reclaim?

## Method
1. Cek ukuran state.db sebelum operasi
2. Run `hermes sessions optimize-storage --yes` untuk migrasi FTS
3. Inspect FTS table definitions, sizes, dan layout
4. Jika sudah compact → VACUUM untuk reclaim freelist pages
5. Verify FTS search + gateway health post-VACUUM

## Findings

**FTS v23 migration sudah pernah dilakukan** — `optimize-storage` melapor "already on the compact layout — nothing to do."

Bukti layout compact (external-content mode):
- `messages_fts` pakai `content='messages', content_rowid='id'` — tidak duplikat content
- `messages_fts_trigram` pakai `content='messages_fts_trigram_src'` (view ke messages table)

**Table size breakdown (dbstat):**
| Table | Size | % of messages |
|-------|------|---------------|
| messages | 67.6 MB | 100% (baseline) |
| messages_fts_trigram_data | 52.0 MB | 76.9% |
| messages_fts_data | 13.2 MB | 19.5% |
| sessions | 4.4 MB | — |
| indexes | ~4.6 MB | — |

**VACUUM result:**
- Before: 149,495,808 bytes (142.57 MB)
- After: 147,574,784 bytes (140.74 MB)
- **Reclaimed: 1,921,024 bytes (1.83 MB, 1.29%)**
- Freelist pages: 374 → 0

**FTS search post-VACUUM:** ✓ 4,887 hits untuk "kanban", 4,653 hits untuk "task"
**Gateway health post-VACUUM:** ✓ status=connected, queue=0, uptime=198,589s

## Decision
**Adopt** — Migrasi sudah complete dari cycle sebelumnya. VACUUM hari ini reclaim 1.83 MB freelist.

Tidak ada ruang besar yang bisa di-reclaim lagi dari FTS — trigram index (52 MB) adalah ukuran native FTS5 trigram tokenizer untuk 11,509 message pairs. Ini sudah optimal untuk feature yang ada.

## Risk
- **Rendah.** VACUUM di WAL mode aman untuk gateway yang sedang running. Freelist memang kecil (1.83 MB) jadi impact minimal.
- Jika ingin kompresi lebih agresif: bisa drop trigram index (save 52 MB) tapi kehilangan substring search capability.

## Lessons Learned
- Task creator asumsikan FTS masih old-layout (v1), tapi pada kenyataannya sudah di-migrate di cycle sebelumnya. Task body tertinggal stale info.
- Saran: planner harus cek current state sebelum create task yang asumsikan pre-condition tertentu. Query `messages_fts_config` version atau cek `optimize-storage` dry-run bisa jadi pre-check.
- Freelist 1.83 MB adalah VACUUM delta realistik — bukan 50-60 MB yang dijanjikan task body. Janji itu sudah fulfilled di cycle sebelumnya.

## Next Priority
- Tidak ada follow-up storage task yang urgent. state.db 140 MB untuk 26,120 messages adalah healthy density.
- Jika growth ke >500 MB: pertimbangkan archive old sessions (move >90-day sessions to cold storage).
