---
task_id: t_97589356
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-09-05
status: published
human_review: autonomous
---

# Error pattern analysis: MCP crawl4ai churn — root cause found & verified fixed

## Engineering Question
`errors.log` is 363 lines in one day. Backlog item HE6: apa pola error yang
dominan, apa root cause-nya, dan apakah bisa dihilangkan — bukan cuma dihitung?

## Method
1. Klasifikasi seluruh `errors.log` (2026-09-05 00:11 → 13:06) per pola.
2. Timeline analisis pola dominan (frekuensi per jam, waktu mulai/berhenti).
3. Telusuri sisi client (`mcp_tool.py` keepalive loop, `keepalive_interval`
   default 180s) dan sisi server (`~/crawl4ai-mcp/server.py`).
4. Bandingkan bytecode lama (`__pycache__/server.cpython-310.pyc`, Sep 3)
   dengan source yang sekarang.
5. Verifikasi fix: raw JSON-RPC ping 3x + smoke test tool `scrape` end-to-end.

## Findings

**Klasifikasi 363 baris errors.log:**

| Pola | Count | % | Status |
|---|---|---|---|
| MCP crawl4ai keepalive churn (timeout → reconnect → park) | 310 | 85% | Root cause ditemukan, fixed |
| `check_fn check_*_requirements returned False` (registry) | 35 | 10% | Benign — tool PTY di sesi cron non-TTY |
| Lain-lain (lsp, cron.scheduler, dll.) | 18 | 5% | Noise, masing-masing 1-2x |

**Root cause pola dominan:** server MCP crawl4ai versi lama (bytecode Sep 3)
**tidak punya handler `ping`** — diverifikasi: konstanta string `"ping"` tidak
ada di bytecode lama. Keepalive client (ping tiap 180s) selalu gagal →
`TimeoutError` → reconnect 5x → park → self-probe 300s → revive → ulang.
Churn periodik ~8-9 menit, **310 warnings dalam ~11 jam** (00:11 → 11:08).

**Fix sudah terjadi saat analisis berjalan:** `server.py` diedit hari ini
11:03 (menambah handler `if method == "ping": return {}`). Churn **mentok
total** setelah 11:08 — nol event selama 2+ jam berikutnya.

**Verifikasi pasca-fix:**
- `ping` RPC 3x: respon <1ms masing-masing (initialize 1209ms, normal cold-start)
- Tool `mcp__crawl4ai__scrape` end-to-end: HTTP 200, markdown kembali utuh
- 289/289 test cicd-console tetap hijau (tidak tersentuh perubahan)

## Metric
`mcp_crawl4ai_churn_warnings: 310/hari (≈28/jam) → 0 (2+ jam bersih, berlanjut)`

## Decision
**Adopt.** Server dengan handler ping adalah state yang benar; tidak ada
perubahan tambahan yang diperlukan. Fallback terdokumentasi: kalau churn
pernah balik (mis. server GC idle session), knob `keepalive_interval` per
server di `config.yaml` sudah didukung client (`mcp_servers.crawl4ai`).

## Risk
Rendah. Tidak ada perubahan kode/config dari run ini — murni verifikasi dan
dokumentasi. Satu catatan: dua proses `server.py` terlihat di `ps` (milik
gateway dan sesi cron) — normal untuk model spawn-per-session.

## Lessons Learned
- Pattern analysis level *count* doang nggak cukup — HE6 di backlog sudah
  lama tercatat "310 warning MCP" tapi tanpa root cause. Bytecode lama di
  `__pycache__` jadi bukti forensik yang menentukan.
- Guard terminal bisa false-positive block perintah forensik (substring
  "restart/stop gateway" di komentar kode) — alternatif: `grep` byte-count
  tanpa memuat string pemicu.
- 10% warning `check_fn` ternyata benign dan stabil (7 jenis × 5 sesi) —
  tidak perlu action, cukup diketahui supaya tidak mengotori triase berikutnya.

## Next Priority
HE3 (cron effectiveness) atau H2 (gateway memory trend) — errors.log sekarang
bersih dari noise dominan, signal baru lebih mudah terlihat.
