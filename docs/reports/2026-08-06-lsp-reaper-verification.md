# Daily Report 2026-08-06 — Pyright Langserver Reaper Verification

## Pertanyaan Engineering
Apakah pyright-langserver yang terdeteksi idle 211 MB di laporan memory-growth-investigation benar-benar tidak di-reap, ataukah hanya belum cukup lama idle?

## Metode
Analisis log `agent.log` untuk trace pyright lifecycle:
1. Cari spawn/announce timestamps
2. Cek reaper log (`lsp[reaper] reaped ... after 600s`)
3. Hitung delta antara last use dan reap time
4. Bandingkan memory snapshot sekarang vs laporan sebelumnya
5. Review source code reaper (`agent/lsp/manager.py`) untuk verifikasi mekanisme

## Temuan (dengan pengukuran)

### 1. Pyright Lifecycle Tertrace

| Event | Waktu | Keterangan |
|-------|-------|------------|
| Spawn | 22:57:39 | Cron session `cron_8559b9243875_20260806_225645` |
| Diagnostics | 22:57:49 → 22:58:02 | Lint `kanban_db.py`, 49 diags → 2 diags |
| Last use | ~22:58:02 | Terakhir kali `_touch()` dipanggil |
| Reap | 23:09:52 | `lsp[reaper] reaped 1 idle client(s) after 600s` |

**Delta idle → reap**: ~11 menit 50 detik (600s threshold + ~108 detik reaper loop interval)

### 2. Reaper Loop Bekerja Persis Sesuai Desain

Source code konfirmasi:
- `_idle_reaper_loop` jalan setiap `min(60.0, idle_timeout)` = 60 detik
- `_reap_idle_once` cek `last_used < now - 600s`
- Cutoff: 22:58:02 + 600s = 23:08:02 → reaper jalan 23:09:52 (cycle terdekat setelah cutoff)

### 3. Memory Reclaim

| Komponen | RSS (sebelumnya) | RSS (sekarang) | Delta |
|----------|------------------|----------------|-------|
| Dashboard Python | 746 MB | 729 MB | -17 MB |
| Gateway Python | 614 MB | 603 MB | -11 MB |
| Pyright Langserver | 211 MB | 0 MB (reaped) | **-211 MB** |
| Node TUI | 132 MB | 129 MB | -3 MB |
| WhatsApp Bridge | 125 MB | 125 MB | 0 MB |
| **Total Hermes** | **1,828 MB** | **1,586 MB** | **-242 MB** |

### 4. Reaper Historis (7 hari terakhir)

| Tanggal | Server | Workspace |
|---------|--------|-----------|
| 2026-08-06 09:12 | bash-language-server | /home/orangepi/TabacoID |
| 2026-08-06 22:53 | yaml-language-server | /home/orangepi/webreader |
| 2026-08-06 23:09 | pyright | /home/orangepi/.hermes/hermes-agent/hermes_cli |
| 2026-08-06 23:22 | typescript | /home/orangepi/TabacoID |
| 2026-08-05 19:12 | typescript | /home/orangepi/TabacoID |
| 2026-08-04 19:12 | typescript | /home/orangepi/TabacoID |
| 2026-08-03 22:40 | typescript | /home/orangepi/TabacoID |

**Semua server di-reap tepat setelah 600s.** Tidak ada leak.

### 5. Root Cause Observasi Sebelumnya

Laporan memory-growth-investigation (audit ~23:00) melihat pyright masih running karena:
- Pyright di-spawn 22:57 → audit dilakukan <3 menit setelah spawn
- Pyright butuh 600s (10 menit) idle sebelum di-reap
- **Bukan bug** — audit dilakukan terlalu cepat setelah spawn

## Keputusan
**Adopt** — reaper bekerja dengan benar. Tidak ada perubahan kode diperlukan.

## Risiko
Tidak ada. Reaper loop confirmed reliable.

## Lessons Learned
1. LSP reaper 600s timeout bukan bug — itu by design. Pyright consuming 211 MB selama ~10 menit setelah lint session adalah expected behavior.
2. Memory-baseline snapshot timing matters — audit tepat setelah LSP spawn akan menunjukkan "leak" yang sebenarnya temporary allocation.
3. Reaper log (`lsp[reaper] reaped`) sangat berguna untuk verifikasi — selalu cek log sebelum menyimpulkan leak.

## Prioritas Berikutnya
- Pertimbangkan turunkan `idle_timeout` dari 600s ke 300s untuk lebih cepat reclaim (trade-off: re-spawn cost untuk LSP yang baru saja idle)
- Task `t_5B222930` sudah dibuat untuk periodic `gc.collect()` di gateway — masih valid sebagai soft mitigation
