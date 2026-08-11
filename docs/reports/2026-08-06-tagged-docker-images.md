---
human_review: autonomous
---

# Daily Report 2026-08-06

## Engineering Question
Kenapa `docker compose up --build` selalu meninggalkan dangling image ~2.5GB di webreader?

## Method
1. Inspect running container vs tagged image — container pakai untagged sha, `latest` tag justru ke image lain
2. Cek docker-compose.yml — tidak ada `image:` directive, jadi compose build tidak retag hasilnya
3. Tambah `image: webreader-api:latest` dan `image: webreader-nginx:latest` ke docker-compose.yml
4. Rebuild + recreate container
5. Bersihkan dangling image
6. Verifikasi: zero dangling, API healthy

## Findings (with measurements)
- **dangling_images_before:** 1 image (2.48GB untagged)
- **dangling_images_after:** 0 images
- **docker_disk_images:** 2.543GB (2 tagged images only)
- **api_health:** 200 OK setelah recreate
- **container_image:** webreader-api:latest (sha256:e65363aa6fbb) — container sekarang jalan dari tagged image, bukan untagged

Root cause: docker-compose tanpa `image:` field membuat build tanpa tag. Container jalan dari untagged image, `latest` tag tetap di image lama. Setiap rebuild bikin untagged baru, yang lama jadi dangling.

## Decision
**Adopt** — fix sudah diterapkan dan terverifikasi. Ke depannya, `docker compose up --build` akan retag `latest` di tempat, tidak ada lagi dangling image.

## Risk
Rendah. Perubahan hanya menambah `image:` field di compose. Behavior identik — container tetap build dari Dockerfile, cuma sekarang dapat tag.

## Lessons Learned
Docker compose `build:` tanpa `image:` = silent disk leak. Selalu set `image:` kalau build lokal.

## Next Priority
- Monitoring: cek dalam 24-48 jam apakah `docker compose up --build` masih bersih dari dangling
- Ops: pertimbangkan `docker image prune -f` di cron weekly sebagai safety net
