---
task_id: t_3af4730c
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-11-07
status: published
human_review: autonomous
---

# Cron Effectiveness: Iteration-Limit Failure Analysis + Mitigasi

## Engineering Question
Daily Engineering Focus cron berulang kali mati di iteration limit. Seberapa sering, kenapa, dan mitigasi apa yang paling kecil tapi paling mengena?

## Method
Scan semua `agent.log` + rotasi `.gz` sejak 2026-08-09 untuk pola `reached the iteration limit`, di-cross-reference dengan session ID cron (`cron_bf05fd0ca059_*`, `cron_6e8892e0aa99_*`) per hari. Bedah transkrip output run pagi ini (`~/.hermes/cron/output/bf05fd0ca059/2026-11-07_09-15-47.md`) untuk lihat di mana turns-nya habis. Config dicek di `config.yaml` (`max_turns: 40`, global) dan `jobs.json`.

## Findings (with measurements)
- **iteration_limit_failure_rate: 16/25 hari berjalan = 64%** (Daily Focus, 19 Sep – 7 Nov)
- Sejak jadwal weekend-only v0.5 (mulai 19 Sep): **16/16 hari jalan kena limit ≥1× — 100%**. Sebaran per hari: 0–4 sesi kena (contoh: 13-Sep=4, 27-Sep=4, 1-Nov=3, 7-Nov=1).
- Estimasi sesi kerja kena: dari 7 slot/hari, 1–4 yang mati ≈ **~15–55% sesi per hari**; sesi yang benar-benar kerja (bukan [SILENT]) kemungkinan besar mayoritas kena.
- Ini bukan fenomena baru hari ini: 17 kejadian limit CICD Builder + 26 Daily Focus tercatat sejak Okt.
- **Root cause struktural (bedah run 09:00 hari ini):** satu sesi dimuati dua deliverable — retro mingguan W45 (query board + sintesis + tulis report) DAN tugas harian (debris recovery + scan sinyal + edit skill doc). Run-nya selesai semua deliverable inti tapi tetap kena cap di 09:15:47. Retro sebagai "bonus" di atas task harian adalah burn turns terbesar.
- **Bug kedua (verifikasi pipeline):** cron Report Auto-Publish (`ddf39ff8872d`) sejak 19-Aug menjalankan **salinan lama** `~/.hermes/scripts/report-auto-commit.sh` tanpa push+BATON — fix 24-Okt hanya diterapkan di salinan repo `scripts/`. Bukti: push 09:30 pagi ini cuma bawa 1 file (retro), BATON.md stranded di working tree. Fix: salinan cron disinkronkan dari repo (byte-identical, diverifikasi `diff`).
- Signal scan pagi ini juga mengonfirmasi infra sehat: uptime 46 hari, 7/7 container healthy, disk 29%, RAM available 3.9G — dua proses python3 besar (712MB webui + 489MB gateway) adalah proses legit, bukan zombie.

## Decision
**Adopt** — mitigasi berbasis aturan slot, bukan ubah `max_turns` atau jadwal cron:
1. Aturan "one deliverable per slot" ditulis di SKILL.md section Turn Budget: retro mingguan = FULL deliverable, hanya boleh di slot terakhir akhir pekan (Minggu 16:00), dan slot itu tidak mengerjakan apa pun lain.
2. Slot lain: tepat satu task, tulis report, stop. Kalau di tengah run sudah selesai deliverable besar kedua — publish dan END di situ.
3. Salinan script auto-publish yang dipakai cron disinkronkan dari repo (fix drift 19-Aug → 24-Oct fix tidak pernah aktif di cron path). Drift check dua salinan jadi kebiasaan: sesudah edit script di repo, `cp` ke `~/.hermes/scripts/`.
4. `max_turns` (40) dan jadwal cron (perlu update jobs.json + approval user) sengaja tidak diubah — aturan prompt lebih murah dan reversible.

## Risk
- Aturan berbasis prompt bisa di-skip lagi seperti checkpoint 33 (sudah 2× kejadian). Mitigasi berikutnya kalau pola berlanjut: benar-benar pisah retro ke job cron terpisah (butuh approval).
- Retro yang dipindah ke slot Minggu 16:00 tetap harus guard terhadap task besar yang kebetulan jalan di slot yang sama.

## Lessons Learned
- 64% failure rate tersembunyi selama ~7 minggu karena tiap run "deliver fallback response" — cron dianggap sukses. Warning `iteration limit` di agent.log adalah satu-satunya sinyal, dan tidak ada yang membacanya secara agregat sampai hari ini.
- Audit log agregat (grep rotasi penuh) ternyata murah: satu pass zgrep atas 18 pekan log = beberapa detik. Layak jadi kebiasaan bulanan.

## Next Priority
- Observasi 2 weekend ke depan: apakah failure rate turun dari 16/16 hari → mendekati 0. Kalau masih ≥2 kejadian/weekend, eskalasi ke proposal cron retro terpisah (needs approval).
- Open items menunggu approval user: push branch `qa/dashboard-a11y`, cert apex cleanup.
