---
task_id: t_ENVCLN01
objective: OBJ-002
date: 2026-08-08
status: draft
human_review: autonomous
---

# Env Cleanup Follow-up: BROWSERBASE, TICMIDATA, searxng-mcp

## Engineering Question
Follow-up dari report 2026-08-07-imap-smtp-plugin-review.md: apakah BROWSERBASE_* (2 key di `~/.hermes/.env`), TICMIDATA_* (4 key di secrets), dan folder `~/.searxng-mcp/` masih dipakai atau bisa di-clean?

## Method
1. **TICMIDATA_***: grep di `~/.hermes/.env`, `~/.secrets/`, dan `~/webreader/` untuk cari reference.
2. **BROWSERBASE_***: Cek apakah browserbase adalah plugin Hermes yang installed, apakah ada API credential (bukan config flag), dan apakah plugin enabled di `config.yaml`.
3. **~/.searxng-mcp/**: Cek apakah Hermes searxng plugin membaca dari folder ini, atau ini standalone npm tool yang orphaned. Verify `SEARXNG_URL` tidak set.
4. **`.env` line count**: Verify task sebelumnya (trim dari 413→~50) sudah dilakukan.
5. Remove yang orphaned, dokumentasikan yang legitimate.

## Findings (with measurements)

### TICMIDATA_* — Sudah hilang
- `grep TICMIDATA ~/.hermes/.env`: **0 match** (sudah dibersihkan di cycle sebelumnya)
- `grep TICMIDATA ~/.secrets/`: **0 match**
- `grep TICMIDATA ~/webreader/`: **0 match**
- **Tidak ada action needed.** Sudah clean.

### BROWSERBASE_* — Verified legitimate config, BUKAN dead keys
| Key | Value | Assessment |
|-----|-------|------------|
| `BROWSERBASE_PROXIES` | `true` | Config flag untuk browser-browserbase plugin |
| `BROWSERBASE_ADVANCED_STEALTH` | `false` | Config flag untuk browser-browserbase plugin |

- `browser-browserbase` adalah **first-class Hermes plugin** (`~/.hermes/hermes-agent/plugins/browser/browserbase/`) — bukan dead weight.
- **Tidak ada credential** (`BROWSERBASE_API_KEY`/`BROWSERBASE_PROJECT_ID` = 0 match di `.env`). Hanya 2 config flag boolean.
- `config.yaml` section `browser:` → `cloud_provider: local` — browserbase tidak aktif sebagai backend saat ini, tapi plugin terinstall dan bisa di-switch on dengan satu config change.
- **Decision: KEEP.** Menghapus config flag untuk plugin yang terinstall = premature. Kalau user tidak pernah pakai browserbase, uninstall plugin-nya dulu, baru hapus env flag.

### ~/.searxng-mcp/ — Orphaned, REMOVED
- **Before**: `~/.searxng-mcp/` berisi 3 file (`.env`, `edit-config.bat`, `edit-config.sh`), total **16 KB**.
- Folder ini adalah config untuk **standalone npm `searxng-mcp` package** (tool terpisah, bukan bagian Hermes).
- **Hermes punya plugin searxng sendiri** (`~/.hermes/hermes-agent/plugins/web/searxng/`) yang baca `SEARXNG_URL` — **tidak** baca dari `~/.searxng-mcp/`.
- `SEARXNG_URL` tidak set di `.env` atau `config.yaml` — plugin searxng Hermes juga tidak aktif (web backend = `brave-free`).
- **No searxng docker container running.**
- **Action taken**: `rm -rf ~/.searxng-mcp/` → folder removed.
- Hermes searxng plugin tetap intact (verified: `__init__.py`, `plugin.yaml`, `provider.py` masih present).
- **After**: `~/.searxng-mcp/` → **tidak ada** (0 bytes, removed).

### ~/.hermes/.env trim status
- **Before (original)**: 413 baris
- **After (current)**: **34 baris** ✓ (task `t_88B4FB27` sudah dilakukan dengan baik — 91.8% reduction)

## Decision
**Partial Adopt.**
- ✓ TICMIDATA_*: sudah clean (no action)
- ✓ `~/.searxng-mcp/`: removed (orphaned folder, 16 KB, tidak terhubung dengan Hermes)
- ✗ BROWSERBASE_*: **keep** — config flag untuk first-class Hermes plugin yang terinstall. Bukan dead keys.

## Risk
- **Negligible.** searxng-mcp folder orphaned, tidak ada code atau runtime yang reference. Hermes searxng plugin punya config path sendiri.
- BROWSERBASE config flag tetap di `.env` — tidak ada exposure risk (boolean flags, bukan credentials).

## Lessons Learned
- **`.env` trim dari 413→34 baris** sudah dilakukan dengan sangat efektif di cycle sebelumnya. Audit follow-up bisa lebih cepat dengan cek line count dulu.
- **Orphaned MCP config folders** (seperti `~/.searxng-mcp/`) sering tertinggal setelah uninstall npm MCP tools. Hermes punya plugin system sendiri yang tidak share config dengan standalone MCP packages.
- **Config flags ≠ credentials.** Boolean config seperti `BROWSERBASE_PROXIES=true` untuk plugin yang terinstall bukan "unused key" — itu settings. Hanya credentials (API keys, tokens) yang harus di-assess untuk removal.

## Next Priority
- Tidak ada follow-up env cleanup yang tersisa. `.env` sudah lean (34 baris).
- Jika user ingin fully remove browserbase footprint: uninstall plugin (`hermes plugin remove browser-browserbase`) lalu hapus 2 config flag.
- Board sekarang punya 2 ready tasks: `t_BOOTLOG01` (systemd boot time logger) dan `t_MYSQLRM01` (mysql residual cleanup).
