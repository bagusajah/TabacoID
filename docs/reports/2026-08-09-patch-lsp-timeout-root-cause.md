---
task_id: t_f417b8b0
objective: OBJ-005
date: 2026-08-09
status: draft
---

# Root-Cause: Patch Tool LSP Timeout pada File Besar (gateway/run.py)

## Engineering Question

Kenapa `patch` tool pada `gateway/run.py` (26,341 baris / 1.28 MB) memakan 13,800 detik dan gagal post-write verification, menyebabkan board stalls dan false task blocking?

## Method

Trace end-to-end dari error log → LSP manager → LSP client → patch tool verification logic.

Sumber data:
- `~/.hermes/logs/errors.log` + `.log.1` (9 LSP timeout occurrences total)
- `agent/lsp/manager.py` — `_loop.run(coro, timeout=t)`, `get_diagnostics_sync`, `snapshot_baseline`
- `agent/lsp/client.py` — `INITIALIZE_TIMEOUT=45s`, `DIAGNOSTICS_DOCUMENT_WAIT=5.0s`
- `tools/file_operations.py` — patch method, post-write verification via `cat`
- `config.yaml` — konfirmasi: tidak ada section `lsp:` (default values)
- `pyrightconfig.json` — dibuat 21:11, `{"exclude": ["gateway/run.py"]}`

## Findings (with measurements)

### Root Cause Chain

| # | Komponen | Temuan | Impact |
|---|----------|--------|--------|
| 1 | **Workspace size** | hermes-agent = 393,898 LOC Python (11,408 file) + gateway/run.py 26,341 baris | Pyright initialize men-scan seluruh workspace |
| 2 | **LSP config** | `config.yaml` tidak punya section `lsp:` → default `wait_timeout=5.0s`, `wait_mode="document"` | Outer timeout budget = `max(8.0, 5.0+3.0)` = 8.0s |
| 3 | **Patch flow** | `patch()` → `write_file()` → `_snapshot_lsp_baseline()` + `_maybe_lsp_diagnostics()` | Dua LSP round-trips per patch: baseline (pre-write) + diagnostics (post-write) |
| 4 | **Verification path** | Post-write verification = `cat {path}` via `_exec()` → exit_code != 0 → false "could not re-read" | 13,800s tool duration: LSP block async loop, `cat` command tertunda di queue terminal backend |

### Timeline Evidence

- **errors.log.1** (sebelum fix): 6 occurrences `lsp[pyright] fresh diagnostics timed out for hermes-agent/gateway/run.py` + 3 `Post-write verification failed`
- **errors.log** (current rotation, setelah pyrightconfig.json dibuat 21:11): **0 occurrences** pyright timeout, **0** verification failures

**pyrightconfig.json effectif**: `exclude: ["gateway/run.py"]` mencegah pyright meng-analisis file 26K-baris tersebut. LSP manager `enabled_for()` masih True (file ada di workspace git), tapi pyright sendiri skip analisis → return [] cepat.

### Root Cause of 13,800s Duration

Bukan timeout LSP tunggal (budget 8s). Yang terjadi: **async loop blocking cascade**:

1. `snapshot_baseline` → `_loop.run(_snapshot_async, timeout=8s)` — pyright initialize butuh >>8s untuk workspace 393K LOC → timeout → `_mark_broken_for_file` 
2. Tapi `get_diagnostics_sync` → `_loop.run(_open_and_wait_async, timeout=7s)` — broken-set short-circuit return `[]` ( cepat)
3. Post-write `cat` via `_exec()` seharusnya cepat, tapi terminal backend queue tertunda oleh LSP spawn subprocess yang masih hanging di background → `cat` exit_code=1 atau command tertahan

Total 13800s = ~3.8 jam. Konsisten dengan: pyright process zombie hanging di background, memakan CPU/memory, menyebabkan session DB connection drop (`NoneType has no attribute execute`), dan cron timeout 600s x multiple retries.

### Fix Status

| Fix | Status | Evidence |
|------|--------|----------|
| pyrightconfig.json `exclude: ["gateway/run.py"]` | ✅ Created (21:11), works | 0 pyright timeouts di rotation setelahnya |
| pyrightconfig.json committed to git | ❌ Untracked file | `git status`: Untracked |
| config.yaml `lsp:` section | ❌ Tidak ada | Default `wait_timeout=5.0s` dipakai |
| t_063dbcf3 false-block | ✅ Already resolved | Status=done, result recorded |

## Decision

**Adopt** — dengan caveat:

1. **pyrightconfig.json sudah efektif** dan harus di-commit untuk persistensi (untracked = bisa hilang saat `git clean` atau reset)
2. **Tambah `lsp:` section di config.yaml** untuk defense-in-depth: set `wait_timeout` lebih agresif (3.0s) dan tambahkan `disabled` untuk pyright pada path gateway/ jika masalah berulang
3. **Post-write verification hole**: verification `cat` exit_code=1 false-positive saat system overload — perlu guard agar LSP failure tidak menyebabkan terminal backend queue starvation

## Risk

- **Rendah** untuk pyrightconfig.json commit (file sudah ada dan terbukti works)
- **Sedang** untuk config.yaml changes — jika `lsp.wait_timeout` terlalu agresif, diagnostics valid mungkin tidak sempat dikumpulkan untuk file besar lain
- **Untuk diketahui**: 13800s cascade menunjukkan terminal backend tidak punya isolation antara LSP subprocess dan command queue — ini architectural debt terpisah

## Lessons Learned

1. **Zombie task reap critical**: t_f417b8b0 stuck running 29 menit, blocking seluruh board. Tanpa reap di Step 1, tidak ada task baru yang bisa dieksekusi.
2. **Untracked fix = tidak ada fix**: pyrightconfig.json yang untracked bisa hilang kapan saja. Fix yang bekerja harus di-commit untuk permanen.
3. **LSP timeout cascade**: single LSP timeout (8s budget) bisa cascade ke 13,800s karena async loop blocking + terminal backend queue starvation. Timeout per-component tidak cukup — perlu global tool execution timeout.
4. **Guard substring over-match**: 3x terminal guard block saat mencoba query `run.py` / version checks. Guard terlalu agresif match kata "restart"/"stop gateway" di command yang tidak relevan.

## Next Priority

1. **Commit pyrightconfig.json** ke hermes-agent repo (blocked-needs_input — perlu human approval untuk hermes-itself changes)
2. **Tambah `lsp:` section** di `~/.hermes/config.yaml` dengan `wait_timeout: 3.0` dan `idle_timeout: 120`
3. **Investigate terminal backend isolation**: kenapa `cat` command tertahan saat LSP subprocess hanging? (follow-up task)
