---
task_id: daily-focus
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-11-22
status: published
human_review: autonomous
---

# Retrospective Minggu 47 (16–22 Nov 2026)

## Retrospective Question
Apakah keputusan minggu ini benar, metriknya bertahan, dan trend apa yang perlu tindak lanjut?

## Method
Query kanban `status IN (done, blocked) AND completed_at > now-7d`, cross-check commit log + reports yang terbit, hitung iteration-limit death dari errors.log.

## Findings (with measurements)

**9 task selesai minggu ini** — distribusi objective: OBJ-002 (infra) 7, OBJ-005 (workflow) 2, OBJ-001/003/004: 0.

| Task | Keputusan | Naik mesin? |
|------|-----------|-------------|
| t_d6fb0e59 docker live-restore | upgrade 29.9.2→29.10.0, live-restore true | Ya — 7/7 container pulih healthy, smoke 200/200 |
| t_b259dbc2 verdict stack Telegram wk-2 | keep | Ya — fatal 61→10 (−84%), 31 restart efektif ~7s |
| t_236d7efd sitemap gap | fix 1 baris gen-sitemap.py | Ya — 231→232 URL, diff=0 |
| t_eebfd098 trending-index regen | root-cause fix masuk auto-commit | Ya — item 21 Nov live via curl |
| t_a867d086 port audit OS5 | dokumentasi + 2 rekomendasi bind | — (needs approval) |
| t_6f317665 TLS expiry audit | no action (zero danger zone) | — (audit) |
| t_0ad88823 TD-16 revisit #5 | drift-check 0 temuan | — (audit: npm audit 0, 407 vitest green) |
| t_3870465e VPS SSH key fix | pasang key Pi→VPS | Ya — sftp OK |
| t_9f65cd46 cron effectiveness 14h | 2 defect pipeline difix | Ya — auto-commit retry + counter |

**Decision quality:** 9/9 keputusan bertahan. Dua yang paling berdampak (live-restore, Telegram breaker verdict) sudah terbukti minggu ini sendiri — tidak ada regresi tercatat. Task #5 revisit TD-16 menemukan backlog item yang sudah closed sejak Okt — premise stale, ditutup dengan bukti.

**Trend positif — iteration-limit deaths turun:** 2 death minggu ini (dari errors.log) vs baseline 16/25 running days sebelum turn-budget rules. Slot retro-only hari Minggu berjalan bersih: run 09:00 dan 13:00 menghasilkan task+report, run 16:00 (ini) khusus retro tanpa task lain.

**Trend positif — friksi VPS ditutup:** 2 task berurutan (key fix + root-cause raw-IP) menyelesaikan masalah akses yang berulang sejak Okt. Alias `vps-internal`/`vps-web` kini terdokumentasi.

**Trend perlu perhatian — lapangan kosong:** board saat ini TANPA task ready/todo (habis dipanen minggu ini). Juga OBJ-003 (experiments) 0 task dua minggu beruntun; minggu lalu W46 juga didominasi ops. Kategori floor rule cuma melindungi cicd-console & website — experiments tidak terlindungi dan mulai starved.

**Pending human decisions (2):**
1. APT 38 security updates di belakang vendor holds (t_9f40f776, blocked-needs_input)
2. Bind vaultwarden:8222 + mysql:3306 ke interface LAN/Tailscale saja (rekomendasi port audit)

## Decision
Adopt — arah minggu ini benar: infra hardening sebelum konten. Follow-up dibuat: 1 task bind hardening (menunggu approval user, tidak dieksekusi otomatis). OBJ-003 starvation dicatat untuk planner minggu depan — bukan filler task sekarang.

## Risk
- Board kosong → slot weekend berikutnya berisiko idle atau planner membuat task murahan. Mitigasi sudah ada: category floor + sinyal scan.
- 2 keputusan menunggu approval user bisa mengendap selamanya kalau tidak pernah ditanya. Keduanya tercatat di blocked board — visible, tidak hilang.

## Lessons Learned
- Root-cause kecil (1 baris sitemap, retry di auto-commit) memberi dampak lebih besar daripada audit besar yang hasilnya "no action" — tapi audit no-action juga bernilai (menghapus keraguan).
- Turn-budget rules (retro-only last slot) terukur mempan: deaths 16/25 → 2/minggu.

## Next Priority
1. Approval user: APT patch vs vendor holds + bind hardening (2 task blocked)
2. Planner slot berikutnya: isi board dari sinyal segar; penuhi floor cicd-console/website; pertimbangkan 1 experiment task untuk OBJ-003
3. HE1 memory audit (86%/92% — masih di bawah threshold, monitor saja)
