---
task_id: t_135d872d
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-03
status: published
human_review: autonomous
---

# Escape-Launcher Gagal di Python 3.10 — Possessive Quantifier, Sudah Dipatch + Re-Arm

## Engineering Question
Report pagi ini (`2026-10-03-recycle-escape-deleted-wal.md`) menyiapkan recycle otomatis
via escape-launcher. Faktanya: jam 09:17 launcher jalan tapi recycle `exit=1`, dan FATAL
`deleted state.db-wal` masih muncul di tick 10:00 (total 4 kejadian hari ini). Kenapa
pola yang sudah di-self-check 4/4 itu tetap gagal?

## Method
1. Baca `~/.hermes/logs/recycle-escape.log`: crash traceback `re.error: multiple repeat
   at position 36` dari `agent/redact.py`, diikuti `recycle exit=1`. Interpreter di
   traceback: `/usr/lib/python3.10/re.py`.
2. Repro import: `PYTHONPATH=~/.hermes/hermes-agent /usr/bin/python3 -c "import agent.redact"`
   → gagal di 3.10.12; sama dengan venv `~/.hermes/hermes-agent/venv/bin/python` (3.11.15)
   → OK. Penyebab: redact.py pakai possessive quantifier `[A-Za-z0-9_\-]++` (fitur Python
   3.11+, commit perf anti-backtracking), system python3 = 3.10.
3. Kenapa 3.10? Launcher dieksekusi `systemd-run --user` → environment systemd user unit,
   PATH-nya `/usr/bin` saja tanpa venv. Baris `python3 script.py` resolvenya ke system.
   Self-check kemarin cuma validasi `ast.parse` (syntax-level, lolos di 3.10) — tidak
   eksekusi import chain nyata. Celah verifikasi yang sama persis dengan pitfall
   "green unit mocks vs E2E" di rubrik hermes-agent.
4. Fix satu baris di `recycle-escape-launcher.sh`: panggil venv python eksplisit
   `"$HOME/.hermes/hermes-agent/venv/bin/python"`. Verifikasi: `bash -n` OK +
   import chain penuh (`gateway.status.write_planned_stop_marker` + `agent.redact`) OK
   di venv.
5. Re-arm: `systemd-run --user --unit=wal-recycle-escape recycle-escape-launcher.sh 1950614
   10800` (watch worker cron sesi ini, jangan bunuh leluhur sendiri). Self-check
   `check-recycle-escape.sh` 4/4 OK. Restart=always/5s kedua gateway service dikonfirmasi
   sebelum SIGTERM dijadwalkan.

## Findings
- `recycle exit code`: 1 (crash import, 09:17) → launcher dipatch, import chain venv
  terverifikasi OK; eksekusi ulang dijadwalkan otomatis 90 detik setelah sesi ini selesai.
- `hermes_state FATAL`: 4 kejadian hari ini (2×09:00, 2×10:00) → target 0 di tick
  berikutnya (verifikasi tick berikutnya menghitung holder via /proc, bukan cuma log).
- `deleted-WAL holders`: masih 2 PID / 7 fd (gateway utama 3141184 sejak Sep 28;
  EM profile 2956867) — recycle pertama belum pernah menyentuh mereka.
- Self-check lama buta terhadap kelas bug ini: validasi `ast.parse` tidak mengeksekusi
  import; regex di level modul baru compile saat import, bukan saat parse.

## Decision
**Adopt** — launcher wajib pakai interpreter venv untuk script yang import kode
hermes-agent. Aturan praktisnya: verifikasi wiring script batu-batuan harus menyentuh
path eksekusi nyata (import nyata, bukan parse saja).

## Risk
- Gateway naik-turun sekali lagi (planned stop + systemd revive, pola terbukti Sep 27).
- Kalau worker cron gantung >3 jam, launcher jalan setelah timeout (by design).
- Root cause "siapa yang me-retire WAL di bawah gateway hidup" masih belum ketemu —
  belom ditindak, masih bisa keulang.

## Lessons Learned
- `systemd-run --user` mewarisi environment unit (PATH tanpa venv) — script yang manggil
  `python3` di sana resolve ke system Python, beda dari shell interaktif.
- Self-check yang cuma parse (ast/syntax) buta terhadap error level import — bug kelas ini
  lolos 4/4 check. Minimal check: eksekusi import chain nyata pakai interpreter yang sama
  dengan produksi.
- Empat report berturut-turut soal WAL zombie sama bukan tanda fix gagal terus — tapi
  tanda verifikator per-lapis belum pernah menguji jalur eksekusi lengkap. Sekarang sudah.

## Next Priority
Tick berikutnya: verifikasi holder = 0 dan FATAL berhenti. Kalau muncul lagi, buru
pemicu retire-WAL ("halt") yang belum teridentifikasi.
