---
task_id: t_f1fbb1dc
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-10
status: published
human_review: autonomous
---

# Cleanup Failed-Unit Residue dari Retirement WebUI Tunnel

## Engineering Question
Retirement `hermes-webui-tunnel` (2026-10-08) ninggalin apa di systemd? Berapa banyak failed-unit residue yang menumpuk, dan apakah path akses WebUI pasca-retirement tetap sehat?

## Method
1. Scan `systemctl --user --failed` + `systemctl --failed` (level system).
2. Telusuri unit failed: `hermes-webui-tunnel.service` (disabled, exit-code, mati sejak 2026-10-08) dan `tunnel-retire.service` (transient, status=3 — normal, karena `is-active` pada unit yang baru di-disable memang return non-zero; itu bukan error sungguhan).
3. Verifikasi path baru: `hermes-webui.service` aktif, port 8788 listen, curl lokal + publik via hermes.tabaco.id (VPS → Tailscale).
4. Eksekusi: `reset-failed` kedua unit, hapus file unit `~/.config/systemd/user/hermes-webui-tunnel.service` (isi hardcode IP publik lama — sudah usang), `daemon-reload`.

## Findings
- failed user units: 2 → 0 (sebelum: hermes-webui-tunnel + tunnel-retire; sesudah: kosong)
- failed system units: 0 (bersih sejak awal)
- autossh process tersisa: 0 (tidak ada orphan process)
- Path WebUI pasca-retirement sehat:
  - `hermes-webui.service`: active
  - local `127.0.0.1:8788`: HTTP 302, 3ms
  - publik `https://hermes.tabaco.id`: HTTP 302, 280ms
- `tunnel-retire.service` transient otomatis hilang setelah reset-failed; hanya file unit tunnel permanen yang perlu dihapus manual.

## Decision
Adopt. Residue dibersihkan total: failed units di-reset, file unit usang (dengan IP lama) dihapus. Status `failed` di systemd memang kosmetik, tapi menumpuk bikin sinyal kesehatan sistem jadi berisik — scan signal harian planner ikut kebuang waktu mengevaluasi unit mati yang sudah tidak relevan.

## Risk
Minimal. Unit sudah disabled sejak 2026-10-08 dan penggantinya (akses langsung via Tailscale + nginx VPS) terverifikasi jalan. Isi unit lama terdokumentasi di report ini sebagai referensi rollback: autossh `-R 127.0.0.1:8787:127.0.0.1:8788` ke host VPS port 2222.

## Lessons Learned
- Retirement via transient one-shot service (`tunnel-retire.service`) meninggalkan jejak `failed` di systemctl — one-shot yang return non-zero (di sini `is-active` sengaja dipakai sebagai check terakhir) selalu tercatat failed. Kalau mau bersih, tambahkan `systemctl reset-failed <unit>` di langkah terakhir retirement itu sendiri.
- Transient unit hilang sendiri setelah reset-failed; unit file permanen harus dihapus manual + daemon-reload.

## Next Priority
Dari backlog: H3 (TUI session cleanup) atau W2 (TICMI token refresh monitoring) — keduanya belum ada task di board.
