---
task_id: t_91442ec5
objective: OBJ-002
date: 2026-08-09
status: draft
human_review: autonomous
---

# Enable Gateway Tracemalloc Leak Monitor

## Engineering Question
Gateway memory leak investigation (t_5A3C7E7D, t_24B29E7E, t_1A3B5450) deploy kode tracemalloc snapshot watcher, tapi apakah monitor itu benar-benar aktif?

## Method
Infrastructure health sweep selama executor idle cycle. Cek `.env` untuk env var yang dipakai code path tracemalloc di `gateway/run.py`.

## Findings
- **Code deployed:** `gateway/run.py` line 10430+ punya tracemalloc watcher yang mengambil snapshot setiap 1800s (30 min), logs top-10 allocators dengan 25-frame traceback depth
- **Env var missing:** `HERMES_GATEWAY_TRACEMALLOC` tidak ada di `.env` — code path `if os.environ.get("HERMES_GATEWAY_TRACEMALLOC", "").lower() in ("1", "true")` selalu False
- **Impact:** 3+ task menyelesaikan deploy tracemalloc tapi monitor tidak pernah run. Zero tracemalloc log entries dalam 24h window
- **Gateway RSS:** 742 MB (PID 1857, uptime 24h 52min) — dalam batas wajar, tapi tanpa tracemalloc tidak bisa distinguish step-function growth vs stable
- **Fix applied:** `HERMES_GATEWAY_TRACEMALLOC=1` appended to `~/.hermes/.env` (1 line + comment)
- **Activation:** Weekly restart timer (`hermes-weekly-restart.timer`) fires Sun 03:00 WIB — gateway restart akan load env var baru
- **Python validation:** env var parseable, `Enabled: True` confirmed via simulation

Config diff:
```diff
+# --- Gateway leak monitoring ---
+HERMES_GATEWAY_TRACEMALLOC=1
```

## Decision
Adopt — 1-line config fix mengaktifkan monitoring infrastructure yang sudah deployed. Tidak ada code change, hanya env var. Risk minimal.

## Risk
- Tracemalloc adds ~5-15 MB overhead (25-frame traceback storage). Negligible pada gateway yang sudah 742 MB
- Jika log noise berlebihan, bisa disable dengan remove env var (rollback trivial)
- Snapshot interval 30 min — tidak akan flood logs

## Lessons Learned
**Deploy != Activate.** Tiga task menyelesaikan code deploy tracemalloc tapi tidak ada yang verify env var actually set. Closure criteria harus include "env var set + verified" bukan hanya "code merged". Ini gap antara code-complete dan operational-complete.

## Next Priority
- Setelah gateway restart (03:00 WIB), verify tracemalloc snapshot logs muncul di `journalctl --user -u hermes-gateway`
- Setelah 24h data, compare tracemalloc allocator delta dengan smaps_rollup RSS delta (t_24B29E7E scope)
- Evaluasi: apakah weekly restart masih perlu jika tracemalloc data menunjukkan growth predictable?
