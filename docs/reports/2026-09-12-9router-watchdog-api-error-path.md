---
task_id: daily-focus
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-12
status: published
human_review: autonomous
---

# 9router watchdog: menutup blind spot kedua — jalur API-error exhaustion

## Engineering Question
Watchdog DEGRADED (dibangun pagi ini, lihat `2026-09-12-9router-watchdog-empty-response.md`) hanya grep satu signature: `Empty response after 3 retries`. Tapi `conversation_loop.py` punya **dua** jalur retry-exhaustion: empty-content (WARN) dan API-error (ERROR, `API call failed after N retries`). Upstream `cursor/claude-fable-5-high` lagi 429 "Update Required" (158 hit di errors.log hari ini). Kalau jalur 503 itu suatu saat exhausted, apakah watchdog melihatnya?

## Method
1. Baca `conversation_loop.py`: line ~6585 empty-response retry (WARN → `attempting fallback`), line ~5326 API-error exhaustion (ERROR, terminal — sama untuk kelas API error & billing).
2. Hitung distribusi attempt di errors.log hari ini: 47×`attempt 1/3`, 27×`attempt 2/3`, **0×`attempt 3/3`** — jalur 503 belum pernah exhausted (upstream selalu sembuh di attempt ke-2), jadi blind spot-nya belum pernah terRealisasikan.
3. Patch watchdog: `grep -F` satu pattern → `grep -E` dua pattern. Satu baris diff.
4. Tambah test T6 (signature ERROR sintetis) ke self-test hermetic.

## Findings (measurements)
- **exhaustion_signatures_covered: 1 → 2** (empty-response + API-error; API-error pattern juga menangkap billing-exhaustion karena berbagi satu log line).
- **selftest: 5 → 6 pass** (6/6 green, 0 fail, hermetic — 0 request ke router live).
- **Live validation gratis dari episode hari ini**: event fallback 13:01:19 (menimpa session Daily Focus ini sendiri!) → state file `/tmp/.9router_degraded` terbuat 13:05 — **detection latency ≤ 4 menit**, sesuai desain ≤ 1 interval cron.
- **fallback_rescue_rate hari ini: 4/4 episode selamat** (09:01, 09:06, 10:19, 13:01 — semua jatuh ke zai dan menyelesaikan session).
- **retry_cost_per_episode: ~30–35 detik** (09:00:44→09:01:19) — murah, tidak perlu tuning backoff.
- **503 attempts today: 74** (47+27), upstream cursor 429 "Update Required" = 115/137 hit penyebab.

## Decision
Adopt — sudah live (cron `*/5` tidak berubah, patch in-place). Watchdog pagi ini terbukti mendeteksi episode real-time; patch ini menutup kelas kegagalan saudaranya sebelum terjadi.

## Risk
- Kalau format log Hermes berubah, deteksi diam-diam gagal — sama seperti kemarin; mitigasi sama: self-test bisa dijalankan ulang kapan saja.
- Ceiling: kelas error yang TIDAK lewat retry loop (mis. stream drop di tengah respons) punya signature lain lagi — tidak di-cover. Belum pernah teramati di log; tambah kalau muncul.

## Lessons Learned
- Satu kode path exhaustion = satu signature log. Saat membangun log-based detection, audit **semua** path yang berakhir "giving up", bukan cuma yang terakhir terjadi.
- Fallback chain Hermes terbukti menyelamatkan 4/4 session hari ini — investasi `fallback_providers` di config sudah balik modal.

## Next Priority
- Upstream cursor masih 429 hari ini; kalau besok masih 429 dominan, pertimbangkan reorder fallback chain / ganti model default cron (edit config — **wajib human review**).
- Debris recovery awal run: report TD-2 cicd-builder (untracked) sudah dipublish — commit `418d6bd`, pushed.
