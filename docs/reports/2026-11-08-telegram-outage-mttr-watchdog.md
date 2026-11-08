---
task_id: t_3bab39fc
objective: OBJ-002
experiment: null
category: Operations
date: 2026-11-08
status: published
human_review: autonomous
---

# Telegram Outage 8 Jam: Root Cause + Watchdog MTTR

## Engineering Question

Episode ConnectTimeout Telegram 2026-11-08 00:08–11:14 WIB: apakah internet Pi
yang down, atau jalur Telegram saja yang stuck — dan kenapa gateway tidak
self-heal selama 8 jam? Mitigasi apa yang memangkas MTTR?

## Method

Forensik log (`errors.log`, `agent.log`, journal kernel/NetworkManager/tailscaled),
cross-check koneksi internet via `session_model_usage` (bukti LLM API tetap jalan),
dan uji guard watchdog dengan data sintetis terkontrol.

## Findings

- **1,448 warnings Telegram** hari ini vs ~61 kemarin (23× lonjakan). Distribusi
  per jam: mulai 00:08, puncak 03:00–10:00 (~144–216/jam), berhenti total
  setelah restart gateway 11:13 (0 warnings pasca-11:14 sampai sekarang).
- **Internet Pi hidup selama window:** sesi LLM tercatat jalan normal jam 09–14
  (29–47 API calls/jam ke api.z.ai, puluhan ribu token — model butuh internet).
  Tailscale 0 error semalam; kernel + NetworkManager: nol link/carrier event.
- **Kesimpulan:** outage selektif jalur Pi→149.154.160.0/20 (Telegram DC),
  bukan internet down. Konsisten dengan diagnosis PMTU black hole + ISP
  policing slot pagi (`2026-11-08-telegram-pmtu-black-hole.md`) dan relay VPS
  (`2026-11-08-telegram-vps-relay-fase2.md`).
- **MTTR selama ini: 8.1 jam** — self-heal internal gateway (retry IP walking,
  reconnect 2/8) tidak pernah memulihkan polling saat episode kronis; pemulihan
  hanya terjadi lewat restart manual.
- **Watchdog `tg-stall-watchdog.sh` + timer systemd user (*/5 menit):** trigger
  hanya bila episode fresh (<6 menit) + kronis (≥6 markers/30 menit) + tidak ada
  sesi LLM aktif (120s) + service active + cooldown 60 menit. Jalur restart =
  planned-stop marker → TERM → systemd Restart=always (pola
  `repair-state-wal-orphan.sh`). Uji guard: trigger-case 1/1 pass, no-trigger
  cases 4/4 pass (LLM aktif, marker stale, sporadik, cooldown).
- **Dua temuan sampingan dari pengujian:**
  1. Jalur non-dry-run watchdog me-restart gateway produksi saat diuji dengan
     data sintetis (~30 detik downtime, pulih otomatis). Disengaja-dibuat-jelas:
     guard marker `DRY_RUN=1` di script + catatan peringatan.
  2. `write_planned_stop_marker()` gagal import (`hermes_yaml`) bila cwd bukan
     repo root — `repair-state-wal-orphan.sh` selama ini lolos karena cwd
     kebetulan pas. Fix: `PYTHONPATH` eksplisit di watchdog; diverifikasi
     marker tertulis + terhapus bersih.

## Decision

**Adopt.** Watchdog live sebagai safety net MTTR (paling buruk ±10 menit vs
8 jam). Mitigasi jalur utama tetap relay VPS t_c70b4327 — watchdog tidak
menyembuhkan jalur, hanya memangkas durasi stuck. Pin MTU 1492 masih
non-persisten (butuh approve manusia untuk /etc).

## Risk

- False positive: restart saat LLM sedang bekerja dicegah guard 120s, tapi
  buffer bisa kalah cepat dari call panjang — dampak: cron in-flight terpotong,
  TTL claim kanban mengembalikan task ke ready (tanpa korupsi).
- Restart loop dicegah cooldown 60 menit + systemd RestartSec=5.
- Watchdog memakai api yang sama dengan repair WAL (marker path
  `~/.hermes/.gateway-planned-stop.json`) — sudah diverifikasi tidak saling
  mengganggu (marker per-proses, cleanup test bersih).

## Lessons Learned

- "Internet down" vs "jalur selektif down" hanya bisa dipisah dengan bukti
  trafik paralel (session_model_usage adalah sinyal uptime internet yang bagus
  di host ini).
- Uji jalur berbahaya tanpa isolasi penuh = insiden. Dry-run harus menjadi
  satu-satunya jalur uji; guard-nya harus ditulis SEBELUM data sintetis
  disiapkan, bukan sesudah.
- Path-dependent import (`hermes_yaml`) adalah bom waktu di script yang
  dipanggil dari konteks cwd berbeda — selalu `PYTHONPATH` eksplisit.

## Next Priority

- Verdict 24h relay VPS + watchdog (kombinasi baru; jam 11:20 pagi baru pasang
  relay, jam 14:20 watchdog). Jika episode kronis masih terjadi meski relay
  aktif → eskalasi pin MTU persisten (butuh approve manusia).
- Pasang `PYTHONPATH` juga di `repair-state-wal-orphan.sh` (potensi bug sama,
  satu baris) — slot berikutnya.
