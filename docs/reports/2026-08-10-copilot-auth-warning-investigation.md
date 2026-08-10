---
task_id: t_b8298912
objective: OBJ-002
date: 2026-08-10
status: draft
---

# Copilot Auth Warning — Impact Investigation

## Engineering Question
`errors.log` hari ini menunjukkan 5 warning "Token from GITHUB_TOKEN is not supported: Classic PAT (ghp_*) are not supported by the Copilot API" plus 1 "token exchange degraded to RAW" event. Apakah ini mempengaruhi operasional engineering cycle?

## Method
Trace sumber token dan provider chain:
1. Cari semua Copilot auth warning di `~/.hermes/logs/errors.log`
2. Identifikasi sumber `GITHUB_TOKEN` (env vs `.env` file vs systemd env)
3. Periksa model config dan fallback chain (`~/.hermes/config.yaml`)
4. Periksa semua cron job provider/model (`~/.hermes/cron/jobs.json`)
5. Periksa gateway process environment untuk GITHUB_TOKEN
6. Periksa auth.json credential pool structure

## Findings

### Warning Statistics
| Metric | Value |
|--------|-------|
| Copilot auth warnings today | **5** |
| RAW token degradation events | **1** |
| Warning timestamps | 07:44 (×2), 13:23 (×2), 13:36 (×2) |
| Model calls yang gagal karena ini | **0** |

### Token Source
- `GITHUB_TOKEN` ada di `~/.hermes/.env` — berupa classic PAT (`ghp_*`)
- Gateway process (PID 657515) **tidak punya** `GITHUB_TOKEN` di environment-nya (systemd unit tidak pass env vars dari `.env`)
- `auth.json` credential pool punya 2 entry copilot: `env:GITHUB_TOKEN` dan `gh_cli` (`gh auth token`)

### Provider Chain — Copilot NOT in path
```
Default model: zai/glm-5.2
Fallback 1:    zai/glm-5.2
Fallback 2:    custom:lmstudio/prism-ml/bonsai-27b
```
Copilot **tidak ada** di model config maupun fallback chain.

### All Cron Jobs — ALL use zai
| Job | Provider | Model |
|-----|----------|-------|
| IDX Insider Alert | zai | glm-5-turbo |
| IDX Daily Digest | zai | glm-5.2 |
| Engineering Cycle (executor) | zai | glm-5.2 |
| Engineering Planner | zai | glm-5.2 |
| Report Reviewer | zai | glm-5.2 |
| Weekly Retrospective | zai | glm-5.2 |
| Dashboard Watchdog | — (script only, no_agent) | — |
| Report Auto-Commit | — (script only, no_agent) | — |

**0 dari 6 LLM-backed cron jobs menggunakan Copilot.**

### Kapan Warning Muncul
Warning timestamp (07:44, 13:23, 13:36) **tidak berkorelasi** dengan cron job execution times. Pola 2-warning-per-event menunjukkan credential pool initialization check — kemungkinan saat manual `hermes model` / CLI command atau gateway health check yang poll credential pool. Bukan saat LLM call.

## Decision
**Reject (tidak perlu fix urgent).** Warning ini cosmetic noise. Operational impact = 0 karena:
- Semua cron jobs pakai `zai/glm-5.2`, bukan Copilot
- Copilot tidak ada di fallback chain
- 0 model call yang gagal

**Fix path (low priority, jika ingin reduce log noise):**
1. Opsi A (simplest): Hapus `GITHUB_TOKEN` dari `~/.hermes/.env` — credential pool masih ada `gh_cli` fallback
2. Opsi B: Replace dengan fine-grained PAT (`github_pat_*`) dengan Copilot Requests permission
3. Opsi C: `gh auth login` device code flow (produces `gho_*` OAuth token)

Recommendation: Opsi A. Copilot tidak dipakai, token classic PAT di `.env` hanya menambah noise.

## Risk
- **Low.** Jika di masa depan Copilot ditambahkan ke fallback chain, token perlu di-fix dulu.
- `gh_cli` credential masih tersedia sebagai fallback di `auth.json`.

## Lessons Learned
- Warning di `errors.log` bisa cosmetic — perlu trace provider chain sebelum panik.
- Credential pool poll saat CLI init men-generate 2 warning per event (primary + fallback check), bukan 2 kegagalan berbeda.

## Next Priority
- Opsional: buat task untuk hapus `GITHUB_TOKEN` dari `.env` jika log noise mengganggu monitoring.
- Lanjut ke task berikutnya di board (Journald corruption investigation atau Webreader health endpoint).
