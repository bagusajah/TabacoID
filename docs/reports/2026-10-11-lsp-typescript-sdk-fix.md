---
task_id: t_b96a2875
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-10-11
status: published
human_review: autonomous
---

# Fix LSP TypeScript SDK Mismatch — Diagnostics Aktif Lagi

## Engineering Question
Kenapa `typescript-language-server` warning "no TypeScript SDK next to the server, diagnostics are skipped" di setiap sesi, padahal `hermes lsp list` bilang installed?

## Method
1. Cek isi `~/.hermes/lsp/node_modules/typescript` → `hermes lsp install` menarik **typescript@7.0.2** (native tsgo build) yang hanya berisi `bin/tsc` — tanpa `lib/typescript.js` / `tsserverlibrary.js` yang dibutuhkan typescript-language-server.
2. Pin `typescript@5` di `~/.hermes/lsp` (→ 5.9.3, lengkap dengan `lib/typescript.js`), lalu `hermes lsp restart`.
3. Verifikasi end-to-end dengan probe LCP handshake manual (`~/.hermes/scripts/lsp-probe.py`): initialize → didOpen file berisi type error → tunggu publishDiagnostics.
4. Catatan: pesan error resminya ("Reinstall: hermes lsp install typescript-language-server") menyesatkan — reinstall cuma memasang ulang ts7 yang sama.

## Findings
- **metric_diagnostics: 0 → TS2322 tertangkap** (sebelum: "server unavailable: typescript not found", diagnostics skipped; sesudah: `lsp[typescript] active for /home/orangepi/TabacoID`).
- Latensi diagnostics via probe: initialize 0.2s, TS2322 "Type 'string' is not assignable to type 'number'" muncul **1.8s** (file /tmp) / **3.1s** (file project TabacoID).
- Cold-respawn hermes (grant `wait_timeout: 3.0`) tetap timeout karena cold start di ARM RK3588 3–6s. **lsp.wait_timeout: 3.0 → 8.0** via `hermes config set` (berlaku setelah restart gateway, nightly 03:00).
- Log lama juga menunjukkan root cicd-console ditandai "broken after an earlier failure" — issue terpisah, akan clear pada LSP restart berikutnya.

## Decision
Adopt. SDK typecheck diagnostics kembali jalan; wait_timeout disetel sesuai realitas hardware.

## Risk
Rendah. `~/.hermes/lsp` hanya tooling lokal. Rollback: `npm install typescript@7` di `~/.hermes/lsp`. Config `lsp.wait_timeout` revert ke 3.0 jika dianggap terlalu longgar.

## Lessons Learned
- `hermes lsp install` bisa menarik dependency versi mayor yang tidak kompatibel dengan server-nya sendiri (ts7/tsgo vs tsc-js API). Instal eksplisit versi pin bila server butuh API lama.
- Warning message tooling kadang menyarankan aksi yang tidak menyelesaikan masalah — verifikasi isi package sebelum percaya saran reinstall.
- Jangan restart gateway dari sesi cron yang di-host gateway itu sendiri; biarkan config baru ke-pickup di restart nightly.

## Next Priority
Setelah restart gateway 03:00, cek log bahwa cold-respawn diagnostics tidak timeout lagi (probe cepat via edit file + grep log). Sisanya: board kosong — planner perlu isi task baru.
