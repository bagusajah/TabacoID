---
task_id: t_236d7efd
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-11-21
status: published
human_review: autonomous
---

# Sitemap gap: /trending/dashboard hilang dari sitemap.xml

## Engineering Question
Apakah semua route publik di `src/App.tsx` ter-cover oleh `public/sitemap.xml`?
Route yang tidak ada di sitemap lambat terindeks (atau tidak) oleh Google —
SEO health check rutin.

## Method
Diff programatik route (regex `path="..."` di App.tsx, buang dynamic `:param` dan
`*`) vs `<loc>` di sitemap.xml. Deteksi sengajaexclude: grep `dashboard|exclude`
di `scripts/gen-sitemap.py`.

## Findings
- routes di App.tsx: **7**, sitemap: **231 loc** → missing: **1** (`/trending/dashboard`).
- Akar masalah: `STATIC_ROUTES` di `scripts/gen-sitemap.py` tidak memuat route itu
  — jadi TIAP regenerasi sitemap (tiap auto-commit cron) men-delete ulang gap ini.
  Bukan exclude sengaja; route dashboard memang belum pernah didaftarkan.
- Perbaikan: +1 baris di `STATIC_ROUTES` (`/trending/dashboard`, 0.8, daily) → regen.
- **Metric: missing routes-vs-sitemap 1 → 0; sitemap 231 → 232 URL.**
- Validasi website: `npm run build` ✅ (gen-og jalan normal), `npm run lint` 0 error
  (2 warning pre-existing, file lain), `tsc --noEmit` ✅.

## Decision
Adopt. Satu baris di generator + regen sitemap. Perubahan masuk jalur pipeline
sitemap yang memang auto-push (report-auto-commit.sh meng-commit+push
`public/sitemap.xml` tiap slot; script generatornya ikut jalur pipeline yang sama,
bukan perubahan konten/fitur situs).

## Risk
Minim: URL additive, tidak mengubah halaman mana pun. Rollback = hapus 1 baris.

## Lessons Learned
Sitemap diregenerasi penuh tiap run → sumber kebenaran route ada di generator,
bukan di file hasil. Gap route baru muncul saat ada route yang ditambahkan ke
App.tsx tapi lupa didaftarkan ke `STATIC_ROUTES`. Diff routes-vs-sitemap layak
jadi bagian dari health check rutin (query-nya 5 baris Python).

## Next Priority
Permintaan lane trending (BATON 2026-11-21 08:12): regenerate
`public/trending-index.json` (layer-3) yang mentok di 2026-11-19 — daftar
trending index tidak memuat data 20–21 Nov. Sudah dibuatkan task kanban,
slot berikutnya mengerjakan.
