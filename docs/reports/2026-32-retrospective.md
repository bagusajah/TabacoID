# Weekly Retrospective — Week 32, 2026

## Summary
- **Tasks completed:** 160
- **Tasks blocked:** 1 (t_063dbcf3 — memory monitor wiring, needs human commit)
- **Reports published:** 137 (dari total 141 di repo)
- **Reports draft:** 2 (menunggu review)
- **Decision quality:** Tinggi — mayoritas decision benar dan tervalidasi. 2 area yang masih outstanding: gateway memory monitoring infra (multiple fix attempt, belum live) dan offsite backup (human bottleneck).

Distribusi harian: Aug 6 (41), Aug 7 (74 — spike board cleanup), Aug 8 (29), Aug 9 (16). Spike Aug 7 didominasi task merge/stale cleanup pasca-fix engineering cycle itu sendiri.

## Completed Tasks

| Kategori | Jumlah | Highlight |
|----------|--------|-----------|
| hermes-infra | 81 | Board cleanup, cron fix, guard anti-pattern, os.environ race, gateway memory |
| host-os | 28 | Service purge (1GB+ RAM), SSH hardening, security patches, ZRAM/NVMe audit |
| hermes-itself | 18 | Skill template fixes (strftime, kind=blocked), prompt injection fix, schema hints |
| webreader | 17 | TICMI token fix, Docker HEALTHCHECK, cache benchmark (263x speedup) |
| cicd-console | 7 | Forward-only migrations, notification driver, calendar/tracking UI |
| tabacoID-website | 5 | SEO meta tags, reports pagination+filter |
| vps | 3 | TLS chain fix, DNS map, infra audit |

## Decision Review

### ✅ Decisions yang held up (Adopt — benar)

1. **TICMI cache benchmark → YAGNI applied correctly.** 263x speedup terbukti (2058ms→7.82ms), tapi traffic 0.57 req/day = 0% hit rate. Decision: jangan over-engineer per-endpoint TTL. Tiga task per-endpoint TTL di-REJECT dengan justifikasi konsisten. Ini textbook lazy engineering.

2. **Board cleanup (53→6 blocked tasks).** Root cause ditemukan: skill template `kind=comment` bug + cron 1m + auto-followup amplification. Tiga fix berlapis (kind fix, cron interval, auto-followup disable). Pipeline mengalir lagi.

3. **os.environ race fix (`_snapshot_environ`).** KeyError eliminated: 11 total → 0 new sejak restart. Fix tested 5200 iterations 0 failures. Root cause ditemukan dan di-fix di shared function.

4. **Swappiness 100→60.** Swap-out rate turun 90.9% (180.7→16.5 pages/hr). Validated, no OOM, no memory pressure.

5. **Host OS service purge.** spamassassin/clamav/mariadb/bind9/protonvpn purged. 1GB+ RAM + 1GB disk recovered. Zero breakage.

6. **CICD forward-only migrations.** `sync({alter:true})` replaced. 223/223 tests pass, 21 tables, idempotent. Technical debt closed.

7. **TICMI token refresh fix.** Root cause: login-without-logout = "Over Limit User Login". Fix: logout-before-login. 0% → working.

### ⚠️ Decisions yang partially held / masih outstanding

1. **Gateway memory: "step-function, not leak" conclusion.** Multiple audits (t_782b0de2, t_49b5dbdd, t_1A3B5450) menyimpulkan step-function growth, weekly restart adequate. **Saat ini:** RSS 911MB, +429MB dalam 18h post-restart (~24MB/h). Masih dalam batas aman, tapi kalau terus tumbuh di rate ini → ~1.4GB by Aug 16 restart. Conclusion belum terbantahkan, tapi masih diuji.

2. **Tracemalloc watcher race fix (t_ac75c250).** Fix code benar (py_compile OK), tapi **tidak live** — gateway PID 657515 running old code sejak 03:00, fix di-apply 09:07. 0/19 expected snapshots. Fix baru akan aktif next restart (Aug 16 atau manual).

3. **start_memory_monitoring() wiring (t_063dbcf3).** Dead code identified, wiring done, tapi **blocked-needs_input** — perlu human commit + restart. Dua sistem memory monitoring (memory_monitor.py + tracemalloc watcher), **keduanya belum functional di production**.

### ❌ Decisions yang aged poorly

1. **Offsite backup (t_DA0BBE96).** Script exists dan well-written, tapi rclone remote belum dikonfigurasi sejak task pertama (Aug 6). Ini gap ke-7 hari berjalan. **Risk:** semua backup lokal — kalau NVMe atau Pi gagal, data hilang. Human action needed sejak day 1, masih outstanding.

## Objective Progress

| Objective | Tasks This Week | Assessment |
|-----------|----------------|------------|
| OBJ-002 (Production infra) | 28 | Kuat — hardening, patches, backup, monitoring. Gap: offsite backup. |
| OBJ-005 (Engineering workflows) | 13 | Excellent — cycle self-corrected: cron waste, guard anti-pattern, schema hints, template bugs. |
| OBJ-001 (Autonomous value) | 4 | Moderate — CICD console features, website SEO. Value demonstrated tapi volume lebih kecil. |
| OBJ-003 (Experiments) | 0 ready | Tidak ada task eksperimen baru. Cache benchmark saja yang relevan. |
| OBJ-004 (Cost sustainability) | 0 ready | Tidak ada task spesifik. Implicit: semua dalam free tier / existing infra. |

## Trends

### 📈 Improving
- **Process discipline naik signifikan.** Engineering cycle memperbaiki dirinya sendiri: cron 1m→30m, guard anti-pattern didokumentasikan, schema hints anti-hallucination, hard_stop guardrails. Cycle ini sekarang jauh lebih efisien dari awal minggu.
- **Infrastructure security posture membaik drastis.** SSH password auth disabled, 6 CVEs patched, unnecessary services purged (1GB+ RAM), filesystem safety nets (fsck+fstrim).
- **Backup maturity naik.** Dari "tidak ada backup" → daily tar + healthcheck + state tracking + restore tested. 7 critical items added.

### 🔁 Recurring problems
- **Gateway memory monitoring infra:** 3+ task untuk wiring memory monitoring, masih belum fully live di production. Pattern: fix code → butuh restart → restart terjadwal mingguan → fix delayed seminggu.
- **Human-in-the-loop bottleneck:** offsite backup (rclone config), memory monitor wiring (code commit), website non-report changes (push approval). Task-task ini menumpuk di blocked state.
- **Board pollution dari auto-generated tasks:** sudah di-fix (auto-followup disabled), tapi 47+ merged/stale tasks menunjukkan damage yang sudah terjadi. Perlu vigilance agar tidak kambuh.

### 📊 Metrics snapshot (end of week)
- Gateway RSS: 911MB (18h post-restart, +24MB/h trend)
- Disk usage: 15% (35G/234G) — stabil setelah Docker prune
- Dangling images: 1 (minimal)
- KeyError errors: 3 (residual pre-fix, 0 new)
- Load average: ~1.35 (healthy, phantom iowait confirmed cosmetic)
- Docker: 29.7.2 (upgraded), webreader containers healthy
- Memory: 30% used (post-purge improvement)

## Follow-up Actions

1. **[HIGH] Gateway memory trend watch** — RSS 911MB dan climbing. Kalau cross 1.3GB sebelum Aug 16 restart, pertimbangkan shorter restart interval (3-4 hari) atau investigasi root cause lebih dalam. Monitor harian.

2. **[HIGH] Tracemalloc + memory monitor activation** — Kedua fix (t_ac75c250 race, t_063dbcf3 wiring) butuh gateway restart untuk live. t_063dbcf3 blocked-needs_input (human commit). Next window: Aug 16 weekly restart, atau manual restart kalau urgency naik.

3. **[MEDIUM-HIGH] Offsite backup — escalate human action** — rclone remote belum dikonfigurasi sejak Aug 6. Semua backup lokal = single point of failure. Sudah 7 hari outstanding. Perlu explicit human reminder.

4. **[MEDIUM] adbd:5555 on 0.0.0.0** — Teridentifikasi di SSH/network audit (t_5a1b7ff3, t_8436ffbe), tapi tidak ada follow-up task untuk membatasi atau disable. Security exposure.

5. **[LOW] OBJ-003 (Experiments) dan OBJ-004 (Cost) kosong** — Tidak ada task eksperimen atau cost-audit minggu ini. Pertimbangkan planner untuk create task di area ini untuk minggu depan.
