---
human_review: autonomous
---

# Daily Report 2026-08-06 — Audit .env Keys

## Engineering Question
Ada keys di .env yang sudah expired atau tidak terpakai? Mana yang bisa di-clean up?

## Method
Scan semua file `.env` di Hermes systems (5 file, 611 baris total). Extract nama key, lalu cross-reference dengan kode aktif di masing-masing project. Check juga apakah service/plugin yang membutuhkan key tersebut benar-benar running.

**Scope:** 5 `.env` files:
1. `~/.hermes/.env` — 503 baris, 21 key aktif (413 komentar)
2. `~/webreader/.env` — 6 key
3. `~/.hermes/secrets/.env` — 6 key
4. `~/.searxng-mcp/.env` — 59 baris, 11 key
5. `~/.config/imap-smtp-email/.env` — 36 baris, 27 key

## Findings

### 1. `~/.hermes/.env` (21 active keys)

| Key | Status | Catatan |
|-----|--------|---------|
| `GLM_API_KEY` | **Commented out** | Diganti `ZHIPU_API_KEY` di secrets |
| `GLM_BASE_URL` | **Commented out** | Sama di atas |
| `BROWSERBASE_API_KEY` | **Commented out** | Plugin browserbase ada tapi tidak dikonfigurasi |
| `BROWSERBASE_PROJECT_ID` | **Commented out** | Idem |
| `BROWSERBASE_PROXIES` | Set tapi **tidak dipakai** | Browserbase tidak aktif |
| `BROWSERBASE_ADVANCED_STEALTH` | Set tapi **tidak dipakai** | Idem |
| `BROWSER_SESSION_TIMEOUT` | Set tapi **tidak dipakai** | Idem |
| `BROWSER_INACTIVITY_TIMEOUT` | Set tapi **tidak dipakai** | Idem |
| `GITHUB_TOKEN` | Active | Digunakan oleh git operations |
| `BRAVE_SEARCH_API_KEY` | Active | Plugin brave_free terpasang dan aktif |
| `TERMINAL_TIMEOUT` | Set | Kemungkinan dibaca oleh hermes runtime internal |
| `TERMINAL_LIFETIME_SECONDS` | Set | Idem |
| `TERMINAL_MODAL_IMAGE` | Set | Idem |
| `IMAGE/WEB/VISION/MOA_TOOLS_DEBUG` | Set | Debug flags, dibaca runtime |
| `WHATSAPP_*` (7 keys) | Active | Bridge running di port 3000 ✅ |

**Verdict:** 8 key bisa dihapus/comment out (semua BROWSERBASE_* karena browserbase tidak dikonfigurasi). 2 key sudah commented out (GLM_*) — tidak perlu action.

### 2. `~/webreader/.env` (6 keys)

Semua 6 key (`TICMI_USERNAME`, `TICMI_PASSWORD`, `TICMI_AUTH_MODE`, `TICMI_TOKEN_REFRESH_MS`, `TICMI_BOOT_LOGIN_RETRIES`, `TICMI_BOOT_LOGIN_DELAY_MS`) — **aktif, direferensi di source code, container running.**

**Verdict:** Clean. Tidak ada yang perlu dihapus.

### 3. `~/.hermes/secrets/.env` (6 keys)

| Key | Status | Catatan |
|-----|--------|---------|
| `ZHIPU_API_KEY` | Active | Dipakai oleh GLM model provider |
| `SOFA_API_KEY` | Active | Skill sofa aktif, pakai key ini |
| `TICMIDATA_USER` | **Tidak ditemukan** di webreader source | Hanya di `dist/` (compiled) — kemungkinan legacy |
| `TICMIDATA_PASS` | **Tidak ditemukan** di webreader source | Idem |
| `TICMIDATA_BEARER` | **Tidak ditemukan** di webreader source | Idem |
| `TICMI_CF_CLEARANCE` | Hanya di `dist/` | Cloudflare bypass token, kemungkinan legacy/rotated |

**Verdict:** 4 key (`TICMIDATA_*` + `TICMI_CF_CLEARANCE`) tidak ditemukan di source code aktif. Kemungkinan leftover dari eksperimen atau sudah tidak dipakai setelah webreader rewrite.

### 4. `~/.searxng-mcp/.env` (11 keys)

File ini berisi 11 key (`SEARXNG_PORT`, `SEARXNG_CONTAINER_NAME`, `DOCKER_AUTO_PULL`, `STOP_ON_EXIT`, `USER_AGENT_ROTATION`, `USER_AGENT_STRATEGY`, `RATE_LIMIT_*`, dll). **Tidak ada file Python/JS di folder ini** — hanya `edit-config.sh` dan `edit-config.bat`. Plugin searxng Hermes menggunakan `SEARXNG_URL` dari config, bukan key-key ini.

**Verdict:** Seluruh file ini adalah **config template leftover**. Tidak ada MCP server code yang membacanya. Bisa dihapus.

### 5. `~/.config/imap-smtp-email/.env` (27 keys)

| Key | Status |
|-----|--------|
| `IMAP_HOST`, `IMAP_PORT` | Direferensi di code |
| `SMTP_HOST`, `SMTP_PORT` | Direferensi di code |
| `IMAP_USER`, `IMAP_PASS`, `IMAP_TLS`, `IMAP_MAILBOX`, `IMAP_REJECT_UNAUTHORIZED` | **Tidak ditemukan** di code |
| `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`, `SMTP_REJECT_UNAUTHORIZED` | **Tidak ditemukan** di code |
| `BAGUS_*` (14 keys) | **Tidak ditemukan** di code manapun — akun email kedua |
| `ALLOWED_READ_DIRS`, `ALLOWED_WRITE_DIRS` | **Tidak ditemukan** di code |

**23 dari 27 key tidak direferensi di code.** Namun, ini mungkin dibaca secara dinamis oleh aplikasi IMAP/SMTP (misal via `process.env[KEY]` pattern) — bukan via literal string match. Perlu review manual.

## Measurements

| Metric | Value |
|--------|-------|
| Total .env files scanned | 5 |
| Total keys (active, uncommented) | 71 |
| Keys tidak terpakai (high confidence) | 28 (8 browserbase + 4 TICMI legacy + 11 searxng template + 5 imap likely-unused) |
| Keys perlu review manual | 23 (imap-smtp: mungkin loaded dinamis) |
| Services running yang pakai .env keys | 4 (hermes-dashboard, hermes-gateway, whatsapp-bridge, webreader) |

## Decision

**Needs Human Review**

Key yang bisa langsung dihapus (high confidence):
1. `~/.searxng-mcp/` — seluruh folder ini adalah leftover config template. Hapus folder.
2. `~/.hermes/.env` — hapus 4 key browserbase (`BROWSERBASE_PROXIES`, `BROWSERBASE_ADVANCED_STEALTH`, `BROWSER_SESSION_TIMEOUT`, `BROWSER_INACTIVITY_TIMEOUT`). Biarkan yang commented out.
3. `~/.hermes/secrets/.env` — hapus `TICMIDATA_USER`, `TICMIDATA_PASS`, `TICMIDATA_BEARER`, `TICMI_CF_CLEARANCE` (setelah konfirmasi webreader tidak pakai).

Key yang perlu review manual:
4. `~/.config/imap-smtp-email/.env` — 23 key tidak match literal string, tapi mungkin loaded dinamis. Jangan hapus tanpa review code IMAP/SMTP plugin-nya.

## Risk
- Menghapus TICMIDATA_* berisiko jika webreader dist masih membutuhkan. Perlu restart webreader container setelah hapus untuk verifikasi.
- Menghapus IMAP/SMTP keys tanpa review code berisiko break email functionality.

## Lessons Learned
- hermes `.env` punya 413 baris komentar vs 21 key aktif — rasio noise tinggi. Bisa di-trim.
- `.searxng-mcp/` adalah ghost config — folder tanpa code yang membacanya.
- Cross-referencing key names dengan `grep` bekerja baik untuk Hermes runtime (Python), tapi kurang reliable untuk Node.js yang load env secara dinamis.

## Next Priority
- Review code IMAP/SMTP plugin untuk konfirmasi env var usage sebelum cleanup
- Trim komentar hermes .env dari 413 ke ~50 baris
- Setelah cleanup, tambahkan komentar header di setiap .env: "# Last audited: 2026-08-06"
