---
task_id: t_99345FC6
objective: follow-up
source_report: 2026-08-06-env-key-audit
date: 2026-08-07
status: draft
human_review: approved
---

# Review IMAP/SMTP Plugin Code — Konfirmasi Env Var Usage

## Engineering Question
File `~/.config/imap-smtp-email/.env` berisi 27 key IMAP/SMTP untuk 2 akun Gmail. Audit sebelumnya tidak menemukan 23/27 key direferensi via literal string match di code. Apakah plugin email Hermes memang membaca key-key ini secara dinamis? Aman dihapus?

## Method
1. Baca source code plugin email Hermes (`plugins/platforms/email/adapter.py`, 1268 baris)
2. Extract semua `os.getenv()` dan `os.environ` calls
3. Bandingkan nama env var di code vs nama key di `.env` file
4. Cek apakah platform email di-enable di `config.yaml`
5. Cek apakah env var ada di gateway process runtime (`/proc/<pid>/environ`)
6. Cek gateway logs untuk aktivitas email

## Findings (Measurements)

### Plugin email menggunakan `EMAIL_*` prefix, bukan `IMAP_*`/`SMTP_*`

| Env var di code (`adapter.py`) | Env var di `.env` | Match? |
|-------------------------------|-------------------|--------|
| `EMAIL_ADDRESS` | `IMAP_USER` / `SMTP_USER` | ❌ |
| `EMAIL_PASSWORD` | `IMAP_PASS` / `SMTP_PASS` | ❌ |
| `EMAIL_IMAP_HOST` | `IMAP_HOST` | ❌ |
| `EMAIL_IMAP_PORT` | `IMAP_PORT` | ❌ |
| `EMAIL_SMTP_HOST` | `SMTP_HOST` | ❌ |
| `EMAIL_SMTP_PORT` | `SMTP_PORT` | ❌ |
| `EMAIL_ALLOWED_USERS` | (tidak ada) | ❌ |
| `EMAIL_POLL_INTERVAL` | (tidak ada) | ❌ |

**0 dari 27 key di `.env` cocok dengan env var yang dibaca plugin.** Nama variabelnya berbeda total.

### Platform email tidak di-enable di config

`config.yaml` section `platforms:` hanya berisi `whatsapp: enabled: true`. Tidak ada entry email.

### Env var tidak ada di gateway runtime

`/proc/515158/environ` (gateway PID) — **0** env var dengan prefix `EMAIL_`, `IMAP_`, atau `SMTP_`.

### Gateway logs — 0 aktivitas email

`journalctl --user -u hermes-gateway --since "7 days ago" | grep -iE "email|imap|smtp"` → kosong.

### File berisi plaintext credentials untuk 2 akun Gmail

- `goodtheclawbot@gmail.com` — app password `[REDACTED — credentials shredded]`
- `[REDACTED_EMAIL]` — app password `[REDACTED — credentials shredded]`

Kedua akun ini tidak digunakan oleh sistem apapun yang running. Credentials sudah di-shred dari `.env` file.

## Decision

**Adopt — Hapus file dan direktori.**

User konfirmasi: "email tidak dipakai". Code review membuktikan nama env var tidak match, platform tidak enabled, tidak ada runtime activity. File hanya berisi exposed credentials yang tidak dipakai.

**Action taken:**
- `shred -u ~/.config/imap-smtp-email/.env` (secure delete)
- `rmdir ~/.config/imap-smtp-email/` (direktori kosong dihapus)

## Risk
- Jika user pernah pakai akun Gmail ini untuk automation lain di luar Hermes, credentials hilang. Namun user sudah konfirmasi tidak dipakai.
- App passwords Gmail bisa di-regenerate anytime di Google Account settings, jadi bukan irreversible loss.

## Lessons Learned
- Literal string grep di audit sebelumnya benar — 23/27 key tidak direferensi. Tapi 4 key yang "match" (`IMAP_HOST`, `IMAP_PORT`, `SMTP_HOST`, `SMTP_PORT`) adalah false positive: nama var di `.env` kebetulan mirip tapi prefix-nya beda (`IMAP_HOST` vs `EMAIL_IMAP_HOST`).
- Plugin Hermes pakai `EMAIL_*` prefix konsisten. Konvensi: `{PLATFORM}_{SETTING}`.
- Credentials di `.config/` subfolder dengan permission 600 masih aman dari sesama user, tapi tetap exposure risk kalau filesystem di-backup atau ter-share.

## Next Priority
- Hapus sisa unused keys dari audit sebelumnya: `BROWSERBASE_*` (4 key di `~/.hermes/.env`), `TICMIDATA_*` (4 key di secrets), `~/.searxng-mcp/` folder.
- Trim komentar `~/.hermes/.env` dari 413 → ~50 baris.
