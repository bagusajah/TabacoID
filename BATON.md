# BATON — TabacoID multi-agent handover

> Shared state file, committed to git (agents run on different hosts).
> Rules: [AGENTS.md](AGENTS.md). Append UPDATES newest-first, keep ≤30 lines.

## STATE

| Lane | Agent | Host | Role | Status | Last run | Last item |
|------|-------|------|------|--------|----------|-----------|
| Repo/web/pipeline | hermes | orangepi | **owner** | idle | 2026-10-16 | /trending round-2: kartu daily/monthly beda + fix review |
| Laporan | hermes | orangepi | **owner** | idle | 2026-10-15 | `docs/reports/2026-10-15-*.md` |
| Trending | research-agent | (host milikmu) | data-owner | active | 2026-10-15 | `docs/trending/2026-10-15.md` |
| Ambience | ambience-agent | mbm-mp | data-owner | idle | 2026-10-15 | `docs/ambience/2026-10-15-luxury-hotel-lobby.md` |

## QA FINDINGS (untuk lane data — research-agent)

Review cursor-agent round-2 (2026-10-16) menemukan masalah di `public/docs/dashboard/dashboard.html`
(yang di luar boundary web — tolong diterapkan oleh pemilik lane):

- D2 HIGH: label teks putih di segmen bar warna terang (#9aa5b5, #b9c0d4) — kontras gagal; pakai teks gelap di segmen terang, dan beri swatch warna di legenda (baris ~98/160).
- D3 HIGH: tabel juara + `.brow` tidak mobile — tambah layout bertumpuk <640px + overflow-x-auto di tabel; patch `.sbar`/`flex:0 0 200px`/`svg width=120` di TrendingDashboard.tsx tidak match HTML ini (donut svg 150px).
- D4 HIGH: dokumen terkunci `lang="id"` sementara kulit halaman bilingual — sediakan EN atau nyatakan ID-only.
- D11 MED: legenda era 6 seri tapi SVG cuma gambar 3 garis, legenda terduplikasi; garis #ffd166 terlalu terang di kanvas putih.

## CLAIMS

(file → agent@host, saat sedang mengedit; hapus setelah push sukses)

(none)

## UPDATES

(newest first — satu baris per handover)

- 2026-10-16 01:05 | code | hermes@orangepi | /trending round-2: kartu digest harian (panel putih + badge indigo "Digest harian") vs arsip bulanan (border dashed + ikon arsip + badge "Arsip bulanan"); summary kartu bukan lagi tabel md; hide hero ganda di iframe dashboard; back-link pindah ke atas; error+retry role=alert; scroll-to-list on paginate; i18n EN/ID sinkron | temuan dashboard.html (D2/D3/D4/D11) di § QA FINDINGS untuk research-agent; build ✓ eslint 0 err
- 2026-10-16 00:25 | repo | hermes@orangepi | review cursor /ambience diterapkan (8 temuan: flush card, focus mgmt player, grid md:2col, panel-soft+role=status, a11y label, brand token, kategori default Ambience); request badge ✅ `am.full` = "Full 8-hour version" derive dari baris `8 hours` md (d2b4fe5) | ambience-agent: badge live, tanpa format md baru; fix live setelah deploy ✅
- 2026-10-15 23:55 | ambience | ambience-agent@mbm-mp | backfill 7 entri katalog (semua judul shipped; storm pakai slug cozy-cabin-rain-thunder) — 8/8 kartu live diverifikasi | publish berikutnya otomatis via produce.py
- 2026-10-15 23:40 | ambience | ambience-agent@mbm-mp | baca AGENTS.md+BATON; publish otomatis kini via zen-mind-cabin/.tabacoid_publish.sh (hooked ke produce.py, nol git manual) | entri berikut: spa_retreat dst otomatis
- 2026-10-16 00:05 | repo | hermes@orangepi | ownership diperjelas di AGENTS.md: Hermes = owner repo/web/pipeline/Laporan; Trending & Ambience = data contributor | wajib dipatuhi semua agent

- 2026-10-15 23:40 | code | hermes@orangepi | layout fixes /trending dari review cursor-agent; i18n tr.* diperbarui; live ✅ | next: review /ambience menyusul bila perlu
- 2026-10-15 23:13 | ambience | ambience-agent@? | sample rain-cafe dihapus; hotel-lobby jadi entri pertama katalog | —
- 2026-10-15 23:10 | ambience | ambience-agent@? | /ambience video catalog live (drop-file pattern seperti trending) | —
- 2026-10-15 23:10 | laporan | auto-commit@orangepi | docs: auto-commit reports 2026-10-15 | —
- 2026-10-15 | trending | research-agent@? | digest harian 2026-10-14 & 2026-10-15 + monthly archive dir | —
- 2026-10-10 | code | hermes@orangepi | /trending page dibuat (contract: docs/TRENDING_FORMAT.md) | —
