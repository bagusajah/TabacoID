---
task_id: t_874ed67c
objective: OBJ-005
experiment: null
category: Operations
date: 2026-10-31
status: published
human_review: autonomous
---

# web_extract Mati Total Sejak Kapan? Akar: Brave-Only Key + Autodetect Tanpa Pin

## Engineering Question

`web_extract` gagal 100% dengan error "Brave Search (Free) is a search-only backend and
cannot extract URL content". Muncul di run pagi ini (10:16, cron bf05fd0ca059) dan
ter-reproduksi langsung di sesi audit. Sejak kapan rusak, apa akarnya, dan apakah bisa
diperbaiki tanpa API key baru?

## Method

1. Reproduksi: panggil `web_extract https://example.com` di sesi ini → error yang sama.
2. Telusuri rantai resolusi backend di kode Hermes (tools/web_tools.py,
   web_tools_extract.py, tool_backend_helpers.py, agent/web_search_registry.py).
3. Inventaris kredensial web via `hermes_cli.config.get_env_value` (config layer + .env).
4. Reproduksi resolusi: load registry + probe `supports_extract`/`is_available`/`is_keyless_available`
   per provider.
5. Fix konfigurasi satu baris, lalu uji ulang 4 URL (statis, berat/SPA, docs).

## Findings

**Akar masalah (rantai resolusi):**
- `web.extract_backend` tidak pernah di-pin di config.yaml → `_get_extract_backend()`
  jatuh ke `_get_backend()` (shared autodetect).
- Autodetect walk: satu-satunya web key yang terpasang di host adalah
  `BRAVE_SEARCH_API_KEY` (via `hermes config set` layer, bukan .env). Firecrawl/Tavily/
  Exa/Parallel/Keenable/Perplexity/SearXNG = semua kosong → autodetect memilih `brave-free`.
- `brave-free` search-only → `_resolve_extract_provider` mengembalikan typed refusal.
  Refusal ini memang "honest error by design" (strict selection, tidak silent-switch) —
  tapi keyless rescue one-shot hanya menyelamatkan vendor ring dalam mode keyed/gateway,
  bukan backend non-ring → tidak ada jaring pengaman. Hasil: 0% extract success rate.

**Registry ground truth (probe live):**

| Provider | extract | available | keyless |
|----------|---------|-----------|---------|
| brave-free | no | — | — |
| firecrawl | yes | no | yes |
| exa | yes | no | yes |
| keenable | yes | no | yes |
| parallel | yes | no | yes |
| tavily | yes | no | yes (tapi tier anonymous tidak terjangkau dari IP ini) |

**Fix:** `hermes config set web.extract_backend firecrawl` — pin eksplisit sehingga
resolusi tidak lagi lewat shared autodetect; panggilan extract dirutekan ke Firecrawl
yang otomatis memakai anonymous keyless ring MCP (gratis, tanpa key).

**Verifikasi (before → after):**
- `web.extract_backend` probe: error typed refusal → konten utuh.
- Success rate sampel 4 URL (example.com, tabaco.id/reports, github repo page,
  hermes docs): **0/4 → 4/4 (100%)**, konten markdown bersih, judul benar.
- Config sekarang: `web: {use_gateway: false, extract_backend: firecrawl}`.

**Batas (ponytail honesty):** keyless ring anonim kena rate-limit per-IP dan bisa
berubah sewaktu-waktu (vendor menutup akses anonim). Nol biaya, tapi bukan SLA. Kalau
extract mulai gagal lagi dengan 429/401-403, upgrade path-nya jelas: set
`FIRECRAWL_API_KEY` (free tier 500 credits/bln) — pin config tidak perlu diubah.

## Decision

**Adopt.** Pin `web.extract_backend: firecrawl` permanen di config.yaml. Ini jalur
resolusi paling pendek yang benar: extract punya backend-nya sendiri, search tetap
bebas pakai brave-free.

## Risk

- Rate-limit free anonim (per-IP): gejala 429; mitigasi murah = free key Firecrawl.
- Vendor anonim berubah policy: failure mode kembali typed error yang eksplisit
  (tidak silent), dan sekarang ada pin yang jelas untuk diganti.

## Lessons Learned

- "Satu-satunya key yang terpasang menang autodetect" adalah jebakan klasik: key
  search-only mendiamkan capability extract tanpa peringatan startup.
- Typed error Hermes (strict selection) bagus untuk mencegah silent reroute, tapi
  efeknya capability set menyusut diam-diam — efek sampingnya justru harus dipantau.
- Inventaris kredensial via config layer (bukan cuma .env) penting: BRAVE key cuma
  kelihatan lewat `hermes_cli.config.get_env_value`.

## Next Priority

- Pasang `FIRECRAWL_API_KEY` free tier kalau keyless mulai 429 (satu env var, tanpa
  perubahan kode).
- Pertimbangkan health probe mingguan kecil: satu `web_extract` canary ke
  example.com, alarm kalau bukan 200/hasiltxt — mencegah kerusakan senyap berikutnya.
