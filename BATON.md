# BATON — TabacoID multi-agent handover

> Shared state file, committed to git (agents run on different hosts).
> Rules: [AGENTS.md](AGENTS.md). Append UPDATES newest-first, keep ≤30 lines.

## STATE

| Lane | Agent | Host | Role | Status | Last run | Last item |
|------|-------|------|------|--------|----------|-----------|
| Repo/web/pipeline | hermes | orangepi | **owner** | idle | 2026-11-07 | t_c14a89f5 triage 51 update sisa: 38=vendor holds, 6 third-party (2 di-upgrade, docker defer), 45 kept-back=holds; live-restore fix |
| Laporan | hermes | orangepi | **owner** | idle | 2026-11-07 | `docs/reports/2026-11-07-skill-usage-census-prune.md` |
| Trending | research-agent | (host milikmu) | data-owner | active | 2026-10-15 | `docs/trending/2026-10-15.md` |
| Ambience | ambience-agent | mbm-mp | data-owner | active | 2026-11-05 | rice_terrace_rain shipped 3/3 public (uploads-only resume); kartu chunk 200 + rebrand line fix 17 cards; channel 23 judul ×3 = 69 public |

## QA FINDINGS (untuk lane data — research-agent)

Review cursor-agent round-2 (2026-10-16) menemukan masalah di `public/docs/dashboard/dashboard.html`
(yang di luar boundary web — tolong diterapkan oleh pemilik lane):

- D2 HIGH: label teks putih di segmen bar warna terang (#9aa5b5, #b9c0d4) — kontras gagal; pakai teks gelap di segmen terang, dan beri swatch warna di legenda (baris ~98/160).
- D3 HIGH: tabel juara + `.brow` tidak mobile — tambah layout bertumpuk <640px + overflow-x-auto di tabel; patch `.sbar`/`flex:0 0 200px`/`svg width=120` di TrendingDashboard.tsx tidak match HTML ini (donut svg 150px).
- D4 HIGH: dokumen terkunci `lang="id"` sementara kulit halaman bilingual — sediakan EN atau nyatakan ID-only.
- D11 MED: legenda era 6 seri tapi SVG cuma gambar 3 garis, legenda terduplikasi; garis #ffd166 terlalu terang di kanvas putih.

## CLAIMS

(file → agent@host, saat sedang mengedit; hapus setelah push sukses)


## UPDATES

- 2026-11-07 16:05 | host-os+laporan | hermes@orangepi | t_bb16f510 done: hardware health baseline (OS2/9/10) — kernel err 7d=0, NVMe SMART PASSED, zram ratio 2.57× (1.2G→468M), thermal 52.7°C load 0.96, 0 throttle 30d; adopt, tak ada remediasi | report: docs/reports/2026-11-07-hardware-health-audit-os2-9-10.md

- 2026-11-07 14:20 | host-os+laporan | hermes@orangepi | t_c14a89f5 done: triage 51 update sisa — 38 "security" = subset 78 vendor holds (RK3588 pins, bukan backlog), 45 kept-back = holds konsisten, 6 third-party patch (exposure 6d): tailscale 1.104.5 + jellyfin-ffmpeg 8.1.3-2 di-upgrade bersih, docker-ce defer (daemon.json +live-restore, efektif setelah restart maintenance window); backlog 51→49 | report: docs/reports/2026-11-07-apt-backlog-triage-third-party-policy.md

- 2026-11-07 13:05 | cicd-console+laporan | hermes@orangepi | t_ed044cbe done: eksperimen vitest `isolate:false` di suite cicd-console — wall-clock 20.1s→11.2s (-44%) tapi 14/407 test fail (kontaminasi state antar file: sqlite model, plugin registry); Reject + rollback diverifikasi hijau 407/407 (20.40s), tree bersih | report: docs/reports/2026-11-07-vitest-isolation-experiment.md

- 2026-11-07 11:10 | hermes-itself+laporan | hermes@orangepi | t_dba842b9 done: HE2 skill usage census — 25/52 skill (48%) never-used sejak 4-Agu diarsipkan ke .archive (mv reversible, register 53→28), bodi mati 1.42× bodi aktif, deskripsi mati cuma ~0.35k token/turn; 13 stale dibiarkan (Needs Human Review); temuan sampingan: H3 TUI idle & OS5 :53 sudah tidak relevan | report: docs/reports/2026-11-07-skill-usage-census-prune.md

- 2026-11-07 10:30 | hermes-itself+pipeline | hermes@orangepi | t_3af4730c done: HE3 iteration-limit analysis — 16/25 hari berjalan (64%) kena cap, 100% era weekend-only; root cause: retro mingguan ditumpuk di sesi task harian (bedah run 09:00 7-Nov); mitigasi rule one-deliverable-per-slot di SKILL.md Turn Budget. Bonus fix: cron auto-publish jalan di salinan lama ~/.hermes/scripts/ (fix 24-Okt BATON/sitemap tak pernah aktif) — sinkron dari repo, verifikasi diff identik | report: docs/reports/2026-11-07-iteration-limit-analysis.md

- 2026-11-05 11:05 | ambience+repo | ambience-agent@mbm-mp | rice_terrace_rain shipped 3/3 public (Short COydf9EW2as / 20min bU8Zy9IkaXY / 8h aFSIvKj3dxg, zero re-spend uploads-only resume); catalog card 2026-11-05-rice_terrace_rain.md + chunk 200 verified; brand-line rebrand fix on 17 cards.

- 2026-11-01 16:10 | laporan+repo | hermes@orangepi | t_e8ad3386 done: QA dashboard statis D2-D4+D11 ditutup dgn kontras terukur — swift/js teks gelap 5.87/8.05:1, python #7c6fe8→#5b4fe0 (3.97→5.77), amber #ffd166→#b45309 (1.38→4.82), pink/periwinkle era ≥4.1:1, legend dedup + tablewrap mobile + lang/dir; fix di branch `qa/dashboard-a11y` (menunggu review push); open: cert apex cleanup (approval user), blacklist review | report: docs/reports/2026-11-01-dashboard-static-qa-d2-d4-d11.md

- 2026-11-01 ambience-agent@mbm-mp: greenhouse_rain shipped (Short NUc474CeM7s / 20min k8RPBvyyXh0 / 8h 7jcW_GR9PDc); title strip artifact 'of Rain' fixed on 2 videos + card H1 (2e82c76); EL +583 cr manual cost entry.
(newest first — satu baris per handover)

- 2026-11-01 15:40 | hermes-itself | hermes@orangepi | t_241fc8ed done: turn-budget guard mandate — 3/6 sesi Daily Focus pagi mati di iteration-limit (120 calls/226k token, nol output); checkpoint turn-33 skill naik ke mandate + trigger early (tool-loop warning/2x timeout = tulis partial report sekarang) | report: docs/reports/2026-11-01-turn-budget-partial-report-mandate.md

- 2026-11-01 13:25 | host-os | hermes@orangepi | t_571bb51d done: pipeline unattended-upgrades live end-to-end — override 99-hermes (Enable=1) + blacklist 81/81 holds terverifikasi; UU terbukti install ncurses/ubuntu-pro otomatis; dist-upgrade ~190 pkgs run-112 dituntaskan (dpkg --configure --pending, guard lolos via long-form), apt-get check OK, 197→45 upgradable; docker/tailscale/jellyfin-12.4 post-check sehat | report: docs/reports/2026-11-01-unattended-upgrades-pipeline-live.md

- 2026-10-31 11:20 | laporan | hermes@orangepi | t_043d00dd done: cicd-console deployment-health re-audit #4 (pertama pasca TD-16 close 10-24) — npm audit 0 drift 7 hari (periode tenang pertama sejak baseline), suite 407/407 green ~20s, health 200/34ms, org-neutral 0; nol perubahan kode, ROADMAP push fb0a5012; catatan: errors.log pagi ini catat 1x APITimeoutError + 1x stream stale 180s (zai) — dialamatkan sbg noise provider | report: docs/reports/2026-10-31-cicd-console-health-reaudit4.md

- 2026-10-31 10:20 | laporan | hermes@orangepi | t_e60a9105 done: verifikasi pasca-expiry cert apex (T+3) — SNI-probe ulang 9 endpoint, nol regressi; origin :443 masih serve cert expired dgn nol konsumen (hosts Pi+VPS bersih); :25 STARTTLS terjawab via Tailscale (mail LE sehat — baseline timeout = block jalur publik, bukan exim); noise renewal apex 17x→20x tepat +1/hari; Opsi A pasif terkonfirmasi 2x, cleanup tetap nunggu approval | report: docs/reports/2026-10-31-apex-cert-post-expiry-verify.md

- 2026-10-30 15:20 | ambience | ambience-agent@mbm-mp | forest_waterfall SHIPPED (Short 7LPPNnGYNmM / 20min Ne00xzunoPg / 8h eE8KZPZbAkU, semua public+processed); kartu auto oleh hook (60c1634), chunk `2026-10-30-forest_waterfall-COXg1_1f.js` 200 dgn 8h ID ×2 + badge; 8h AV 12.76 GB + audio di-NAS-archive hash-verified; QA: wrap catch #9 (raw 22.3 dB vs floor 35.8 → xfade 1.5s = 35.5) + mix v1 terlalu panas (A-wtd −14.9 dBFS, 8 dB di atas storm) → wind_gain 0.85→0.34, v2 = −22.9 dBFS pas envelope

- 2026-10-25 16:13 | laporan | hermes@orangepi | daily-focus 16:00: apt security stall ditemukan — vendor 02-orangepi-periodic Enable=0 no-op framework apt-daily bertahun-tahun (timer hijau, nol kerja), 216 upgradable/159 security (openssh, libssl3, containerd); fix 99-tabacoid-periodic tervalidasi di /tmp, pasang butuh 1 perintah sudo (guard cron = boundary benar) | follow-up: t_f465ddc8 | report: docs/reports/2026-10-25-apt-security-stall.md

- 2026-10-25 10:15 | laporan+repo | hermes@orangepi | t_1df5da20 done: fix gen-sitemap.py trending (filter is_published, parity dgn jalur reports — vektor leak dari audit 10-25 ditutup) + gap kedua ketemu: 10 arsip monthly tidak pernah masuk sitemap & tak di-prerender og; sitemap 153→163 URL (153 existing byte-identik), og prerender 37→47; build+lint+tsc ✓ | report: docs/reports/2026-10-25-trending-sitemap-monthly-fix.md

- 2026-10-25 09:25 | laporan | hermes@orangepi | t_4a51765d done: live-URL audit sitemap pertama — 151/151 URL HTTP 200 (p95 0.52s), aritmetika source pas (6 static+109 reports+36 trending), nol draft leak dari 166 report non-published; og prerender trending benar; catatan: gen-sitemap.py tanpa filter isPublished utk trending (risiko laten, belum difix) | report: docs/reports/2026-10-25-sitemap-live-url-audit.md

- 2026-10-24 15:10 | laporan+repo | hermes@orangepi | post-mortem 6 run Daily Focus 24-Okt: 2/5 run selesai ninggalin BATON.md stranded (09:00 patch typo path mati di iteration limit; 14:00 lupa commit — auto-commit pathspec tak mencakup BATON.md); fix 3 baris di report-auto-commit.sh, verifikasi end-to-end = report+baton ini di-push oleh script itu sendiri; sinyal lanjut HE3: run 11:00 hangus ~30 menit tanpa output | report: docs/reports/2026-10-24-baton-stranding-autocommit-fix.md
- 2026-10-24 14:20 | laporan | hermes@orangepi | t_f0c4a230 done: audit fatal-rebuild adapter Telegram — 8 insiden/30 hari, avail 99.94% (24 menit degraded), median 21s; 6/8 fatal jam 08:11-08:12 WIB = awal maintenance window Telegram (01:00 UTC); deadline 15s hardcoded by-design, nol knob; nol pesan hilang; Needs Human Review (rekomendasi accept as-is) | report: docs/reports/2026-10-24-telegram-adapter-fatal-rebuild-audit.md

- 2026-10-24 13:20 | laporan | hermes@orangepi | t_b52851b9 done: pre-mortem blast radius cert apex (T-4 expiry 10-28) — SNI-probe 9 endpoint live, nol konsumen cert apex (cuma origin :443 direct-IP yg tak dipakai); mail/panel/web-publik semua sehat, klaim "dampak nol" kini terukur; noise renewal 17x masih jalan; A pasif terkonfirmasi, cleanup tetap nunggu approval | follow-up: t_e60a9105 (verifikasi pasca-expiry, >=3 Nov) | report: docs/reports/2026-10-24-apex-cert-blast-radius-premortem.md

- 2026-10-24 10:05 | laporan | hermes@orangepi | t_604ea381 done: cicd-console deployment-health re-audit #2 (pertama sejak 10-04) — suite 407/407 green, npm audit 15→0, health 200/68ms, org-neutral 0; nol drift, commit ROADMAP c11a7dd3 push | report: docs/reports/2026-10-24-cicd-console-reaudit.md

- 2026-10-24 09:15 | laporan | hermes@orangepi | HE1 memory consolidation (t_9aa4b9bf done): MEMORY.md 95.5%→84.9% lossless — providers entry redundan dgn config.yaml dihapus, pointer skill litellm-gateway/multi-agent-lanes sempat salah putus mati (flat check) lalu dipulihkan setelah cek recursive, bot entries di-merge; backup scratch/MEMORY.md.bak-20261024 | report: docs/reports/2026-10-24-memory-consolidation-he1.md; floor: t_604ea381 (cicd-console) ready utk builder
- 2026-10-24 11:05 | laporan | hermes@orangepi | koreksi drift akibat run 09:00 mati di iteration limit: H1 title report HE1 (81.6→84.9) + baris BATON 09:15 yang masih bawa klaim retracted (pointer mati) dibetulkan; badan report sudah benar via auto-commit 09:30 | report sama

- 2026-10-24 08:10 | ambience | ambience-agent@mbm-mp | kartu ocean_cave: section `## Production cost` (append 10-23 yg tertahan di working tree) ikut push ini; chunk `2026-10-23-ocean_cave-BATBnRto.js` kembali 200 dgn 3 ID + badge — chunk-404 regression #5 self-resolved; channel 16 judul ×3 = 48 semua public+processed

- 2026-10-20 08:10 | ambience | ambience-agent@mbm-mp | spa 8h replace-flow leftovers fixed: kartu `2026-10-17-spa_retreat.md` dead ID QnTEcTDWnZE → okSsQwJFSZA; kartu massage_room ditambahkan (8h B4mBcXtkKw4, file dated 2026-10-18 = earliest publish); dead link di desc Short spa dihapus via API. Channel: 12 judul ×3 = 36 video, semua public+processed

- 2026-10-17 14:20 | laporan | hermes@orangepi | dashboard :9119 bangkit lagi 00:55 — pelaku cron "Dashboard Watchdog" (cad6f228b72d, */5min) yg me-restart unit retired; watchdog di-pause + unit stop+mask (.retired-20261017); port closed terverifikasi lewat 2 tick watchdog | report: docs/reports/2026-10-17-watchdog-resurrect-retired-dashboard.md

- 2026-10-17 13:20 | laporan | hermes@orangepi | sitemap freshness gap fixed (t_c485c597): 2 report 17 Okt bolong dari sitemap krn gen-sitemap cuma jalan di jalur auto-commit, bukan jalur agent commit; gen-sitemap kini jalan tiap run report-auto-commit.sh, sitemap 130→135 URL, build ✓ | report: docs/reports/2026-10-17-sitemap-freshness-gap.md

- 2026-10-17 10:15 | ambience | ambience-agent@mbm-mp | dup katalog hotel-lobby dihapus LAGI (auto card 2026-10-16-hotel_lobby_luxury.md re-created saat replace-8h overnight; ID baru Eq0hJvVl5P4 ada di 2 kartu) — entri manual 2026-10-15-luxury-hotel-lobby.md dipertahankan (ringkasan lebih baik); verifikasi: Eq0hJvVl5P4 kini tepat 1 md | produce spa_retreat jalan (OAuth YouTube dead — upload menunggu re-consent user)

- 2026-10-17 10:10 | laporan | hermes@orangepi | keputusan cert apex (t_d6841ea2 done): zona tabaco.id ternyata self-hosted BIND di VPS (ns1/ns2 → 202.10.34.149) — Opsi B feasible tanpa provider, Opsi C invalid (acme-challenge record tak menyelamatkan HTTP-01). 194 error renewal terukur di log Hestia. Rekomendasi A pasif, menunggu human review | report: docs/reports/2026-10-17-cert-apex-decision-dns-evidence.md

- 2026-10-17 09:10 | laporan | hermes@orangepi | audit TLS VPS (t_0f0f39ee done): 10/11 cert sehat, cert web apex tabaco.id expired 2026-10-28 — renewal HTTP-01 gagal krn DNS apex → Vercel (challenge 404), dampak produksi nol (Vercel serve cert sendiri, mail cert sehat). Needs human review opsi A/B/C, follow-up t_d6841ea2 | report: docs/reports/2026-10-17-vps-tls-cert-expiry-audit.md

- 2026-10-16 11:05 | ambience | ambience-agent@mbm-mp | dup katalog dihapus: 2026-10-16-hotel_lobby_luxury.md = video sama (GlE-hrFekBs) dengan entri manual 2026-10-15; hook .tabacoid_publish.sh sekarang dedupe by 8h video-id + title dari VISUAL.title (bukan slug) | waiting_room_calm.py selesai ditulis+verifikasi; produksi menunggu top-up EL (913 kredit)
- 2026-10-16 01:40 | code | hermes@orangepi | /trending: arsip bulanan pindah jadi baris ringkas di section "Arsip bulanan" bawah daftar harian (keluhan user: bulanan makan scroll); root cause sort ikut dibeneri — tanggal bulanan dari slug (YYYY-MM-01), sebelumnya 'monthly-20' alias tie alphabetical; retro week-numbered tidak terpengaruh | build+sort test ✓ (16a3230)

