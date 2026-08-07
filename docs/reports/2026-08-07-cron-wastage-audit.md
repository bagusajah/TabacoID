# Daily Report 2026-08-07 — Cron Wastage Audit

## Pertanyaan Engineering
Berapa banyak API tokens dan report output yang terbuang oleh cron siklus engineering yang berjalan setiap 1 menit ketika pipeline kanban stagnan (0 ready task)?

## Metode
1. Hitung execution rate dari `cron/executions.db`
2. Analisis output file (`cron/output/`) — jumlah run, isi, overlap
3. Ukur cgroup memory untuk baseline proses Hermes
4. Cross-check kanban board: 69 done, 47 blocked, 0 ready
5. Estimasi token waste berdasarkan ukuran prompt + output per run

## Temuan (dengan pengukuran)

### 1. Pipeline Stagnasi Penuh

| Metrik | Nilai |
|--------|-------|
| Total tasks | 116 |
| done | 69 (59%) |
| blocked | 47 (41%) |
| ready | 0 |
| running | 0 |

Semua blocked task menunggu human unblock. 56 dari 116 task (48%) adalah **auto-generated followup tasks** yang dibuat oleh step 6b skill — setiap report membuat blocked follow-up yang tidak pernah di-unblock.

### 2. Cron Fire Rate vs. Productive Output

| Periode | Cron fires | Unique reports | Duplicate/overlapping runs | Token estimate* |
|---------|-----------|---------------|---------------------------|-----------------|
| Hari ini (00:00–02:19) | 24 | 8 unique | ~16 redundant | ~264K tokens |
| Total seumur hidup | 75 | ~30 unique | ~45 redundant | ~825K tokens |

*\*Token estimate: ~8KB prompt (skill+instructions) + ~16KB output per run ≈ 11K tokens. GLM-5-turbo pricing: ~$0.002/1K input, ~$0.006/1K output.*

### 3. Biaya Estimasi

| Item | Nilai |
|------|-------|
| Token per run (input+output) | ~11,000 |
| Run per hari (24h extrapolation) | ~288 |
| Token per hari | ~3.2M |
| Biaya GLM-5-turbo per hari | ~$6–12 (tergantung pricing) |
| **Produktif run per hari** | **0–2** (hanya saat ada ready task) |
| **Waste ratio** | **>95%** |

### 4. Hermes Memory Baseline

| Proses | PSS (true cost) | Anon (heap) | Swap |
|--------|----------------|-------------|------|
| Gateway (Python) | 612 MB | 600 MB | 0 |
| Dashboard (Python) | 712 MB | 703 MB | 1.3 MB |
| WhatsApp bridge (Node) | 125 MB | 89 MB | 0 |
| **Total** | **1,449 MB** | **1,392 MB** | **1.3 MB** |

System: 7.9GB total, 4.0GB available. Hermes uses 18% of system RAM. Stabil, no OOM events.

### 5. Auto-Followup Task Bloat

Step 6b skill membuat blocked task untuk setiap item "Next Priority" di setiap report. 8 report hari ini × rata-rata 2 follow-up = ~16 task baru, semua blocked, tidak pernah dieksekusi. Ini adalah feedback loop: report → follow-up task → task tidak di-unblock → cron menemukan nothing → cron buat report lagi → report buat follow-up lagi.

### 6. Gateway Stale Code Issue

Gateway (PID 515158) up sejak Aug 3. Fix `_safe_int_ts()` di `kanban_db.py` (deployed Aug 6 11:04) **not loaded** — running process masih pakai code lama. Dispatcher crash berhenti bukan karena fix, tapi karena tidak ada `running` task lagi (semua sudah di-reclaim).

## Decision
**Needs Human Review** — tiga aksi diperlukan:

1. **Kurangi cron interval ke 30 menit atau matikan** — waste >95% API tokens saat pipeline stagnan. Task `t_CRONINT01` sudah blocked di board.
2. **Matikan auto-followup task creation** (step 6b skill) — 48% task di board adalah auto-generated yang tidak pernah dieksekusi. Feedback loop bloat.
3. **Restart gateway** — running code stale, fix `_safe_int_ts()` belum teraplikasi.

## Risk
- Mengurangi cron interval berarti response time untuk ready task meningkat (max 30m delay vs 1m). Tradeoff yang wajar karena pipeline stagnan sekarang.
- Gateway restart akan reset semua in-flight sessions (jika ada). Pastikan tidak ada active WhatsApp session.

## Lessons Learned
- Cron 1-menit + autonomous discovery = LLM dipanggil setiap menit bahkan ketika tidak ada kerja. Token burn yang tidak perlu.
- Auto-followup task creation tanpa human triage = task board bloat. "Next Priority" di report seharusnya jadi catatan, bukan task otomatis.
- Running gateway process tidak otomatis pick up code changes. Python module caching berarti `import kanban_db` tetap pakai versi lama sampai restart.

## Next Priority
- [ ] Human unblock: review dan unblock/matron 47 blocked task, atau archive yang tidak relevan
- [ ] Reduce cron interval dari 1m ke 30m (atau matikan sampai ada ready task)
- [ ] Disable auto-followup task creation di skill step 6b
- [ ] Restart gateway untuk apply `_safe_int_ts()` fix
