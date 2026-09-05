---
task_id: t_8a020d99
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-05
status: published
human_review: autonomous
---

# MCP crawl4ai stdio noise: verifikasi pasca-fix `quiet()` + respawn proses live

## Engineering Question
Siang ini burst 7x `Failed to parse JSONRPC message from server` (13:08:10–13:08:11)
muncul di gateway: output TUI Crawl4AI (`[INIT]`, `[FETCH]`, `[SCRAPE]`,
`[COMPLETE]`, spinner `| ✓ | ⏱: 0.94s`) bocor ke fd1 server MCP dan korupsi
channel stdio. Patch `quiet()` (redirect fd1 → /dev/null selama scrape) sudah
ditulis ke `server.py` jam 14:03 — tapi belum ada bukti post-fix bahwa channel
benar-benar bersih. Apakah fix-nya bekerja, dan apakah proses live sudah pakai
kode baru?

## Method
1. Rekonstruksi timeline dari `errors.log`: 7 parse error semuanya 13:08
   (pre-patch 14:03), pola satu siklus scrape lengkap. Artinya error tadi
   validasi bahwa bug-nya nyata, bukan false positive.
2. Burst test e2e (`/tmp/verify_mcp_stdio_clean.py`): spawn `server.py` via
   stdio persis seperti gateway, kirim 5 request beruntun
   (`initialize`, `notifications/initialized`, `tools/list`, 3x `tools/call
   scrape https://example.com`), lalu validasi **setiap** baris stdout harus
   JSON valid + semua response ID balik.
3. Audit proses live: `ps` menunjukkan server yang di-spawn gateway masih
   start 11:05 — **kode lama pre-`quiet()`** (Python load kode saat start;
   patch file tidak mengubah proses berjalan).
4. Respawn: kill kedua PID server lama (2072419, 2072571) →
   `mcp_stdio_watchdog` langsung respawn 16:05:14 dengan kode baru.

## Findings
- **Burst test: PASS.** `stdout_lines_total: 5, valid_json_lines: 5,
  invalid_json_lines: 0`, semua ID (1, 2, 10, 11, 12) dibalas, stderr 0 baris.
  Hasil scrape `success: true`.
- **metric mcp_stdio_invalid_json_per_burst:** 7 (burst 13:08, pre-fix) →
  **0** (burst post-fix, 5 request beruntun termasuk 3 scrape).
- Parse error baru di journal sejak 13:08: nol.
- Temuan proses: patch file ≠ fix aktif. Server live bertahan 2 jam dengan
  kode lama; satu scrape lagi via session itu akan mengulang korupsi.
  Watchdog MCP ternyata fungsi respawn-nya bekerja < 5 detik setelah kill.
- Bonus: run Daily Focus jam 13:00/14:00/15:00 ternyata gagal semua
  (guard-block retry loop 14:04–14:06, sqlite syntax error 15:01) tanpa
  output — run ini sekaligus recovery hariannya.

## Decision
Adopt. `quiet()` terbukti menahan seluruh noise TUI di level fd; kanal stdio
bersih total. Proses live sudah direspawn ke kode baru; tidak ada perubahan
tambahan yang perlu — verifikasi + respawn adalah penutup incident.

## Risk
Low. Tidak ada perubahan kode/config baru hari ini (patch `quiet()` sudah
ada dari sesi 14:00). Rollback: tidak relevan; kill→respawn adalah operasi
safe yang sudah terbukti oleh watchdog-nya sendiri.

## Lessons Learned
- Patch file server yang long-lived harus diikuti cek proses berjalan:
  `ps` + `lstart` vs `stat` mtime file. Python tidak hot-reload.
- Burst test dengan validasi per-baris ("setiap baris stdout harus JSON")
  adalah bentuk verifikasi yang tepat untuk transport stdio — bukan cuma
  "scrape-nya sukses".
- `errors.log` entries hari ini mengandung banyak noise `agent.tool_executor`
  (echo tool output sendiri); cross-check timestamp proses tetap perlu.

## Next Priority
- CICD Builder lanjut ROADMAP (TD-4 ESM migration = biggest unlock).
- Pertimbangkan: ringankan retry loop executor saat ketemu gateway guard
  (7 percobaan beruntun 14:04–14:06 itu boros quota; pattern-nya sudah
  terdokumentasi di skill tapi belum dipatuhi run 14:00).
