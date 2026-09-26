---
task_id: t_5b663cfc
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-09-26
status: published
human_review: autonomous
---

# Diagnosa warning "post_tool_call hook skipped" — overlap, bukan timeout

## Engineering Question
errors.log 2026-09-26 mencatat 2 warning baru (pertama sepanjang log): `Hook 'post_tool_call' callback _on_post_tool_call skipped after previous timeout or while still running` (10:01:19 & 10:08:50, keduanya di worker cron Builder 10:00). Plugin mana callback-nya, apakah ini timeout sungguhan, dan perlu diremediasi apa?

## Method
1. Grep mekanisme dispatcher: `hermes_cli/plugins_dispatch.py` — hook bounded jalan di daemon thread dengan cap `plugins.hook_callback_timeout` (default 30s), suppression 60s setelah timeout, dan skip jika invokasi sebelumnya masih `running`.
2. Eliminasi kandidat callback bernama sama: `plugins/platforms/raft/adapter.py::_on_post_tool_call` ter-gate `_raft_hook` (hanya eksekusi untuk Raft sessions — Raft tidak aktif) → tersisa `plugins/disk-cleanup/__init__.py::_on_post_tool_call`, terdaftar di semua session.
3. Cek jejak timeout: grep `timed out after` di agent.log.
4. Audit jalur I/O callback disk-cleanup: ekstraksi path kandidat dari command+output terminal → `p.exists()` (stat) → `guess_category()` → `is_safe_path()` yang memanggil `path.resolve()` (stat per komponen) **sebelum** memutuskan scope.

## Findings (with measurements)
- **Timeout nyata: 0 sepanjang agent.log.** Dua skip murni cabang "while still running" — invokasi hook berikutnya datang saat callback sebelumnya belum selesai (dispatch paralel antar session cron yang jalan bersamaan). Pesan warning menyesatkan: kasus "previous timeout" tidak pernah terjadi.
- Satu-satunya callback `post_tool_call` aktif: disk-cleanup. State-nya (`~/.hermes/disk-cleanup/`) bahkan belum pernah dibuat → callback belum pernah men-track file apa pun.
- **Paparan laten ditemukan:** disk-cleanup melakukan `stat()` pada path dari output terminal SEBELUM cek scope. `is_safe_path()` resolving path (stat per komponen) untuk menolak path di luar scope — artinya path `/mnt/*` dibayar stat-nya dulu, baru ditolak. Mount NFS NAS (192.168.10.238, `hard`, timeo=600) punya riwayat 44 TCP reconnect dalam 4,6 hari (mountstats `connect_count`); saat mount stale, stat NFS bisa block >30s → hook timeout → suppression → tool-call tracking mati 60 detik per kejadian di proses itu. Hari ini NAS responsif (stat 6ms), jadi belum meledak.
- Bukti pelengkap: bukan journal_mode (spam WAL→DELETE sudah ditutup Builder pagi ini, error terakhir 09:20); bukan raft (gate context); 166 tool completions hari ini vs 2 skip (1,2%).

## Decision
**Needs Human Review** untuk upstream fix. Dua opsi:
1. **Report upstream issue** ke hermes-agent: (a) pesan warning menggabungkan dua kondisi berbeda (timeout vs overlap) — pisahkan agar diagnosis tidak menyesatkan; (b) disk-cleanup harus cek scope string-only (prefix `HERMES_HOME` / `/tmp/hermes-*` dari `parts`) SEBELUM semua stat, supaya path di luar scope tidak pernah menyentuh filesystem.
2. Patch lokal di `~/.hermes/hermes-agent/` TIDAK dipilih: itu git checkout yang di-manage `hermes update` (updater refuse dirty tree) — patch lokal akan menggagalkan update berikutnya.
Sementara ini benar-benar no-op: belum ada tracking, belum ada timeout, dampaknya cuma noise log sesekali.

## Risk
Kalau suatu hari NAS stale saat cron menulis/cek file di `/mnt` (workflow torrent), setiap tool call dengan path `/mnt` di output akan menyandung stat 30s+ → hook tracking skip berulang. Dampak fungsional rendah (tracking ephemeral files), tapi ini biaya laten yang nempel di hot path semua session.

## Lessons Learned
- Pesan log yang menggabungkan dua kondisi ("timeout or still running") membuat triage salah arah — hampir dikejar sebagai hang.
- "Guard" yang memutuskan scope dengan `resolve()` membayar stat dulu: kalau path-nya bisa datang dari filesystem lambat (NFS hard mount), guard-nya sendiri jadi titik block. Validasi string dulu, stat kemudian.
- False-positive grep: warning 11:04 di errors.log ternyata echo dari perintah grep sendiri (pitfall yang sudah tercatat di skill) — event asli hanya 2.

## Next Priority
- Follow-up t_f27b6a56: audit deploy console + usul ROADMAP item 24.
- Kalau user setuju opsi 1, buat issue upstream (pisah pesan warning + reorder scope-check disk-cleanup).
