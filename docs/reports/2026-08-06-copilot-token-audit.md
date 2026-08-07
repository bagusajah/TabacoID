# Daily Report 2026-08-06 — Copilot Token Audit

## Engineering Question
Apa yang diperlukan untuk mengganti classic PAT (`ghp_*`) dengan fine-grained PAT agar Copilot API berfungsi, dan apa impact-nya terhadap sistem lain?

## Method
Audit token flow: dari `~/.hermes/.env` → Hermes auth resolution → Copilot provider credential lookup. Cek sumber error di `errors.log`, verifikasi scope token saat ini, telusuri bagaimana Hermes meresolve credential untuk provider `copilot` dan `github-copilot`.

## Findings

### Token Flow
1. `GITHUB_TOKEN=ghp_***` di `~/.hermes/.env` — classic PAT, scope `repo, write:org`
2. `COPILOT_GITHUB_TOKEN` **tidak diset** — Hermes fallback ke `GITHUB_TOKEN`
3. Hermes credential pool mendaftarkan token sebagai source `env:GITHUB_TOKEN` untuk provider `copilot`
4. `gh auth status` juga menyimpan token yang sama di keyring — double source

### Error Pattern
6 WARNING per session init:
```
Token from GITHUB_TOKEN is not supported: Classic Personal Access Tokens (ghp_*)
are not supported by the Copilot API. Use one of:
  → `copilot login` or `hermes model` to authenticate via OAuth
  → A fine-grained PAT (github_pat_*) with Copilot Requests permission
```

### Impact Analysis
| Use Case | Token | Status |
|----------|-------|--------|
| Git push/pull (HTTPS) | `gh auth` keyring | ✅ Works (ghp_*) |
| Skills Hub API | `GITHUB_TOKEN` env | ✅ Works (classic PAT fine for REST) |
| Copilot API | `GITHUB_TOKEN` fallback | ❌ Rejected (needs fine-grained or OAuth) |

**Key insight:** `GITHUB_TOKEN` melayani dua tujuan berbeda. Classic PAT cukup untuk Skills Hub (REST API rate limits) tapi ditolak Copilot API. Solusi: tambahkan `COPILOT_GITHUB_TOKEN` terpisah.

### Fix yang Diperlukan (Human Action — Browser Required)

**Langkah 1: Buat Fine-Grained PAT di GitHub**
1. Buka https://github.com/settings/personal-access-tokens/new
2. Token name: `hermes-copilot`
3. Resource owner: `bagusajah`
4. Repository access: **All repositories** (atau specific repo jika ingin narrow)
5. Permissions → Repository permissions → **Copilot Requests: Read and write**
6. Generate → copy token (`github_pat_*`)

**Langkah 2: Set di Hermes**
```bash
# Edit ~/.hermes/.env, tambahkan baris:
COPILOT_GITHUB_TOKEN=github_pat_<generated_token>
```

**Langkah 3: Verifikasi**
```bash
hermes doctor   # cek copilot credential status
```

Hermes akan otomatis memprioritaskan `COPILOT_GITHUB_TOKEN` untuk provider copilot, tanpa mengganggu `GITHUB_TOKEN` yang tetap dipakai Skills Hub dan git operations.

## Measurements
- `copilot_warnings_per_session`: 6 WARNING (dari error pattern analysis report)
- `token_sources_found`: 2 (env var + gh keyring, kedua-duanya classic PAT)
- `copilot_requests_blocked`: semua (100%, classic PAT selalu ditolak Copilot API)
- `GITHUB_TOKEN_set`: yes (classic PAT di ~/.hermes/.env)
- `COPILOT_GITHUB_TOKEN_set`: no (tidak ada, menyebabkan fallback ke GITHUB_TOKEN)

## Decision
**Needs Human Review** — Pembuatan fine-grained PAT memerlukan akses browser ke GitHub Settings. Tidak bisa diotomasi dari CLI (fine-grained PAT creation hanya via web UI).

## Risk
- Minimal. Menambahkan `COPILOT_GITHUB_TOKEN` terpisah tidak mengganggu token yang sudah ada. Jika token baru salah/ditolak, Copilot tetap gagal tapi Skills Hub tetap berfungsi.
- Classic PAT (`ghp_*`) tetap valid untuk git dan Skills Hub — tidak perlu dihapus.

## Lessons Learned
- Satu env var melayani dua provider dengan requirement berbeda → split credential per provider
- Hermes sudah punya mekanisme `extra_env_vars` per provider — tinggal manfaatkan

## Next Priority
- Eksekusi langkah fix di atas (human action)
- Setelah token dibuat, verifikasi dengan `hermes doctor`
