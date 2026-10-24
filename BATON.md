# BATON — TabacoID multi-agent handover

> Shared state file, committed to git (agents run on different hosts).
> Rules: [AGENTS.md](AGENTS.md). Append UPDATES newest-first, keep ≤30 lines.

## STATE

| Lane | Agent | Host | Role | Status | Last run | Last item |
|------|-------|------|------|--------|----------|-----------|
| Repo/web/pipeline | hermes | orangepi | **owner** | idle | 2026-10-24 | memory consolidation HE1 (95.5%→81.6%); t_604ea381 cicd floor task ready untuk builder |
| Laporan | hermes | orangepi | **owner** | idle | 2026-10-24 | `docs/reports/2026-10-24-memory-consolidation-he1.md` |
| Trending | research-agent | (host milikmu) | data-owner | active | 2026-10-15 | `docs/trending/2026-10-15.md` |
| Ambience | ambience-agent | mbm-mp | data-owner | active | 2026-10-24 | ocean_cave cost-append pushed; chunk BATBnRto 200 again (regression #5 closed); channel 16 titles ×3 = 48 public |

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

- 2026-10-24 09:15 | laporan | hermes@orangepi | HE1 memory consolidation (t_9aa4b9bf done): MEMORY.md 95.5%→81.6% lossless — providers entry redundan dgn config.yaml dihapus, 2 pointer skill mati dibuang (litellm-gateway, multi-agent-lanes tidak ada di profil manapun), bot entries di-merge; backup scratch/MEMORY.md.bak-20261024 | report: docs/reports/2026-10-24-memory-consolidation-he1.md; floor: t_604ea381 (cicd-console) ready utk builder

- 2026-10-24 08:10 | ambience | ambience-agent@mbm-mp | kartu ocean_cave: section `## Production cost` (append 10-23 yg tertahan di working tree) ikut push ini; chunk `2026-10-23-ocean_cave-BATBnRto.js` kembali 200 dgn 3 ID + badge — chunk-404 regression #5 self-resolved; channel 16 judul ×3 = 48 semua public+processed

- 2026-10-20 08:10 | ambience | ambience-agent@mbm-mp | spa 8h replace-flow leftovers fixed: kartu `2026-10-17-spa_retreat.md` dead ID QnTEcTDWnZE → okSsQwJFSZA; kartu massage_room ditambahkan (8h B4mBcXtkKw4, file dated 2026-10-18 = earliest publish); dead link di desc Short spa dihapus via API. Channel: 12 judul ×3 = 36 video, semua public+processed

- 2026-10-17 14:20 | laporan | hermes@orangepi | dashboard :9119 bangkit lagi 00:55 — pelaku cron "Dashboard Watchdog" (cad6f228b72d, */5min) yg me-restart unit retired; watchdog di-pause + unit stop+mask (.retired-20261017); port closed terverifikasi lewat 2 tick watchdog | report: docs/reports/2026-10-17-watchdog-resurrect-retired-dashboard.md

- 2026-10-17 13:20 | laporan | hermes@orangepi | sitemap freshness gap fixed (t_c485c597): 2 report 17 Okt bolong dari sitemap krn gen-sitemap cuma jalan di jalur auto-commit, bukan jalur agent commit; gen-sitemap kini jalan tiap run report-auto-commit.sh, sitemap 130→135 URL, build ✓ | report: docs/reports/2026-10-17-sitemap-freshness-gap.md

- 2026-10-17 10:15 | ambience | ambience-agent@mbm-mp | dup katalog hotel-lobby dihapus LAGI (auto card 2026-10-16-hotel_lobby_luxury.md re-created saat replace-8h overnight; ID baru Eq0hJvVl5P4 ada di 2 kartu) — entri manual 2026-10-15-luxury-hotel-lobby.md dipertahankan (ringkasan lebih baik); verifikasi: Eq0hJvVl5P4 kini tepat 1 md | produce spa_retreat jalan (OAuth YouTube dead — upload menunggu re-consent user)

- 2026-10-17 10:10 | laporan | hermes@orangepi | keputusan cert apex (t_d6841ea2 done): zona tabaco.id ternyata self-hosted BIND di VPS (ns1/ns2 → 202.10.34.149) — Opsi B feasible tanpa provider, Opsi C invalid (acme-challenge record tak menyelamatkan HTTP-01). 194 error renewal terukur di log Hestia. Rekomendasi A pasif, menunggu human review | report: docs/reports/2026-10-17-cert-apex-decision-dns-evidence.md

- 2026-10-17 09:10 | laporan | hermes@orangepi | audit TLS VPS (t_0f0f39ee done): 10/11 cert sehat, cert web apex tabaco.id expired 2026-10-28 — renewal HTTP-01 gagal krn DNS apex → Vercel (challenge 404), dampak produksi nol (Vercel serve cert sendiri, mail cert sehat). Needs human review opsi A/B/C, follow-up t_d6841ea2 | report: docs/reports/2026-10-17-vps-tls-cert-expiry-audit.md

- 2026-10-16 11:05 | ambience | ambience-agent@mbm-mp | dup katalog dihapus: 2026-10-16-hotel_lobby_luxury.md = video sama (GlE-hrFekBs) dengan entri manual 2026-10-15; hook .tabacoid_publish.sh sekarang dedupe by 8h video-id + title dari VISUAL.title (bukan slug) | waiting_room_calm.py selesai ditulis+verifikasi; produksi menunggu top-up EL (913 kredit)
- 2026-10-16 01:40 | code | hermes@orangepi | /trending: arsip bulanan pindah jadi baris ringkas di section "Arsip bulanan" bawah daftar harian (keluhan user: bulanan makan scroll); root cause sort ikut dibeneri — tanggal bulanan dari slug (YYYY-MM-01), sebelumnya 'monthly-20' alias tie alphabetical; retro week-numbered tidak terpengaruh | build+sort test ✓ (16a3230)
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
