# Daily Report 2026-08-06 — Feature Check Warning Noise Analysis

## Engineering Question
Apakah `check_fn returned False` warnings di `errors.log` bisa diredusen ke DEBUG level, dan bagaimana caranya tanpa patch upstream?

## Method
1. Telusuri source code Hermes agent (`~/.hermes/hermes-agent/tools/registry.py`) untuk lokasi `logger.warning` yang memancarkan check_fn messages
2. Verifikasi apakah file tersebut adalah upstream repo atau local code
3. Cek konfigurasi Hermes untuk opsi log level override per-logger
4. Hitung kontribusi noise terhadap total error log volume

## Findings

### Lokasi Source
`~/.hermes/hermes-agent/tools/registry.py`, line 332-336:
```python
logger.warning(
    "check_fn %s %s; dependent tools will be unavailable this turn",
    getattr(fn, "__qualname__", fn),
    "raised" if raised else "returned False",
)
```

### Constraint: Upstream Code
File ini milik repo upstream `git@github.com:NousResearch/hermes-agent.git`. Perubahan lokal akan hilang saat `hermes update` berikutnya.

### Tidak Ada Konfigurasi Log Level Per-Logger
`~/.hermes/config.yaml` tidak punya opsi `log_level` atau mekanisme filter per-logger name (e.g. `tools.registry`). Tidak ada file logging config lokal.

### Measurements
- `check_fn warnings`: 84 baris dari total 580 baris `errors.log` (**14.5%**)
- `unique failing check_fn`: 12 fungsi (semua environment-expected: no browser, no BFL, no React preview, no focus pane — semua normal untuk headless Orange Pi)
- `check_fn raised`: 0 (tidak ada exception, semua clean `False`)
- `frequency`: ~12 warnings per session init
- `all warnings are persistent false` (fitur memang tidak tersedia, bukan transient)

### Per-Fungsi Breakdown
| Fungsi | Hits | Sebab |
|--------|------|-------|
| `_check_kanban_orchestrator_mode` | 9 | Kanban CLI mode tidak aktif |
| `check_read_terminal_requirements` | 8 | Tidak ada read_terminal support |
| `check_react_requirements` | 8 | Tidak ada React preview |
| `check_open_preview_requirements` | 8 | Tidak ada browser preview |
| `check_focus_pane_requirements` | 8 | Tidak ada GUI |
| `check_close_terminal_requirements` | 8 | Tidak ada terminal pane |
| `check_image_generation_requirements` | 6 | Tidak ada image gen API |
| `check_computer_use_requirements` | 6 | Tidak ada computer use |
| `check_bfl_requirements` | 6 | Tidak ada BFL API key |
| `_browser_dialog_check` | 6 | Tidak ada browser CDP |
| `_browser_cdp_check` | 6 | Tidak ada browser CDP |
| `_check_kanban_mode` | 3 | Kanban CLI mode tidak aktif |

## Decision
**Needs Human Review** — patching upstream code bukan opsi yang sustainable. Dua jalur forward:

1. **Upstream contribution**: Submit PR ke `hermes-agent` repo untuk downgrade `check_fn returned False` dari WARNING ke DEBUG (line 332 di `registry.py`). Argumen: persistent environment mismatches bukan anomaly — 12 fungsi selalu False di headless server, menambah 14.5% noise ke error log.
2. **Log filtering workaround**: Tambahkan `logging` filter di Hermes startup config yang mempromote `tools.registry` WARNING ke DEBUG. Ini perlu fitur baru di Hermes config schema.

Tidak ada perubahan file dalam cycle ini — murni research.

## Risk
Low. Ini noise, bukan error. Tidak ada functional impact.

## Lessons Learned
- Auto-generated backlog task dari error analysis mungkin mengacu ke upstream code — perlu cek ownership sebelum claim
- `check_fn` warnings sepenuhnya expected di environment ini, 0 transient failures (semua `returned False`, bukan `raised`)

## Next Priority
- Submit upstream issue/PR untuk `check_fn` log level di hermes-agent repo
- Atau: request fitur per-logger log level config di Hermes
