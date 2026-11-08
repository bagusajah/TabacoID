---
task_id: t_b4a678a4
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-08
status: published
human_review: autonomous
---

# Log Hygiene Audit: Hermes logs, journald, docker logs (H4+OS1)

## Engineering Question
Apakah log di Pi (hermes logs, journald, docker container logs) punya kebijakan rotasi yang benar, dan berapa footprint aktual + growth rate-nya?

## Method
Inventarisasi tiga lapisan log: `~/.hermes/logs/` (agent-level), journald (system-level, `/etc/systemd/journald.conf`), docker `json-file` driver (per-container + defaults `daemon.json`). Coverage rotator di-trace dari `hermes-logrotate.timer` (user systemd, daily 00:06) ke confignya. Ukuran via `stat`/`du`/`docker logs | wc -c`; enforce-ment journald diverifikasi dengan membandingkan `journalctl --disk-usage` vs knob yang benar-benar berlaku per `man journald.conf`.

## Findings (with measurements)

**1. Hermes logs — SEHAT, rotasi sudah jalan sejak Sep-21.**
- `hermes-logrotate.timer` (daily 00:06, last run status=SUCCESS) → `logrotate-hermes.conf`: daily, rotate 90, compress, maxsize 50M, cover 5 file (gateway/agent/errors/dashboard-auth/gui).
- Total footprint `~/.hermes/logs/`: **11 MB** (aktif + 90 generasi .gz).
- Growth/24h: agent.log 899 KB, gateway.log 398 KB, errors.log 334 KB. Backlog H4 ("agent.log 1.7MB & growing, apa policy-nya?") → sudah terjawab: policy ada sejak 21 Sep.
- **Gap ketemu**: `memory-baseline.log` (274 KB, cron */30min, append-only) + `gateway-exit-diag.log` (98 KB) tumbuh **tanpa rotasi** — tidak terdaftar di config logrotate. (2 file lain, shutdown-diag 483 KB & mcp-stderr 45 KB, event-driven/reset tiap restart — biarkan.)

**2. Journald — berjalan sesuai desain, RAM ~113 MB itu pilihan config yang aktif.**
- Config efektif (`/etc/systemd/journald.conf`): `Storage=volatile` + **`RuntimeMaxUse=100M`** (baris 29 — knob yang benar utk mode volatile).
- Realita: journal 113 MB di tmpfs `/run` (14% dari 794M), 9 file × 13 MB, retention ~27 jam. Cap 100M **ter-enforce**: rotasi tiap ~4 jam menambah file 13M, file terarchive ter-vacuum di tick berikutnya — usage osilasi ~100–113M (100M cap + slack file aktif). Sesuai desain.
- Baris `SystemMaxUse=20M` (baris 25) adalah **dead letter**: di mode volatile knob itu tak berlaku (hanya untuk persistent `/var/log/journal`). Harmless karena RuntimeMaxUse ada, tapi menyesatkan pembaca config (termasuk saya di audit ini — temuan awal "cap 20M tak pernah aktif" terbukti salah karena grep awal cuma mencari `SystemMaxUse`, kelewat baris 29).
- Kalau mau hemar RAM 93 MB: turunkan `RuntimeMaxUse` 100M→20M (1 perintah sudo + restart journald). Trade-off: retention 27 jam → ~5 jam. Keputusan manusia, bukan defect.

**3. Docker logs — SEHAT.**
- Defaults `daemon.json`: json-file, max-size 10m × 3. 5/7 container eksplisit mengikuti (webreader-nginx 5m×3).
- 2 container (cicd-console-db-1, crawl4ai) tampak `Config: []` di inspect — tapi `docker logs | wc -c`: 11.6 KB & 24 KB. Defaults daemon tetap berlaku, **tak ada risiko unbounded**.

## Decision
**Adopt (parsial):**
- ✅ Dilakukan: `memory-baseline.log` + `gateway-exit-diag.log` ditambahkan ke `~/.hermes/logrotate-hermes.conf` (weekly, rotate 8, compress, copytruncate). Validasi `logrotate -d` dry-run: config terbaca, nol error, kedua file dikenali. Efektif di tick 00:06 berikutnya.
- ℹ️ Dicatat untuk human review (opsional, bukan defect): rapikan dead line `SystemMaxUse=20M` dan/atau turunkan `RuntimeMaxUse=100M`→20M kalau 93 MB RAM lebih berharga daripada retention 27 jam.

**Reject:** intervensi docker log-opts (sudah di-cap) dan rotasi untuk shutdown-diag/mcp-stderr (event-driven, reset saat restart).

## Risk
- Rotasi baru weekly×8 = maksimum ~2 MB, non-critical (memory-baseline di-append cron tiap 30 menit, isi bisa di-regenerate; exit-diag hanya diagnostik crash).
- `copytruncate` di file append-only: beberapa baris bisa hilang di jendela truncate — dapat diterima untuk log aux.
- Perubahan hanya menyentuh `~/.hermes/logrotate-hermes.conf` (file user, tanpa sudo); state logrotate sendiri tidak disentuh.

## Lessons Learned
- **Narrow grep = false finding.** Grep pertama saya (`SystemMaxUse|MaxRetentionSec`) melewatkan `RuntimeMaxUse` yang justru knob aktif — nyaris menerbitkan report "misconfig" yang salah. Pattern yang sama dengan peringatan skill soal verification false-positive: verifikasi ulang dengan query lebih luas sebelum menyimpulkan, dan bandingkan selalu intent (config) vs realita (ukuran terukur) — bedanya 113M vs "20M" baru ketahuan kalau dua-duanya dicek.
- Knob systemd kembar nama (`SystemMaxUse` vs `RuntimeMaxUse`) butuh man page, bukan intuisi.
- Logrotate config perlu audit coverage berkala: 2 file aux lahir Sep–Nov tanpa pernah masuk config.

## Next Priority
- Human review opsional journald (lihat Decision).
- Backlog tersentuh samping: OS4 docker prune — `docker system df` menunjukkan 1.0 GB images + 260 MB build cache reclaimable.
