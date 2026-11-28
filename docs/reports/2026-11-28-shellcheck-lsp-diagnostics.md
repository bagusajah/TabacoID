---
task_id: t_822d1de7
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-11-28
status: published
human_review: autonomous
---

# shellcheck Terpasang — Bash Diagnostics LSP Aktif

## Engineering Question
`agent.lsp.servers` keluarkan warning berulang tiap sesi: "bash-language-server: shellcheck not found on PATH — diagnostics will be empty". Artinya seluruh editing script shell (17 script infra/repo, termasuk wal-containment.sh yang kritis untuk restart gateway) berjalan tanpa static analysis. Berapa banyak defect nyata yang selama ini lolos?

## Method
1. `apt-get install -y shellcheck` (0.8.0, tersedia di jammy universe — tanpa dependency baru di luar apt).
2. Scan semua `.sh` di `TabacoID/scripts/` + `~/.hermes/scripts/` (17 file) dengan `shellcheck -S error` lalu `-S warning`.
3. Bersihkan temuan, verifikasi ulang + `bash -n` pada file yang diedit.

## Findings
- **0 error** di 17/17 script sebelum perbaikan — sanitas dasar shell fleet sudah baik.
- **4 warning, semua di satu file** (`wal-containment.sh`): 2× SC2034 (`i` loop var tak terpakai), 2× SC2010 (`ls | grep` vs glob/readlink).
- Perbaikan: `for i` → `for _`; verifikasi fd `ls -l /proc/$pid/fd | grep` → `readlink /proc/$pid/fd/* | grep` (semantik sama: tetap cari string "state.db" di target fd, tanpa parsing `ls`).
- **After: 0 error, 0 warning di 17/17 script.** `bash -n` lulus.

## Decision
Adopt. shellcheck jadi bagian toolkit default; semua script shell baru di infra/repo idealnya lulus `-S warning` sebelum commit.

## Risk
Rendah. wal-containment.sh adalah one-shot containment script (terakhir dipakai untuk WAL journal_mode fix); perubahan loop var dan readlink tidak menyentuh logika stop/convert/restart. File di `~/.hermes/scripts/` tidak ter-track git — perubahan hanya lokal host ini.

## Lessons Learned
- Warning LSP "diagnostics will be empty" adalah sinyal pasif yang mudah diabaikan padahal mencakup semua file bash — satu `apt install` menutup gap-nya.
- Nilai terbesar bukan 4 warning yang ditemukan (kecil), tapi afirmasi bahwa 17 script lain sudah bersih: fleet shell kecil ini sehat.

## Next Priority
Kembali ke board: dua task ready tersisa (`t_b4cee954` muat patch libc/libssl via full restart, `t_a1128938` bind hardening vaultwarden/mysql) keduanya menunggu approval human — slot otonom berikutnya kemungkinan [SILENT] kecuali ada sinyal baru.
