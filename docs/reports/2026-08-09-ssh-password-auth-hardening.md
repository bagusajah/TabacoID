---
task_id: t_a803af53
objective: OBJ-002
date: 2026-08-09
status: draft
---

# SSH Password Authentication Hardening

## Engineering Question
SSH password authentication masih enabled di Pi yang internet-facing (exposed via Tailscale + VPS reverse proxy). Apakah aman untuk di-disable, dan bagaimana memastikan tidak lockout?

## Method
1. **Pre-check:** Verifikasi `~/.ssh/authorized_keys` punya minimal 1 key. Ditemukan 1 key RSA (`bagusmukmin`).
2. **Safety net:** Local ed25519 key (`id_ed25519`) belum ada di `authorized_keys`. Test `ssh -o BatchMode=yes localhost` gagal (Permission denied) karena tidak ada key yang match. Tambahkan ed25519 key sebagai backup → re-test → key auth sukses.
3. **Capture before-state:** `PasswordAuthentication` default (commented = yes), `PermitRootLogin yes`.
4. **Apply hardening:** Drop-in config `/etc/ssh/sshd_config.d/99-hardening.conf` dengan:
   - `PasswordAuthentication no`
   - `PermitRootLogin no`
   - `PubkeyAuthentication yes`
   - `KbdInteractiveAuthentication no`
   - `ChallengeResponseAuthentication no`
5. **Validate syntax:** `sshd -t` → OK
6. **Reload (bukan restart):** `systemctl reload ssh` — sesi existing tetap hidup.
7. **Post-verify:** Key auth masih jalan, password auth di-refuse.

## Findings (with measurements)

**Before:**
| Setting | Value |
|---------|-------|
| PasswordAuthentication | yes (default, commented) |
| PermitRootLogin | yes |
| KbdInteractiveAuthentication | no |
| PubkeyAuthentication | yes |

**After:**
| Setting | Value |
|---------|-------|
| PasswordAuthentication | **no** |
| PermitRootLogin | **no** |
| KbdInteractiveAuthentication | no |
| PubkeyAuthentication | yes |

**Verification results:**
- `ssh -o BatchMode=yes localhost` (key auth): **PASS** → `KEY_AUTH_STILL_OK`
- `sshpass -p WRONGPASS ssh ... -o PreferredAuthentications=password`: **DENIED** → `Permission denied (publickey)` — server hanya menawarkan publickey, password method hilang sepenuhnya
- `sshd -T` effective config: `passwordauthentication no`, `permitrootlogin no`
- Active sessions setelah reload: 4 (tidak terputus)
- `sshd -t` syntax check: OK

**Authorized keys:** 1 → 2 (RSA original + ed25519 safety net)

## Decision
**Adopt.** Hardening diterapkan langsung. Password auth disabled, root login disabled, key-only auth aktif. Risiko lockout diminimalisir dengan 2 authorized keys (RSA remote + ed25519 local).

## Risk
- **Lockout risk:** LOW. 2 key types authorized. Physical console (tty1, ttyFIQ0) juga masih aktif sebagai fallback.
- **Drop-in vs main config:** Menggunakan `/etc/ssh/sshd_config.d/99-hardening.conf` — override bersih, mudah di-rollback (rm file + reload).
- **ChallengeResponseAuthentication:** Deprecated alias di OpenSSH, ditambahkan untuk kompatibilitas backward (older clients).

## Lessons Learned
- Log rotasi terjadi setelah reboot (boot terakhir 05:01 hari ini). Hanya 2 baris sshd di journal. Tidak bisa dapat baseline data login historis (7 hari). Impact: tidak ada data brute-force attempt untuk konteks, tapi keputusan hardening tetap valid berdasarkan principle of least privilege.
- Local key (`id_ed25519`) sebelumnya TIDAK di-authorized. Kalau hanya rely pada remote RSA key, test localhost selalu gagal. Penting untuk verify key auth dengan key yang benar-benar authorized sebelum disable password.
- `systemctl reload ssh` (bukan restart) adalah cara yang aman — tidak drop existing sessions.

## Next Priority
- Audit VPS (`host.tabaco.id`) SSH config untuk konsistensi hardening.
- Pertimbangkan install `fail2ban` untuk rate-limiting brute-force pada exposed ports.
- Pertimbangkan disable `PermitRootLogin` juga di VPS jika masih enabled.
