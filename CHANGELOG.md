# TabacoID Changelog

All notable changes to tabaco.id engineering laboratory.

## [Unreleased]

### 2026-08-07
- **Operations:** Gateway RSS follow-up 24-48h — RSS 690 MB, growth 0.21 MB/h (4d uptime). Stable, no leak. Tracemalloc patch dari report sebelumnya TIDAK pernah di-apply ke code — hanya di-describe. systemd drop-in orphaned. ([report](docs/reports/2026-08-07-gateway-rss-24-48h-monitor.md))
- **Operations:** Fix hermes-logrotate.service exit 216/GROUP — hapus redundant User=/Group= dari systemd user service. Exit 216 → 0 (98ms). ([report](docs/reports/2026-08-07-logrotate-group-fix.md))
- **Operations:** Kanban backlog cleanup executed — 53 blocked → 6 deferred, 14 unblocked to ready. 31 merged/done (duplicates + stale). Pipeline mengalir lagi. Root cause: auto-followup step 6b membuat duplikat. ([report](docs/reports/2026-08-07-kanban-backlog-cleanup.md))
- **Operations:** Kanban backlog health audit — 51 blocked (31 auto-generated, 61%), 18-21 redundant. 0 ready tasks = pipeline mati. Root cause: skill step 6b dedup hanya exact substring, miss duplicates beda judul sama topik. Recommendation: human review + bulk archive + fix dedup. ([report](docs/reports/2026-08-07-backlog-health-audit.md))
- **Operations:** Cron wastage audit — 24 LLM calls today, 0 productive kanban task completions, >95% token waste. Pipeline stagnan (0 ready, 47 blocked). 48% task di board adalah auto-generated followup. Cron 1m harus dikurangi ke 30m atau dimatikan. Auto-followup task creation harus dimatikan. ([report](docs/reports/2026-08-07-cron-wastage-audit.md))
- **Operations:** Gateway running stale code — fix `kanban_db.py` di-deploy 2026-08-07 00:19 tapi gateway belum restart (up since 2026-08-03). 20 dispatcher crashes terhitung. Gateway memory 2.35 GiB. Needs manual restart. ([report](docs/reports/2026-08-07-gateway-stale-code.md))
- **Operations:** Root cause phantom load average RK3588 — CPU0 iowait accounting bug di Rockchip BSP kernel 6.1.43. CPU0 98.7% iowait kumulatif, inflate load ~4.0. Tidak ada impact performa aktual. ([report](docs/reports/2026-08-07-phantom-load-rk3588.md))
- **Core Engineering:** Kanban pipeline audit — 37/37 task blocked, pipeline stagnation. Root cause: skill template kind='comment' tidak dikenali sticky block, auto-followup amplification, cron 1m tanpa escape. 6 deadweight + 4 duplikat teridentifikasi. ([report](docs/reports/2026-08-07-kanban-pipeline-audit.md))
- **Operations:** TLS certificate chain incomplete pada hermes.tabaco.id — nginx VPS hanya serve leaf cert (1 of 3), missing Let's Encrypt YR2 intermediate. Python/curl gagal verifikasi. www.tabaco.id OK (3/3 chain). Fix: ganti ssl_certificate ke fullchain.pem di VPS. ([report](docs/reports/2026-08-07-tls-chain-broken-hermes.md))

### 2026-08-06
- **Audit:** Evaluasi pengurangan alert frequency backup — monitoring baru aktif, 0 data points. Re-evaluasi 13 Agustus setelah 7 automated runs. ([report](docs/reports/2026-08-06-alert-frequency-eval.md))

### 2026-08-06 — Kanban Dispatcher Crash Impact Audit (t_A35252F1)
- Report sebelumnya undercount: dispatcher down 10 jam (01:01→11:04), bukan 4 menit. 20 tick failures, bukan 5.
- Dampak: auto-promotion & auto-dispatch mati 10 jam. Tasks hanya jalan via cron manual claim.
- Semua 3 fix verified in place: data cleanup ✅, `_safe_int_ts()` guard ✅, skill template ✅
- Dispatcher zero errors selama 12+ jam setelah fix.
- Decision: Adopt (all fixes adequate, no further action needed)

### 2026-08-06 — Backup Automation Verification (t_F6E88C59)
- Dry-run backup: OK, 21M archive in 7s. Cron entries confirmed (03:00/04:00/04:30). All 10 source items exist.
- Offsite: rclone installed but no remote configured yet.
- Decision: Adopt (ready for tonight's first automated run)

### 2026-08-06 — LSP Orphan Investigation (tsserver cleanup mechanism)
- Task: t_E9283347 — investigasi mengapa tsserver orphan setelah cron session
- Temuan: `AIAgent.close()` tidak memanggil `shutdown_service()`, tapi idle reaper (600s timeout) sudah menangani cleanup
- Decision: Adopt (no change) — transient leak, idle reaper sufficient, tidak perlu code change saat ini
- Side fix: chmod 664 kanban.db (fix dashboard kanban plugin "read-only shm" warning)

### 2026-08-06 — RK3588 System Health Audit (iowait investigation)
- Task: t_2C2BFB9A — investigasi load average tinggi (7.36) pada idle RK3588
- Temuan: iowait 12% adalah kernel artifact (CONFIG_HZ=300), bukan bottleneck nyata. NVMe utilization <0.3%
- Thermal normal (31°C max), no throttling, 19 days uptime, RAM 49%, swap 4.6%
- 8 failed systemd units teridentifikasi (semua noise, bukan operational)
- 3 orphaned TypeScript LSP processes dari cron sessions (450MB, 4% CPU)
- Decision: no-action untuk iowait, cleanup systemd units + LSP orphans sebagai follow-up
- Laporan: `docs/reports/2026-08-06-rk3588-iowait-audit.md`

### 2026-08-06 — Cache Polling Strategy Assessment
- Task: t_59A87804 — investigasi apakah perlu naikkan TTL atau implement SSE untuk polling consumer
- Temuan: 0 polling consumers di codebase, tidak ada dashboard/real-time yang terencana
- Cache sudah env-configurable (`TICMI_CACHE_TTL_MS`), cukup naik TTL via env var kalau nanti ada polling
- Decision: no-change, prerequisite belum terpenuhi
- Laporan: `docs/reports/2026-08-06-cache-polling-strategy-assessment.md`

### 2026-08-06 — Offsite Backup Setup
- Buat `offsite-backup.sh`: upload backup terbaru ke rclone remote, dedup by filename, graceful skip jika belum ada remote
- Cron terdaftar: `30 4 * * *` (30 menit setelah healthcheck)
- Rekomendasi cloud: Cloudflare R2 (10GB free, no egress, S3-compatible)
- Monthly estimate: ~570MB (19MB × 30 days), well within free tier
- Status: **blocked** — butuh human action (buat R2 bucket + rclone config)

### 2026-08-06 — Copilot Token Audit
- Classic PAT (`ghp_*`) digunakan untuk Skills Hub (✅) dan Copilot API (❌ ditolak)
- `COPILOT_GITHUB_TOKEN` tidak diset → Hermes fallback ke `GITHUB_TOKEN` → selalu gagal
- Measurements: 6 WARNING/session, 100% copilot requests blocked
- Fix: buat fine-grained PAT di GitHub Settings (browser), set `COPILOT_GITHUB_TOKEN` di `~/.hermes/.env`
- Status: **blocked** — memerlukan human action (browser login ke GitHub)

### 2026-08-06 — .env Key Audit
- Audit 5 file .env (611 baris, 71 key aktif). 28 key high-confidence tidak terpakai.
- `~/.searxng-mcp/` — seluruh folder adalah config template tanpa code. Bisa dihapus.
- `~/.hermes/.env` — 4 key BROWSERBASE_* aktif tapi browserbase tidak dikonfigurasi. Bisa dihapus.
- `~/.hermes/secrets/.env` — TICMIDATA_* dan TICMI_CF_CLEARANCE tidak ditemukan di source code aktif. Perlu konfirmasi.
- `~/.config/imap-smtp-email/.env` — 23/27 key tidak match literal grep. Perlu review manual (mungkin loaded dinamis).
- Tidak ada key yang benar-benar "expired" — yang ditemukan adalah "tidak terpakai".

### 2026-08-06 — Backup success rate monitoring
- `hermes-backup.sh`: tambah `backup-state.json` (30-entry rolling state), failure notification via WhatsApp, tar error capture, log rotation
- `backup-healthcheck.sh`: report success rate dari state file (X/Y %, last 5 entries)
- Sebelumnya: backup gagal = silent. Sekarang: gagal = WhatsApp alert langsung + tercatat di state
- Temuan: backup script + cron baru dibuat hari ini, belum pernah berjalan otomatis
- **2026-08-06 backup-restore-test**: Audit + restore test backup harian Hermes. Gap ditemukan: kanban boards DB (48 tasks), skills (11MB), memories tidak ter-backup. Script + cron diperbarui. Restore verified: 1162 files, 0.42s, semua DB integrity ok.
- **2026-08-06 feature-check-warnings**: Investigasi 84 `check_fn returned False` warnings di errors.log (14.5% volume). Semua expected: 12 fungsi check yang selalu False di headless server (no browser, no BFL, no React preview). Source: upstream `hermes-agent/tools/registry.py:332` — bukan code lokal. Tidak ada per-logger log config di Hermes. Perlu upstream PR atau log filter feature. No code changes.
- **2026-08-06 load-investigation**: Debunked "4-core overloaded" claim. RK3588 is 8-core (4xA76+4xA55), load 3.1 = 39% utilization, runq empty. Premis report sebelumnya salah. Memory growth subprocess Hermes ~14 MB/h perlu monitoring.

### 2026-08-06 — Journald Persistent Storage
- **Infra**: Changed system journald from `volatile` to `persistent` via drop-in config (`/etc/systemd/journald.conf.d/persistent.conf`). SystemMaxUse raised from 20M to 200M. Preserves 140K+ log lines (20K error/fail) across reboots. Effective after next reboot.
- **Finding**: User services (hermes) don't use journald — they log to `~/.hermes/logs/`. Task premise corrected; system-level persistence was the real need.

### 2026-08-06 — Error Pattern Analysis
- **[Self-Improvement]** Analisis 306 baris errors.log: 10 pola distinct. Top: kanban dispatcher crash (14x, root cause: `started_at='%s'` literal string dari SQL leak). Data fix diterapkan. 36 feature-check warnings (noise, 12%). Code fix perlu review: `detect_stale_running()` tanpa try/except. Lihat `docs/reports/2026-08-06-error-pattern-analysis.md`.

### 2026-08-06 — Dashboard Reliability Audit
- **[Operations]** Audit dashboard reliability: uptime 3 hari (no restart), false positive rate ~91% (10/11 errors dari data corruption, bukan sistem error). Root cause: `strftime('%s','now')` disimpan sebagai literal string di kanban DB. Fix diterapkan, dispatcher errors berhenti. Lihat `docs/reports/2026-08-06-dashboard-reliability.md`.

### 2026-08-06 — TICMI API Caching Benchmark (7 endpoints)
- **[Experiments]** Benchmark 7 TICMI endpoint: cold avg 2058ms → cached avg 7.82ms (99.6% reduction, 263x speedup). Cache (TTL 60s) sudah live via preHandler/onSend hooks. Hipotesis >50% CONFIRMED. Lihat `docs/reports/2026-08-06.md`.

### 2026-08-06 — WhatsApp Latency Supplementary Analysis
- **[Experiments]** Supplementary WhatsApp bot latency benchmark — duplikat dari 2026-08-05 (101 samples sama), tambahan analisis time-of-day pattern dan response length correlation. Peak hours (13:00-14:00 WIB) latency 3-7x off-peak. Verbose responses (>1200 chars) avg 106.4s. Baseline confirmed: p50=19.6s, p95=74.0s.

### 2026-08-05 — Full Stack Inventory
- **[Core Engineering]** Map seluruh running services, ports, dependencies di stack Hermes. 54 services (40 system + 14 user), 15 distinct ports, 2 Docker containers, 18 Docker images (~9 GB, 7 GB unused), 5 Tailscale nodes.
- **[Finding]** VPS (host.tabaco.id) SSH connection refused — reverse proxy untuk hermes.tabaco.id mungkin down.
- **[Finding]** Load sustained 5.2 pada 4-core (130% utilization). Hermes dashboard 650 MB RSS.
- **[Finding]** 7 GB Docker images tidak terpakai (supabase stack + n8n). Port 111 (rpcbind) dan 5555 (ADB) exposed on 0.0.0.0 tanpa kebutuhan.
- **[Metric]** `total_services`: 54. `total_ports`: 15. `docker_reclaimable`: ~7 GB. `hermes_total_rss`: ~1.17 GB. `load_1min`: 5.20. `vps_reachable`: false.
- **[Decision]** Adopt — inventory lengkap, 3 follow-up priorities teridentifikasi.
- Files: `docs/reports/2026-08-05.md` (updated)

### 2026-08-05 — Pi Resource Baseline Profile
- **[Core Engineering]** Profil lengkap resource usage Orange Pi RK3588 saat idle. CPU 15% actual, RAM 41% (3.2/7.7 GiB), disk 19%, thermal 33°C.
- **[Finding]** Load average 6.5 vs 85% CPU idle — kernel bug RK3588 6.1.43, cpu0 iowait counter inflasi 10,000x. Load-based monitoring akan false-positive.
- **[Finding]** journalctl `Storage=volatile` + `/var/log` di zram — tidak ada persistent log, trend analysis mustahil.
- **[Finding]** Dashboard service memory terbesar: 643 MB (8.1% RAM, 50 threads). Total Hermes stack: 1.35 GB (17%).
- **[Metric]** `ram_used_pct`: 41%. `hermes_total_rss`: 1.35 GiB. `swap_used`: 177 MiB (4.5%). `thermal_max`: 33°C. `nvme_write_rate`: 6 GB/hari. `docker_reclaimable`: 9 GB. `uptime`: 18 hari. `oom_kills_7d`: 0.
- **[Decision]** Adopt — baseline established, sistem sehat.
- Files: `docs/reports/2026-08-05.md`

### 2026-08-05 — Webreader Token Refresh Reliability Audit (evening cycle 2)
- **[Operations / Webreader]** Audit token refresh reliability webreader-api. 67% scheduled refresh gagal dengan "Over Limit User Login" tapi **tidak ada data loss** — cached token tetap serve requests dengan 200 status.
- **[Finding]** TICMI concurrent session cap ~3. Setiap 8 jam scheduled refresh buat session baru tanpa logout lama — session menumpuk, lalu cap tercapai. Container restart trigger logout → slot freed.
- **[Finding]** 22% nginx requests return 404 dari unimplemented TICMI routes (`/ihsg`, `/listed-companies`, `/sector-indices`).
- **[Metric]** `token_refresh_success_rate`: 33% (3/9). `api_error_rate_post_failure`: 0%. `container_restarts_3d`: 1.
- **[Decision]** Needs Human Review — apakah tambah logout-before-login di scheduled refresh, dan apakah unimplemented routes perlu diimplementasi atau dihapus.
- Files: `docs/reports/2026-08-05-evening2.md`

### 2026-08-05 — Vercel SPA Routing Fix (evening)
- **[Operations / Website Platform]** Semua client-side route (`/reports`, `/about`, `/contact`, `/work`) return 404 di production. Root cause: tidak ada `vercel.json` — Vercel hanya serves static files, SPA rewrite tidak dikonfigurasi.
- **[Finding]** Homepage (`/`) jalan, tapi 4 dari 5 route broken sejak project dimulai (2026-08-02). Build pass, tapi production routing tidak tercakup CI.
- **[Finding]** Report parser juga tidak mengenali format report saat ini (`## Decision` vs `**Decision:**`) — semua reports ditampilkan tanpa category dan decision badge. Deferred ke cycle berikutnya.
- **[Action]** Buat `vercel.json` dengan SPA rewrite. Update homepage stale stats (Day 3→4, 10→13 reports). Update sitemap lastmod.
- **[Metric]** `broken_routes`: 4/5 → 0/5 (setelah deploy). `stale_homepage_days`: 1 day.
- **[Decision]** Adopt — production routing bug fix, 3 file changes, reversible.
- Files: `vercel.json` (baru), `src/data/site.ts`, `public/sitemap.xml`, `docs/reports/2026-08-05-evening.md`

### 2026-08-05 — RK3588 iowait Forensics
- **[Core Engineering / Host OS]** Investigasi iowait persisten ~12.3% di Orange Pi RK3588. Cross-check iowait% vs actual disk I/O — NVMe %util hanya 0.1-0.2% saat iowait 12.3%.
- **[Finding]** Root cause: **kernel 6.1.43-rockchip-rk3588 idle accounting bug**. CPU0 melaporkan 98.83% iowait, sementara CPU1-7 normal (~0.01%). Kolom idle/iowait tertukar di akuntansi scheduler. Ini known issue di Rockchip BSP kernel.
- **[Finding]** Docker reclaimable: 8.835 GB (76% images unused), 1 dangling image 845 MB.
- **[Finding]** VPS `host.tabaco.id` NXDOMAIN — DNS resolve gagal saat ini.
- **[Metric]** `iowait_actual_vs_reported`: 0.18% vs 12.3% (68x overestimate). `docker_reclaimable_GB`: 8.8. `nvme_temp_C`: 36.0 (normal).
- **[Decision]** Adopt (informasi). iowait artifact, bukan disk bottleneck. Docker prune perlu user approval.
- Files: `docs/reports/2026-08-05-iowait-forensics.md`

### 2026-08-05 — Hermes Memory Consolidation (morning)
- **[Hermes Self-Improvement]** Memory system gagal 38x dalam 6 hari (29 Jul–4 Aug). Root cause: cross-file duplication antara MEMORY.md dan USER.md menyebabkan kedua file mendekati/exceed limit.
- **[Finding]** MEMORY.md: 2207 chars / 2200 limit (**over limit**). 9 entries termasuk 1 resolved debugging fact. USER.md: 1111 chars / 1375 limit (81%). 4 dari 7 entries USER.md duplikat persis dengan MEMORY.md.
- **[Finding]** Contradiction: USER.md bilang "formal/polite", MEMORY.md bilang "casual". Resolved: MEMORY.md authoritative.
- **[Action]** Konsolidasi MEMORY.md (2207→1991 chars) dan USER.md (1111→673 chars). Total: 654 chars freed (19.7%).
- **[Metric]** `memory_errors_per_day`: 6.3 avg → expected ↓50%+. `memory_context_chars`: 3318 → 2664.
- **[Decision]** Adopt. Monitor 3 hari; jika error tetap >2/day → naikkan `memory_char_limit: 3000`.
- Files: `~/.hermes/memories/MEMORY.md`, `~/.hermes/memories/USER.md`, `docs/reports/2026-08-05-memory-consolidation.md`

### 2026-08-04 — Website Data Accuracy Audit (evening)
- **[Website Platform]** Homepage stats stale ("Day 1", "Phase 0") setelah 3 hari engineering work. Diupdate ke Day 3, Phase 1.
- **[Website Platform]** Sitemap missing `/reports` route — ditambahkan sejak commit `8d968df` tapi tidak masuk sitemap. Fixed.
- **[Operations]** Afternoon cron failed: HTTP 429 + idle timeout 603s. Consistent dengan rate limit pattern overlap.
- **[Metric]** `stale_days_homepage`: 2 days. `sitemap_missing_routes`: 1. `bundle_size_gzip`: 70.21 kB (unchanged).
- **[Decision]** Adopt homepage fix + sitemap update. Two files, data akurat.
- Files: `src/data/site.ts`, `public/sitemap.xml`, `docs/reports/2026-08-04-evening.md`, `CHANGELOG.md`

### 2026-08-04 — API Token Consumption Audit (7-day)
- **[Core Engineering]** Analisis lengkap Hermes API usage dari `agent.log` — 2,413 calls, 168.5M input tokens, 660K output tokens dalam 7 hari.
- **[Finding]** Cache hit rate 93.6% (2,143/2,404 calls ≥90%). Efektif.
- **[Finding]** glm-5-turbo: p50=4.6s, p95=30.7s, **max=453.3s** (outlier). glm-5.2: p50=5.4s, p95=20.1s, max=60.6s (lebih stabil).
- **[Finding]** 19% API calls melebihi 100K context window. Session compression triggered sekali (182K→101K tokens).
- **[Finding]** 52 unique sessions; 13 sessions >5M tokens. Top session: 28M tokens (long-running WhatsApp agent).
- **[Finding]** Rate limit: hanya 4 events/7 hari (0.17%), semua pada jam 19:00-21:00 WIB (concurrent overlap).
- **[Decision]** Needs Human Review — data siap, perlu verifikasi billing ZAI dan keputusan model strategy.
- Files: `docs/reports/2026-08-04.md`, `CHANGELOG.md`

### 2026-08-04 — Host Memory Reclamation + Journal Cap
- **[Operations]** Cleanup idle desktop applets (nm-applet, blueman-applet, update-manager) di headless XFCE. Hemat 236 MB.
- **[Operations]** Set `RuntimeMaxUse=100M` di journald.conf — volatile journal growth sebelumnya unbounded (~19M/hr).
- **[Metric]** Available RAM: 3.9G → 4.1G (+200 MiB). Desktop applet processes: 3 → 0.
- **[Finding]** TUI dashboard orphan sessions: 3 Node.js processes (~494 MB) dari browser tab yang ditutup tanpa WebSocket detach. Reaper logic (30min TTL) tidak trigger karena detach event tidak ter-register.
- **[Decision]** Adopt cleanup + journal cap. TUI orphan perlu code fix — Needs Human Review.
- Files: `docs/reports/2026-08-04.md`, `CHANGELOG.md`, `/etc/systemd/journald.conf`

### 2026-08-03 — Rate-Limit (429) Audit
- **[Operations]** Audit z.ai API 429 rate-limit patterns dari log analysis. Tiga subagent paralel dispatched untuk root cause, temporal analysis, dan config audit.
- **[Finding]** Diagnostic grep artifact terdeteksi: bare `grep "429"` menghasilkan 93.8% false positive (228 hits → 14 real) karena session ID `4295b1` match literal "429". Fix: gunakan `grep -E "RateLimitError|status=429|HTTP 429"`.
- **[Finding]** Real 429 events: 14 dalam 7 hari, hanya 2 main-loop throttle. Retry success rate 100%, zero user-visible failures, latency overhead ~7s.
- **[Finding]** Finance crons (IDX Daily Digest 16:00, IDX Insider Alert 18:00 WIB) jalan di z.ai peak hours (13:00-17:00 WIB). Needs Human Review untuk reschedule ke off-peak.
- **[Decision]** Adopt methodology fix; Reject premature concurrency throttling (0.6% throttle rate tidak justifikasi).
- Files: `docs/reports/2026-08-03-rate-limit-audit.md` (baru), `CHANGELOG.md`

### 2026-08-02 — Phase 0 Kickoff
- **[Reframe]** Aligned codebase with Vision doc — tabaco.id is now an engineering laboratory, not a studio portfolio
  - Files: `docs/VISION.md`, `.hermes/plans/improvement-pipeline.md`, Hermes skill, `src/pages/Home.tsx`, `index.html`
  - Impact: hero copy, SEO meta tags, operating cycle, and improvement backlog now match Vision
  - Build: passing (1650 modules, 0 errors)

### 2026-08-02 — Cycle 2: Navigation & Agency Copy Cleanup
- **[Fix]** Broken `/experiments` link in About hero → pointed to nonexistent route, caused 404. Corrected to `/work`.
- **[Reframe]** Footer copy still said "digital product studio" — contradicted hero ("Not a studio"). Rewritten to lab framing.
- **[Reframe]** Contact page stripped of agency remnants ("website redesigns", "project brief", `/services` orphan link). Rewritten to engineering-lab framing.
  - Files: `src/pages/About.tsx`, `src/components/SiteLayout.tsx`, `src/pages/Contact.tsx`
  - Build: passing (1650 modules, 4.97s, lint clean)

### 2026-08-02 — Cycle 3: Dead Dependency Removal
- **[Cleanup]** Hapus dead code yang di-tambah masa studio tapi gak pernah dipakai setelah Phase 0 reframe:
  - `framer-motion` (^11.18.2) — 0 import di seluruh `src/`. Dependency paling berat di daftar (drag transitive deps).
  - `zustand` (^5.0.3) — 0 import. Dead state-management code.
  - `src/hooks/useTheme.ts` — orphaned hook, 0 caller. Ngapain pertahankan kalau gak terhubung ke UI apa pun.
- Files: `package.json` (deps removed), `package-lock.json` (regen oleh npm), `src/hooks/useTheme.ts` (deleted).
- Outcome terukur: `npm install` bersih 4 package (framer-motion + 3 transitive deps hilang), audit surface turun, install time lebih cepat, CVE tracking lebih ringan.
- Build: passing (1650 modules, 5.07s). Lint: clean.
- Bundle size unchanged (`index-BAQpD0Im.js` 219.66 kB) — expected, karena dead deps gak pernah masuk import graph. Win-nya di install footprint + maintenance, bukan runtime bundle.

### 2026-08-02 — Cycle 4: SEO JSON-LD Organization
- **[SEO]** Tambah `Organization` JSON-LD structured data di `index.html` — menutup item terakhir Phase 0.4 (SEO basics). Meta tags + Open Graph sudah ada dari Phase 0 kickoff; JSON-LD belum.
- Alasan: mesin pencari (Google, Bing) mengkonsumsi JSON-LD untuk rich results dan entity recognition. Untuk situs lab yang ingin ditemukan sebagai entitas yang jelas (bukan studio ambigu), structured data adalah baseline, bukan opsional. Tanpa ini, crawler cuma lihat teks meta description biasa.
- Schema fields: `@type: Organization`, name (TabacoID), url, description (lab framing), email (dari `src/data/site.ts` contactEmail).
- Risiko: sangat rendah. JSON-LD adalah data statis di `<head>`, gak ada runtime cost, gak nge-hook ke React lifecycle. Rollback = hapus satu `<script>` block.
- Validasi: build passing (1650 modules, 4.90s). Lint clean. `index.html` naik 1.06 kB → 1.46 kB (gzip 0.52 → 0.63 kB).
- File: `index.html`

### 2026-08-03 — Phase 1.1: robots.txt + sitemap.xml
- **[SEO]** Tambah `public/robots.txt` dan `public/sitemap.xml` — item pertama Phase 1 (Lab Infrastructure). Modal crawlability: search engine sekarang tahu URL mana yang boleh di-crawl dan kapan terakhir diupdate.
- Alasan: tanpa robots.txt, crawler tidak punya signal allow/disallow dan tidak ada referensi ke sitemap. Tanpa sitemap, penemuan URL (terutama SPA CSR) lambat dan tidak terjamin. Dua file statis ini adalah baseline infrastruktur SEO, bukan optimisasi.
- Routes di sitemap: `/`, `/work`, `/about`, `/contact` (4 nav items dari `src/data/site.ts`). Route `/services` sengaja tidak dimasukkan — itu orphan route (tidak ada di nav), perlu keputusan content terpisah.
- Risiko: sangat rendah. Dua file statis di `public/`, Vite copy apa adanya ke `dist/`. Zero runtime cost, zero dependency. Rollback = hapus 2 file.
- Validasi: build passing (1650 modules, 4.90s). Lint clean. Kedua file terverifikasi ter-copy ke `dist/`.
- Files: `public/robots.txt`, `public/sitemap.xml`

### Planned (Phase 0 — Foundation)
- ~~Rebrand from "digital product studio" to "Hermes Engineering Laboratory"~~ ✓ (hero done, remaining pages next)
- ~~Remove dead deps (framer-motion, zustand, useTheme)~~ ✓ (Cycle 3)
- ~~SEO basics (meta tags, OG, JSON-LD Organization)~~ ✓ (meta/OG in Phase 0, JSON-LD in Cycle 4)
- Rewrite Services/Work/About/Contact pages to lab framing
- New page structure: Dashboard / Experiments / Reports / Architecture / Notes
- Static site generation (vite-ssg)

## 2026-08-06
- **Memory audit**: Memory aktual 43%, bukan 94% seperti diasumsikan task. Tidak ada memory leak evidence. Dashboard 666MB, gateway 384MB, stabil setelah 3 hari uptime.
- **Monitoring setup**: Pasang `memory-baseline.sh` cron (30 min interval), log ke `~/.hermes/logs/memory-baseline.log`. Trend data akan menjawab pertanyaan leak dalam 1-2 minggu.
- **Kanban DB cleanup**: VACUUM, 184KB → 180KB.

### 2026-08-07 — NVMe SMART Baseline (Operations)
- Installed nvme-cli, captured SMART data for KZ256 NVMe
- Health: 0% wear, 100% spare, 0 media errors, 45°C
- **Key finding**: 98/99 unsafe shutdowns (98.9%) — frequent hard power cuts
- 692 GB written in 245 days (~2.8 GB/day)
