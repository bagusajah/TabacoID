---
task_id: t_4799866a
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-05
status: published
human_review: autonomous
---

# MCP crawl4ai keepalive timeout loop — root cause: handler `ping` hilang

## Engineering Question
Sejak 2026-09-05 09:34 (ternyata sejak 09:00), MCP server `crawl4ai` loop:
keepalive TimeoutError → 5 reconnect gagal → parked → self-probe 300s → ulang,
tiap ~8.5 menit, tanpa pernah recover. Container Docker `crawl4ai-crawl4ai-1`
healthy. Kenapa gateway gak bisa maintain session ke server ini padahal
prosesnya hidup?

## Method
1. Korelasi log: `journalctl --user -u hermes-gateway` menunjukkan pasangan
   `keepalive failed ... TimeoutError` + `parking` tiap ~513s (5 reconnect ×
   budget + probe 300s). Pola metronom, bukan random — indikasi kuat handshake
   protokol, bukan resource.
2. Tracing config: `config.yaml` → `mcp_servers.crawl4ai` spawn
   `/home/orangepi/crawl4ai-env/bin/python3 crawl4ai-mcp/server.py` via **stdio**
   (container Docker :11235 itu service terpisah, bukan yang dipakai gateway —
   health-nya red herring).
3. Baca `server.py` (83 baris): `handle_request()` punya handler untuk
   `initialize`, `notifications/initialized`, `tools/list`, `tools/call` —
   **tidak ada handler `ping`**. Method unknown → `return None` → server tidak
   menulis response apa pun → client keepalive timeout.
4. Reproduksi stdio langsung: kirim `initialize` + `ping` ke proses server.
   Before: hanya `initialize` yang dibalas, `ping` gak dapat jawaban.
5. Fix: tambah 2 baris di `handle_request` —
   `if method == "ping": return {}` (MCP spec: `ping` WAJIB dibalas empty
   result, cepat, tanpa proses berat).
6. Verifikasi ulang: `ping` dibalas `{"result": {}}`, `initialize` dan
   `tools/list` tetap normal.
7. Recovery: gateway self-probe spawn proses baru → 11:08:07 log
   `revived — session healthy again after parking (parked → connected)`.
8. Fungsi tetap utuh: test `tools/call scrape https://example.com` →
   `success: true, status_code: 200`, markdown balik.

## Findings
- **Root cause:** server MCP custom gak implement `ping`. Semua keepalive
  ping sejak awal pasti timeout. Loop reconnect-parked adalah consequence.
- **Metric keepalive_failures_per_jam:** 7/hour (timeout tiap ~8.5 menit,
  14 cycle beruntun 09:00–11:00) → **0** (11:08 revived, window observasi
  11:08–11:18+ melewati titik fail berikutnya yang diharapkan ~11:16, nol
  failure baru).
- **State gateway:** parked → connected (11:08:07).
- **Scrape e2e:** HTTP 200, `success: true` post-fix.
- Fix total 2 baris + tanpa perubahan gateway/config. Gak perlu naikkan
  timeout budget — hipotesis awal "handshake lambat/resource" salah; server
  memang gak pernah mbales ping.
- Dead end yang buang waktu sebentar: container Docker crawl4ai (:11235)
  healthy tapi HTTP-nya di-reset dari host — itu service terpisah yang
  tidak dipakai gateway (stdio spawn), bukan bagian dari incident.

## Decision
Adopt — fix di source server.py (`/home/orangepi/crawl4ai-mcp/server.py`),
bukan mitigasi timeout. Root-cause fix, paling kecil, spec-compliant.

## Risk
Low. Handler ping hanya menambah response `[]` untuk method `ping`; behavior
method lain tidak berubah. Rollback: hapus 2 baris. Satu catatan: gateway
sampai hari ini "hidup" dengan server yang gak pernah bisa di-ping — artinya
ada kemungkinan tool scrape via MCP juga belum pernah sukses dipakai sejak
server ini didaftarkan; layak cek usage historis nanti.

## Lessons Learned
- "Container healthy" bukan bukti jalur yang dipakai client sehat — verifikasi
  dulu jalur transport mana yang benar-benar dipakai (stdio vs HTTP).
- Timeout loop metronom (~interval tetap) = masalah protokol/handshake,
  bukan resource. Kalau resource, jitter-nya besar.
- MCP spec: `ping` wajib dibalas. Server MCP custom minimal harus punya
  initialize + ping + tools/list sebelum layak dipasang.

## Next Priority
Cek apakah server MCP custom lain (kalau ada) juga gak balas `ping`.
Opsional: tambah smoke-test `ping` di checklist pendaftaran MCP server baru.
