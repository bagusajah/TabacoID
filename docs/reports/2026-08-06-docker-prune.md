# Daily Report 2026-08-06 — Docker Reclaimable Cleanup

## Engineering Question
9.3GB Docker reclaimable space teridentifikasi di report sebelumnya. Berapa yang bisa direclaim aman, dan apa dampaknya ke running services?

## Method
Audit penuh `docker system df -v`, kategorisasi tiap image (active/dangling/dead), identifikasi yang aman dihapus, eksekusi prune bertahap, verifikasi service health setelah cleanup.

## Findings

### Before
| Metric | Value |
|--------|-------|
| Images total | 23 |
| Images reclaimable | 9.29GB (76%) |
| Build cache | 1.004GB |
| Disk used | 45G (20%) |

### Kategorisasi
- **Dead services** (Supabase suite 10 images, n8n 2 images, kong/vector/imgproxy) — tidak ada container, usia 13-36 bulan: **~7.87GB unique**
- **Dangling webreader-api** (5 images, shared base ~2.33GB) — 4 tanpa container: **~456MB unique**
- **Running container on dangling image** — webreader-api container jalan di image tanpa tag, `webreader-api:latest` adalah build baru yang belum dipakai
- **Build cache** — 701MB reclaimable

### After
| Metric | Value |
|--------|-------|
| Images total | 3 (2 named + 1 dangling running) |
| Images reclaimable | 151MB (5%) — image dangling yang dipakai container |
| Build cache | 302MB |
| Disk used | **34G (15%)** |

### Sisa 151MB
Image `24b2758b2551` masih dangling karena container webreader-api jalan di atasnya. Akan otomatis ter-clean setelah `docker compose up --build` di webreader.

### Service Health Pasca-Prune
- webreader-nginx: ✅ 200
- webreader-api /health: ✅ 200
- Container uptime: tidak terganggu

## Decision
**Adopt** — 11GB direclaim tanpa downtime. Dead images (Supabase, n8n, kong, vector, imgproxy) sudah tidak relevan dan menghabiskan ruang selama >1 tahun.

## Action Items
1. ✅ Dead images removed (16 images, ~7.87GB)
2. ✅ Dangling images without containers removed (5 images)
3. ✅ Build cache pruned (701MB → 302MB)
4. 🔄 `docker compose up --build` di webreader untuk switch ke image baru — menghilangkan sisa 151MB dangling

## Risk
Tidak ada. Semua image yang dihapus tidak punya running container. Services tetap healthy pasca-prune.

## Lessons Learned
- `docker system df` report "reclaimable" menghitung shared layers berulang kali — angka 9.3GB lebih tinggi dari actual unique data yang bisa dihapus (~8.3GB)
- Container webreader-api jalan di dangling image (bukan tagged image) — ini terjadi karena `docker compose build` buat image baru tanpa mengganti container
- Dead Supabase/n8n images bertahan 13-36 bulan tanpa ada yang prune — perlu routine cleanup atau image retention policy

## Measurements
- `docker_images_before`: 23 images
- `docker_images_after`: 3 images
- `docker_reclaimable_before`: 9.29GB (76%)
- `docker_reclaimable_after`: 151MB (5%)
- `disk_used_before`: 45G (20%)
- `disk_used_after`: 34G (15%)
- `disk_reclaimed`: 11GB
