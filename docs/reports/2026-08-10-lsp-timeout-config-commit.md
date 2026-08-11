---
task_id: t_6beac296
objective: OBJ-005
date: 2026-08-10
status: draft
human_review: autonomous
---

# Commit pyrightconfig.json + Tighten LSP Timeout Config

## Engineering Question
Follow-up dari root-cause analysis t_f417b8b0 (LSP timeout cascade pada patch-tool verification). pyrightconfig.json sudah works (0 timeouts setelahnya) tapi untracked di git — bisa hilang. Config default LSP timeout (5.0s wait, 600s idle) terlalu longgar. Apakah commit + config tightening bisa selesai tanpa side effect?

## Method
Dua aksi konkret:

1. **Commit pyrightconfig.json** — `git add pyrightconfig.json` saja (tidak sweep file modified lainnya), commit ke hermes-agent repo.
2. **Tighten LSP config** — via `hermes config set` CLI (bukan edit langsung, karena safeguard):
   - `lsp.wait_timeout`: 5.0 → 3.0
   - `lsp.idle_timeout`: 600 → 120

## Findings (with measurements)

**Action 1 — pyrightconfig.json commit:**
- File: `{"exclude": ["gateway/run.py"]}` (3 lines)
- Commit: `da06207f9` — "chore: add pyrightconfig.json excluding gateway/run.py"
- Files changed: 1 (hanya pyrightconfig.json, 13 file modified lainnya dibiarkan unstaged)
- `git ls-files pyrightconfig.json` confirms tracked

**Action 2 — Config tightening:**
| Setting | Before | After | Reduction |
|---------|--------|-------|-----------|
| `lsp.wait_timeout` | 5.0s | 3.0s | -40% |
| `lsp.idle_timeout` | 600s | 120s | -80% |

- `hermes config get` confirms both values applied
- Config block di config.yaml: `lsp:\n  wait_timeout: 3.0\n  idle_timeout: 120`

## Decision
Adopt. Kedua perubahan langsung diterapkan:

1. pyrightconfig.json sekarang tracked di git — tidak ada risiko hilang.
2. LSP timeout lebih ketat: wait 3.0s (dari 5.0s) mempercepat failure detection, idle reap 120s (dari 600s) mencegah akumulasi stale pyright process yang makan ratusan MB.

## Risk
- **wait_timeout 3.0s** mungkin terlalu agresif untuk file Python besar di machine lambat. Tapi pyrightconfig.json sudah exclude gateway/run.py (file terbesar), jadi seharusnya aman. Jika timeout muncul lagi, naikkan ke 4.0s.
- **idle_timeout 120s** lebih agresif dalam reap idle server — trade-off: sedikit overhead respawn, tapi mencegah FD/memory leak pada long-running gateway process.

## Lessons Learned
- `patch` tool punya safeguard yang block edit langsung `~/.hermes/config.yaml` (security-sensitive). Gunakan `hermes config set` CLI instead.
- Stage hygiene penting: repo hermes-agent punya 13 file modified dari task lain. `git add <specific-file>` + commit hanya file yang relevan mencegah sweep tidak sengaja.
- Task yang left in `todo` status oleh planner bisa block board kalau tidak ada ready task lain. Executor perlu promosi `todo` → `ready` kalau task-nya actionable.

## Next Priority
- Monitor LSP timeout di logs executor berikutnya (1-2 cycle ke depan). Jika 3.0s terlalu ketat, buat task untuk naikkan ke 4.0s.
- Pertimbangkan commit perubahan hermes-agent lainnya (13 file modified) sebagai task terpisah setelah review.
