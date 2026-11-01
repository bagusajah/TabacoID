---
task_id: t_241fc8ed
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-11-01
status: published
human_review: autonomous
---

# Turn-Budget Guard: Mandate Partial-Report di Skill Daily-Improvement

## Engineering Question
Kenapa 3 dari 6 sesi Daily Engineering Focus hari ini mati di iteration limit (40
turns) tanpa output durable sama sekali, padahal checkpoint turn-25/turn-33 sudah
ada di skill sejak 2026-10-04? Apa fix yang benar-benar mengubah perilaku?

## Method
- Korelasasi `errors.log` dengan `session_model_usage` (state.db) untuk 6 sesi
  `cron_bf05fd0ca059` tanggal 2026-11-01: hitung calls, token, dan penyebab mati.
- Klasifikasi sesi: "dead" = berhenti di iteration limit tanpa laporan/kanban close,
  "ok" = selesai dengan durable output (3 sesi sore: t_571bb51d + t_0de986c0 done,
  report pushed, plus sesi 15:00 yang menulis laporan ini).
- Telusuri pola command yang menghabiskan turn: timeout berantai apt/UU, guard-block.

## Findings (with measurements)
- `dead_sessions: 3/6` (09:00, 10:00, 11:00 WIB) — semua mati di iteration limit
  dengan **nol** laporan dan nol kanban close.
- `api_calls: dead 120 vs ok 64` — rata-rata 40 calls/sesi mati vs 21/sesi sehat.
- `tokens_burned_dead: 226.553` (in 152.812 + out 73.741) vs `ok: 185.256` —
  sesi mati burn ~40% lebih banyak token sambil menghasilkan nol.
- Root cause chain (dari errors.log): command apt/UU heng 300–420s (apt-daily-upgrade
  sedang spin 99.9% CPU pagi itu) → `same_tool_failure_warning` muncul tapi sesi
  lanjut retry/rephrase → turn habis di probing, checkpoint tulis-laporan tidak
  pernah dieksekusi.
- Pola ini RECURRING: 2026-10-04 (2/7 runs, tercatat di skill) → 2026-11-01 (3/6).
  Fix pertama (daftar budget-sinks + checkpoint prose) tidak cukup — teks "do X"
  kalah oleh loop tool-failure di praktik.
- Bukti sisi sehatnya: 3 sesi sore menuntaskan pipeline UU end-to-end (197→45
  upgradable, security 0) — masalahnya bukan kapasitas, tapi urutan eksekusi saat
  tool-loop.

## Decision
**Adopt.** Checkpoint turn-33 di `~/.hermes/skills/web-development/
tabacoid-daily-improvement/SKILL.md` dinaikkan dari prose ke mandate berurutan:
(1) tulis partial report + close/block task DULU sebelum attempt apa pun lagi;
(2) trigger dipercepat — `same_tool_failure_warning` atau 2x timeout beruntun
(>60s) = tulis laporan partial SEKARANG, jangan tunggu turn 33. Di-commit ke skill
profil default (satu baris: laporan ditulis turn-20 lebih berguna daripada fix
yang dicoba turn-39).

## Risk
- Mandate tetap bergantung kepatuhan model — bukan enforcement mekanis. Kalau
  rekuren lagi, opsi berikutnya: turunkan `max_turns` cron jadi 30, atau tambahkan
  watchdog eksternal yang men-flush partial output.
- Skill ini milik profil default saja; profil lain (pitupi) punya salinan sendiri
  dan tidak disentuh.

## Lessons Learned
- "Checkpoint" berbentuk deskripsi kalah melawan tool-loop; instruksi yang harus
  menang saat sesi panas perlu bentuk imperatif + trigger berbasis sinyal, bukan
  angka turn.
- Iteration-limit tanpa durable output = defect paling mahal di siklus ini:
  120 API calls menghasilkan nol. Kalibrasi: sesi sehat butuh ~21 calls.

## Next Priority
- Uji mandate pada run berikutnya yang kena tool-loop (bukan run tenang); ukur
  ulang `dead_sessions` pekan ini.
- Task ready: t_e8ad3386 (QA findings dashboard statis D2–D4+D11, floor website).
