---
task_id: t_w13_health
objective: OBJ-002
date: 2026-08-09
status: draft
---

# Webreader: Docker HEALTHCHECK untuk api + nginx

## Engineering Question
Container `webreader-api` dan `webreader-nginx` tidak punya healthcheck
terdefinisi — `docker inspect .State.Health` return null untuk keduanya.
Ini bikin error berulang di cron cycle yang query health status:
`template parsing error: <.State.Health.Status>: map has no entry for key "Health"`.
Bagaimana cara fix akar masalahnya?

## Method
1. Audit compose file: tidak ada directive `healthcheck` di service manapun.
2. Cek binary yang tersedia di dalam container:
   - `webreader-api` (playwright jammy): curl + wget tersedia.
   - `webreader-nginx` (nginx:alpine): curl + wget tersedia.
3. Cek endpoint:
   - api: `/health` → 200 `{ok:true}` (sudah ada di server.ts line 166).
   - nginx: `/` → 200 static index.html.
4. Tambah `healthcheck` block di `docker-compose.yml` untuk kedua service:
   - api: `curl -f http://localhost:8787/health`, interval 30s, timeout 5s,
     retries 3, start_period 30s (boot login butuh waktu).
   - nginx: `curl -fsS http://localhost/`, interval 30s, timeout 5s,
     retries 3, start_period 10s.
5. Recreate container (`docker compose up -d --force-recreate`).
6. Tunggu start_period, verify `docker inspect .State.Health.Status`.

## Findings (with measurements)

| Container | Before | After (40s) | After (90s) |
|-----------|--------|-------------|-------------|
| webreader-api | null (no healthcheck) | `healthy` | `healthy` |
| webreader-nginx | null (no healthcheck) | `healthy` | `healthy` |

- `docker inspect --format '{{.State.Health.Status}}'` sebelum:
  **template parsing error** (exit code 1).
- Setelah recreate: **`"healthy"`** untuk keduanya (exit code 0).
- Healthcheck log: semua ExitCode=0, interval 30s tercatat konsisten.
- HTTP verifikasi langsung: `api:200`, `nginx:200`.
- Files changed: 1 (`docker-compose.yml`, +14 lines).

## Decision
**Adopt.** Change applied, container direcreate, healthcheck aktif.
Healthcheck ini juga bermanfaat untuk:
- `depends_on` bisa di-upgrade ke `condition: service_healthy` di masa depan
  (nginx tunggu api sehat sebelum start).
- Docker auto-restart policy sekarang punya sinyal kesehatan yang akurat.
- Cron cycle query health status tidak akan error lagi.

## Risk
- **Low.** Healthcheck hanya read-only HTTP GET, tidak ada side effect.
- `start_period: 30s` untuk api cukup untuk boot login TICMI (retries 6 × delay 15s worst case = 90s, tapi health check hanya cek HTTP server, bukan token login — jadi OK).
- Jika TICMI login lambat dan healthcheck false-negative, `start_period` bisa dinaikin. Tapi selama ini boot server cepat (<5s untuk HTTP ready), tidak ada masalah.

## Lessons Learned
1. **Fix root cause > fix symptom.** Error template parsing di cron adalah
   symptom; akar masalahnya tidak adanya healthcheck. Tambah healthcheck
   sekali, semua consumer (cron, dashboard, `docker ps`) langsung dapat sinyal
   sehat tanpa patching per-consumer.
2. **`docker inspect .State.Health`** return error template kalau tidak ada
   healthcheck — ini bukan bug Docker, tapi API contract: null = tidak
   terdefinisi. Consumer sebaiknya guard dengan `{{if .State.Health}}`.
3. **nginx:alpine sudah include curl** — tidak perlu install tambahan untuk
   healthcheck. Hemat layer dan image size.

## Next Priority
- Upgrade `depends_on` nginx → api ke `condition: service_healthy` (compose
  v3.9+) untuk stronger startup ordering. Low effort, value jelas.
- Audit container lain di host (kalau ada) yang juga tidak punya healthcheck.
