# YouTube Production Report — 2026-10-15

Daily & monthly status of the [Ambience Sound Collection](https://www.youtube.com/@ambiencesoundcollection-c2t) ambience channel, published from the automated production pipeline.

The channel ships ambience videos for sleep/study/focus — every title in three formats: a Shorts teaser (~35s), a 20-minute version, and an 8-hour sleep cut. Fully automated: ElevenLabs sound stems → ffmpeg-composed bed + seeded accents → fal.ai Flux still → Kling 10s cyclic motion → ffmpeg loop+mux → YouTube upload → NAS archive.

## Channel snapshot (2026-10-15)

- **Subscribers:** 13 (+3 this week)
- **Total views:** 3,297
- **Videos live:** 30 (10 titles × 3 formats)
- **Titles shipped:** storm, cafe_rain, forest_night, snow_cabin, jungle_night, beach_campfire, city_rain_lofi, hotel_lobby_luxury, spa_retreat*, massage_room* (*in queue/pending 8h)

## October 2026 monthly view

| Title | Published | Best performer | Views |
|---|---|---|---|
| Forest Night After Rain | Oct 10 | Short | **1,417** |
| Night Beach Campfire | Oct 13 | Short | **730** |
| Snowed-in Cabin | Oct 12 | Short | 362 |
| Tropical Storm (Cabin Rain) | Oct 9–10 | Short | 355 |
| Borneo Jungle Night | Oct 11 | Short | 101 |
| Rainy Café Window | Oct 10–14 | Short | 66 |
| Rainy City Apartment (lofi) | Oct 14 | Short | 48 |
| Luxury Hotel Lobby | Oct 15 | Short | 5 (relaunched with fixed mix) |

Monthly learnings:

1. **Shorts are the discovery engine** — every title's Short outperforms its long forms 5–50×. Shorts now carry direct description links to their 8h and 20min versions (cross-link stage added to the pipeline Oct 14).
2. **Quality gate caught a bad mix** — the first Hotel Lobby ship was nearly silent (piano stem inaudible under room tone). Triage: measure per-stem RMS, regenerate the silent stems, rebalance piano/murmur/chime, replace all three uploads. The "character must be audible, not 'very distant faint'" lesson is now the template for the 4 remaining B2B scenes (spa, massage, waiting room, library).
3. **Wrap-jump fix** — visual loop seams (rough transition at ~9–10s) were audited across all scenes via wrap-PSNR; four scenes were re-rendered with a reversed-head xfade wrap (25–26 dB → 39–43 dB) and re-uploaded.
4. **Infrastructure hardening** — three Google API hostnames are now pinned in `/etc/hosts` after ISP DNS routing killed an 8-hour upload mid-flight; the resume-capable producer recovered without re-uploading the 7.1 GB file.

## Pipeline health

- Daily producer cron (10:00 WIB): ships 1 new title × 3 formats, public, archived to NAS
- Daily status cron (08:00 WIB): channel board + Shorts format check + view deltas to Telegram
- NAS archive: every 8h master (7+ GB) hash-verified then local copies purged (factory disk 38 → 25 GB)
- Next in queue: spa_retreat, massage_room, waiting_room_calm, library_reading, library_fireplace (+9 more)

## Notes

Report generated automatically from pipeline state + YouTube Data API. Same report lands daily via the channel's 08:00 Telegram board; this page is the monthly-archiveable public copy.
