# Daily Report 2026-08-07 — Docker Image Prune Cron: Rejected

## Engineering Question
Apakah perlu `docker image prune -f` di cron weekly sebagai safety net terhadap dangling image accumulation?

## Method
1. Review laporan terdahulu: root cause fix (`image:` di docker-compose.yml), monitoring 24 jam pasca-fix
2. Audit kondisi saat ini: dangling images, total images, build cache, disk usage
3. Analisis: apakah dangling image BISA muncul lagi setelah fix?
4. Evaluasi cost-benefit: cron overhead vs risiko yang sudah dimitigasi

## Findings (with measurements)
- **dangling_images:** 0 (fix `image:` efektif sejak 2026-08-06)
- **total_images:** 2 (webreader-api:latest 2.48GB, webreader-nginx:latest 62MB)
- **build_cache:** 302.8MB (151MB reclaimable — normal shared layers)
- **disk_usage:** 34G/234G (15%) — 198GB available, zero pressure
- **rebuild_frequency:** manual only, tidak ada automated rebuild cron
- **can_dangling_recur:** tidak — `image:` field memastikan setiap `docker compose build` retag `latest` di tempat, bukan bikin untagged baru

Root cause (compose tanpa `image:` field) sudah di-fix. Dengan fix ini, `docker compose build` selalu overwrite tag `latest`, bukan bikin image untagged baru. Dangling image tidak bisa lagi accumulate dari rebuild normal.

## Decision
**Reject** — cron prune ditolak. Alasan:

1. **Root cause solved** — `image:` field mencegah dangling dari build normal. Safety net untuk masalah yang sudah tidak ada = YAGNI.
2. **Zero disk pressure** — 198GB free, hanya 2 images, build cache 300MB. Bahkan kalau dangling muncul sekali, tidak akan bermasalah.
3. **Cron = maintenance burden** — satu cron lagi berarti satu failure point lagi, satu log lagi, satu hal yang harus di-audit kalau ada masalah.
4. **Rebuilds are rare** — hanya manual, bukan frequent. Risk accumulation sangat rendah.
5. **Build cache 151MB reclaimable** — kalau mau bersihkan, `docker builder prune -f` sekali sebulan lebih dari cukup, tidak perlu otomatis.

Kalau suatu hari dangling image kembali muncul, itu sinyal ada perubahan config (docker-compose.yml di-edit, image: field dihapus, atau build pattern baru). Saat itu justru perlu investigasi, bukan auto-prune yang menyembunyikan masalah.

## Risk
Tidak ada. Menambahkan cron yang tidak perlu justru menambah surface area error (disk I/O di schedule tertentu, silent failure kalau docker daemon down, false confidence).

## Lessons Learned
- Fix root cause > safety net. Kalau masalah solved di sumber, cron cleanup untuk itu adalah technical debt, bukan best practice.
- Auto-prune bisa menyembunyikan regresi — dangling image muncul lagi berarti ada yang berubah di config, dan itu info berharga yang hilang kalau auto-prune diam-diam membersihkannya.
- Disk space 15% + 2 images = tidak perlu lifecycle management.

## Next Priority
- Bersihkan 3 orphaned volumes (n8n_data, n8n_n8n_data, supabase_db-config) — legacy eksperimen, tidak dipakai
- `docker builder prune -f` sekali untuk reclaim 151MB build cache — manual, bukan cron
