---
task_id: t_dba842b9
objective: OBJ-005
experiment: null
category: Operations
date: 2026-11-07
status: published
human_review: autonomous
---

# HE2 Skill Usage Census + Prune 25 Skill Mati

## Engineering Question
Apakah skill di `~/.hermes/skills/` benar-benar dipakai? Sejak Agustus belum pernah ada audit usage — berapa persen inventory yang mati (tak pernah dipakai/dilihat), dan apa dampaknya ke prompt surface tiap sesi?

## Method
1. Sumber data: `~/.hermes/skills/.usage.json` (113 entri historis, field `last_used_at`/`last_viewed_at`/`archived_at`) dipadankan dengan realitas filesystem (`find SKILL.md`, exclude `.archive`).
2. Census klasifikasi: aktif (touch ≤30d), stale (touch >30d), never (nol used dan nol viewed sejak 2026-08-04).
3. Ukur bobot token: bytes SKILL.md (bodi, dimuat saat invoke) dan bytes frontmatter `description` (dimuat per-turn jika prompt builder menyertakan deskripsi).
4. Referensi-silang sebelum eksekusi: grep referensi nama skill di `cron/`, `config.yaml`, `SOUL.md`, `profiles/` — memastikan tidak ada konsumen diam-diam.
5. Eksekusi arsip dengan metode yang sama seperti arsip lama: `mv` ke `.archive/` (reversible), lalu set `archived_at` di `.usage.json` (backup ada).

## Findings
- Register non-arsip: **53 entri → 28** pasca-prune (25 diarsipkan).
- **25 dari 52 skill unik (48%) tidak pernah dipakai DAN tidak pernah dilihat sejak 4 Agustus** — 3 bulan nol sentuhan, termasuk high-cost seperti `comfyui`, `touchdesigner-mcp`, `weights-and-biases`.
- Bodil SKILL.md yang mati: 305.941 bytes (~76k token) = **1,42× bodi skill aktif** (215.893 bytes ~54k token).
- Honest metric: frontmatter `description` skill mati hanya ~1.410 bytes (~0,35k token/turn jika prompt builder memuatnya) — biaya per-turn kecil; nilai prune utama adalah higiene inventory dan tool_search surface, bukan token.
- Ditemukan 1 ghost entry: `finance/ticmi-api` terdaftar tapi tak ada `SKILL.md` di path itu (duplikat dari `ticmi-api` yang aktif 10d lalu) — data model kotor, tidak berbahaya.
- Ditemukan 1 kategori kosong (`devops/`) yang ikut dibersihkan; `.hub/index-cache` dan `.hub/quarantine` juga kosong.
- 13 skill stale (31–100 hari, pernah dipakai): `github-pr-workflow` (100d), `sofa` (96d), `nas-transmission` (55d), `youtube-content` (55d), `codebase-inspection` (53d), `manga-short-video-pipeline` (53d), `grounded-citations` (52d), `weekly-review-planning` (52d), `serving-llms-vllm` (50d), `blocked-page-recovery` (31d), `github-auth` (31d), `litellm-gateway` (31d), `plan` (31d).
- Safety check lolos: profil `emailmanager` punya tree skill salinan sendiri (`email-inbox-triage` di sana tidak tersentuh arsip profil default); tidak ada referensi skill yang diarsipkan di cron/config/SOUL.md; `hermes skills list` tetap sehat pasca-eksekusi.
- Backlog lain hasil scan pagi ini: TUI idle sessions (H3) kini **nol** dan listener `:53` cuma systemd-resolved biasa (OS5) — dua item backlog itu stale dan bisa dicoret.

## Decision
**Adopt** untuk 25 never-used: diarsipkan ke `.archive/` (total arsip 61 → 86), register bersih 28. **Needs Human Review** untuk 13 stale — mereka pernah dipakai, jadi prune-nya keputusan kebijakan (mis. `manga-short-video-pipeline` & `nas-transmission` masih relevan dengan bisnis konten user walau jarang; saya biarkan).

## Risk
- Skill yang diarsipkan ternyata dibutuhkan nanti → restore satu `mv` balik dari `.archive/` ke folder kategorinya, nol kehilangan data. Backup `.usage.json`: `~/.hermes/cache/scratch/usage.json.bak-20261107`.
- Jika runtime Hermes mengindeks `.archive/` (bukti sebaliknya: arsip lama 61 skill tidak muncul di `hermes skills list`), dampaknya nol.

## Lessons Learned
- Backlog ops perlu re-scan sebelum dieksekusi: 3 dari 4 kandidat pagi ini (H3, OS4, OS5) ternyata sudah tidak relevan — kondisi sistem berubah lebih cepat dari backlog.
- `.usage.json` ternyata sumber data census satu-satunya yang dibutuhkan; tidak perlu parsing log.
- Prune inventory berkala (per kuartal) lebih murah daripada satu spring-cleaning besar: 48% mati terkumpul karena tidak pernah diaudit sejak seeding awal.

## Next Priority
- Kuartal depan (±Feb-2027): census ulang, kandidat berikutnya = 13 stale plus skill aktif yang turun jadi stale.
- Kecil: rapikan ghost entry `finance/ticmi-api` di `.usage.json`.
