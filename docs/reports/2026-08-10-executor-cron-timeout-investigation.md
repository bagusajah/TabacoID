---
task_id: t_deb43389
objective: OBJ-002
date: 2026-08-10
status: draft
---

# Investigasi Executor Cron TimeoutError: Idle 600s

## Engineering Question
Kenapa executor cron job sering timeout dengan `idle for ~600s`? Apakah ini masalah API provider (GLM latency), mode non-streaming, atau tool yang stuck? Berapa frekuensinya dalam 7 hari terakhir?

## Method
Gali semua log `agent.log*` (termasuk rotated `.gz`) selama 7 hari (4–10 Aug 2026). Ekstrak semua event `idle for.*limit 600s`, kategorikan berdasarkan `last_activity`. Baca source code `cron/scheduler.py` (line 3510–3641) untuk memahami mekanisme inactivity watchdog. Cek konfigurasi `config.yaml` untuk `streaming.enabled` dan env var `HERMES_CRON_TIMEOUT`.

## Findings (with measurements)

### Statistik Kegagalan (7-day: 4–10 Aug 2026)

| Kategori | Event | Jumlah |
|----------|-------|--------|
| Non-streaming API stall | `last_activity=waiting for non-streaming API response` | **2** |
| Tool-execution stall | `last_activity=executing tool: patch/terminal` | **4** |
| **Total timeout failures** | | **6** |
| Total successful completions | `completed successfully` | **434** |
| **Failure rate** | 6 / 440 | **1.4%** |

### Timeline Detail

**Non-streaming API stalls (2):**
- `2026-08-04 12:10:55` — Job "Afternoon Engineering", idle 603s, iteration 3/150
- `2026-08-10 04:53:26` — Job "Engineering Cycle (1m)", idle 604s, iteration 38/40

**Tool-execution stalls (4):**
- `2026-08-08 06:58:47` — terminal tool, idle 602s, iteration 8/40
- `2026-08-09 09:16:59` — patch tool, idle 600s, iteration 17/40
- `2026-08-09 13:05:03` — patch tool, idle 603s, iteration 12/40
- `2026-08-09 17:23:08` — patch tool, idle 601s, iteration 29/40

### Root Cause Analysis

**Ada DUA mode kegagalan yang berbeda:**

**Mode 1: Non-streaming API stall (2/6 = 33%)**
- Config: `streaming.enabled: false` (`config.yaml:155`)
- `HERMES_CRON_TIMEOUT` env var **tidak diset** → default 600s
- Saat GLM provider stall (tidak respons >600s), tidak ada stream delta yang me-reset activity tracker. Activity tracker hanya di-touch pada: (a) API call start, (b) API call end, (c) stream delta, (d) tool call. Tanpa streaming, hanya (a) dan (b) yang aktif — gap di antara keduanya bisa >600s jika provider hang.
- Sumber: `scheduler.py:3516-3517` — "updated by `_touch_activity()` on every tool call, API call, and stream delta"

**Mode 2: Tool-execution stall (4/6 = 67%)**
- Tool `patch` (3x) dan `terminal` (1x) block agent main loop >600s
- Kemungkinan: opencode delegation, atau `npm run build` / `npm test` yang lambat
- Activity tracker tidak di-update selama tool eksekusi berlangsung — hanya di-touch saat tool call dimulai
- Ini **bukan** masalah API provider, tapi tool execution blocking

### Mekanisme Inactivity Watchdog
- Poll interval: 5s (`_POLL_INTERVAL = 5.0`)
- Limit: 600s default (line 3529: `_cron_timeout = 600.0`)
- `HERMES_CRON_TIMEOUT=0` → unlimited (no watchdog)
- Source: `cron/scheduler.py:3510-3641`

## Decision

**Needs Human Review** — ada dua mitigasi yang bisa dilakukan, tapi keduanya melibatkan config change:

1. **Enable streaming** (`streaming.enabled: true`) — stream delta akan terus me-reset activity tracker bahkan saat provider lambat. Ini address Mode 1 (2/6 failures).
2. **Naikkan `HERMES_CRON_TIMEOUT=900`** (15 min) — mitigation, bukan fix. Hanya menunda masalah.

Tool-execution stall (Mode 2, 4/6) tidak bisa diselesaikan dari cron config — perlu tool-level timeout atau heartbeat during long tool execution. Ini issue terpisah untuk hermes-agent core.

**Catatan:** Failure rate 1.4% relatif rendah (6 dari 440 runs). Tapi setiap failure meninggalkan zombie task di board yang harus di-reap manual. Impact-nya ke board throughput, bukan sekadar lost run.

## Risk
- **Enable streaming**: jika provider GLM tidak support streaming dengan baik, bisa cause issue lain. Perlu test.
- **HERMES_CRON_TIMEOUT=900**: job yang stuck akan memakan resource lebih lama sebelum di-kill. Trade-off reliability vs resource.
- Tool stall tetap unsolved — butuh hermes-agent core change.

## Lessons Learned
- Inactivity-based timeout itu pintar (bisa run jam-jaman kalau aktif), tapi punya blind spot: tidak ada granularity dalam "activity". Tool yang jalan 10 menit = tidak terbedakan dari API yang hang 10 menit.
- `streaming.enabled: false` adalah konfigurasi yang legacy/safe-default — sekarang jadi sumber fragility karena activity tracker tidak dapat signal dari stream delta.
- 1.4% failure rate terlihat kecil, tapi karena cron jalan tiap 1 menit, 6 failure/minggu = rata-rata ~1 zombie task/hari yang harus di-reap.

## Next Priority
1. Test enable `streaming.enabled: true` — apakah GLM/zai provider support streaming? Check gateway logs untuk stream error.
2. Buat task terpisah untuk tool-level timeout (Mode 2: patch/terminal stall).
3. Pertimbangkan auto-reap di scheduler level (bukan hanya di executor procedure).
