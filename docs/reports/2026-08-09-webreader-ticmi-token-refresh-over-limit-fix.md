---
task_id: t_5f6bbf1f
objective: OBJ-002
date: 2026-08-09
status: draft
---

# Fix Webreader TICMI Token Refresh: Logout-Before-Login

## Engineering Question

TICMI scheduled token refresh gagal 4/4 kali (100% failure rate) dalam 30 jam
terakhir dengan error "Over Limit User Login". Kenapa refresh terjadwal selalu
gagal padahal boot login selalu sukses? Dan apakah data endpoint downstream
masih berfungsi selama ini?

## Method

1. **Audit log webreader-api** — grep semua event `ticmi_token_*` dalam
   container log (30h uptime). Hitung success vs failure ratio.
2. **Trace root cause** — baca `src/services/tokenManager.ts`, fokus pada
   `refreshToken()` (line 219) dan `initTokenManager()` (line 238). Bandingkan
   dengan `doLogout()` dan `shutdownTokenManager()`.
3. **Manual recovery** — gunakan escape hatch `/v1/system/token/logout` +
   `/v1/system/token/refresh` untuk free session slot + re-login.
4. **Fix code** — tambahkan `doLogout()` sebelum `loginOnce()` di
   `refreshToken()` agar slot sesi lama dibebaskan sebelum klaim sesi baru.
5. **Rebuild + redeploy** — `docker compose build api && docker compose up -d api`.
6. **Verify** — test `refreshToken` path via manual trigger, periksa log
   sequence (logout → refreshed), dan test data endpoint end-to-end.

## Findings (with measurements)

### Root Cause
`refreshToken()` memanggil `loginOnce()` **tanpa** `doLogout()` dulu. Setiap
8 jam (interval terjadwal), server mencoba login baru sementara sesi lama
masih aktif. TICMI punya concurrent-session cap — menolak dengan "Over Limit
User Login".

Boot login selalu sukses karena tidak ada prior session. Graceful shutdown
memanggil `doLogout()`, tapi:
- SIGKILL / container crash → skip shutdown handler → stale session tetap
  aktif di sisi TICMI → blok refresh berikutnya.
- Refresh terjadwal tidak pernah free slot → akumulasi stale sessions.

### Token refresh failure timeline
- `2026-08-07T07:43:42Z` — refresh OK (limitId 2366)
- `2026-08-07T15:43:42Z` — **FAIL: Over Limit User Login** (session 2366
  masih aktif)
- `2026-08-07T18:37:37Z` — refresh OK setelah manual container restart
  (limitId 2367) — ini terjadi karena restart lama memanggil shutdown handler
  → `doLogout()` → slot bebas
- `2026-08-08T02:37:37Z` — **FAIL: Over Limit User Login**
- `2026-08-08T10:37:37Z` — **FAIL: Over Limit User Login**
- `2026-08-08T18:37:37Z` — **FAIL: Over Limit User Login**

Failure rate scheduled refresh: **4/5 (80%)** — only succeeded after manual
restart that triggered graceful shutdown.

### Impact selama outage
Cached token (dari 2026-08-07 18:37Z) **masih valid** dan melayani data.
Semua endpoint `/v1/ticmi/*` return 200. IDX market data `lastUpdate:
2026-08-07` karena 8-9 Aug adalah weekend (BEI tutup). **Tidak ada user-facing
impact**, tapi sistem satu token-expiry-jabber dari total outage.

### Before/After Fix
| Metric | Before | After |
|--------|--------|-------|
| Scheduled refresh success rate | 0% (4/4 fail) | Expected 100% |
| `refreshToken()` path | loginOnly → Over Limit | logout → login → OK |
| Manual refresh test | N/A (would fail) | `00:44:57` → `00:47:20` OK |
| Log sequence | `refresh_failed` | `logout(2371)` → `refreshed(2372)` |
| Data endpoint latency | 0.96–3.90s | 0.66s |
| `lastLoginError` | "Over Limit User Login" | null |

### Deploy metrics
- TypeScript build: exit 0 (0 errors)
- Docker image rebuild: 2.4s export layer
- Boot login on new container: limitId 2371 (success)
- Post-deploy refresh test: logout(2371) → refreshed(2372) — **pattern works**

## Decision

**ADOPT.** Fix live, container redeployed, verified working. Root cause
addressed at the shared function (`refreshToken`) — all callers (scheduled
timer, upstream-401 retry, manual trigger) benefit.

## Risk

- **Low.** `doLogout()` is best-effort (swallows errors internally). If TICMI
  logout endpoint is down, the login proceeds anyway — worst case reverts to
  old behavior (login fails with Over Limit).
- If `cachedToken` is stale/invalid but non-null, logout may return non-200.
  This is already handled: `doLogout()` logs and clears cached state
  regardless of response status.
- RefreshInterval unchanged (8h). TICMI JWT validity appears >8h based on
  30h-old token still working.

## Lessons Learned

1. **Concurrency-session-cap systems need logout-before-login, not just
   login-on-boot.** TICMI's session model is per-User-Agent + limitId. Every
   refresh cycle must free the old slot first.
2. **Cached token masked the failure for 36+ hours.** Data endpoints kept
   working because the JWT was still valid. Without monitoring on
   `lastLoginError`, this would've gone unnoticed until JWT expiry.
3. **Manual escape hatches (`/v1/system/token/logout`) saved the day** —
   allowed operator recovery without container restart. Good design pattern
   for stateful-external-resource managers.
4. **The boot backoff retry logic (lines 242-258) handles the same error but
   only at boot.** The scheduled refresh path had no such handling — it just
   swallowed the error and waited for the next 8h cycle. Now fixed at root.

## Next Priority

- Add monitoring alert when `lastLoginError != null` persists >1 refresh cycle
  (would catch this class of issue in minutes, not hours).
- Consider shortening `TICMI_TOKEN_REFRESH_MS` from 8h → 6h to stay further
  from JWT expiry boundary (need to confirm JWT TTL first).
