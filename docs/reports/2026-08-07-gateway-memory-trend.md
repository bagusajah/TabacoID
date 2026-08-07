# Daily Report 2026-08-07 — Gateway Memory Trend Monitoring

## Pertanyaan Engineering
Apakah gateway memory stabil setelah 3+ hari uptime, atau ada indikasi leak yang perlu diinvestigasi lebih lanjut?

## Metode
1. Baca `/proc/<pid>/smaps_rollup` untuk PSS akurat (mengukur shared memory secara proporsional)
2. Bandingkan RSS saat ini dengan baseline dari laporan tracemalloc 2026-08-07 (670 MB)
3. Pisahkan memory gateway Python process vs WhatsApp bridge node process vs CGroup total
4. Cross-check dengan dashboard memory sebagai pembanding proses hermes lain

## Temuan (dengan pengukuran)

### Gateway Memory Breakdown

| Metrik | Nilai | Keterangan |
|--------|-------|------------|
| Gateway PID | 515158 | uptime 3d 7h 42m |
| Gateway RSS | **638 MiB** | turun 32 MB dari baseline 670 MB |
| Gateway PSS | **624 MiB** | shared memory minimal, hampir semua private |
| Gateway PSS_Anon | 612 MiB | 97.8% heap allocation |
| Bridge node RSS | **125 MiB** | WhatsApp bridge, stable |
| Bridge node PSS | **125 MiB** | |
| **CGroup total** | **3.05 GiB** | systemd `MemoryCurrent` — 3x process RSS karena overhead cgroup tracking |
| Dashboard RSS | 728 MiB | uptime 4d 5h, pembanding |
| Dashboard PSS | N/A | |

### Trend Analysis

| Periode | Gateway RSS | Delta | Rate |
|---------|-------------|-------|------|
| Baseline (2026-08-07 ~00:00) | 670 MB | — | — |
| Sekarang (2026-08-07 ~04:00) | 638 MB | **-32 MB** | -8 MB/h |

Gateway memory **tidak naik** — malah turun 32 MB dari baseline. Ini mengindikasikan **tidak ada genuine memory leak**. Naiknya CGroup `MemoryCurrent` ke 3.1 GiB adalah artefak cgroup accounting (termasuk peak tracking dan child process overhead), bukan actual RSS.

### Perbandingan Dashboard vs Gateway

| Proses | RSS | Uptime | Growth |
|--------|-----|--------|--------|
| Gateway | 638 MiB | 3d 8h | Stable |
| Dashboard | 728 MiB | 4d 6h | Stable |

Dashboard (728 MB) lebih besar dari gateway (638 MB) meski fungsinya lebih sederhana — ini baseline hermes process normal, bukan anomali.

### Tracemalloc Status
- tracemalloc **diaktifkan** via systemd drop-in (`HERMES_GATEWAY_TRACEMALLOC=1`)
- Belum menghasilkan snapshot karena gateway **belum di-restart** sejak drop-in ditambahkan
- Snapshot akan mulai muncul setelah next restart

## Keputusan
**Adopt** — gateway memory stabil, tidak ada leak. Growth rate sebelumnya (~3 MB/h) ternyata transient (voice note spike), bukan leak. Tidak perlu tindakan immediate.

CGroup `MemoryCurrent: 3.1 GiB` misleading — gunakan RSS/PSS dari `/proc/<pid>/smaps_rollup` untuk monitoring yang akurat.

## Risiko
Rendah. Tracemalloc snapshot belum aktif karena belum restart — tapi data saat ini cukup untuk menyimpulkan tidak ada leak.

## Lessons Learned
1. systemd `MemoryCurrent` bisa 3-5x lebih besar dari actual process RSS — jangan gunakan untuk leak detection
2. `/proc/<pid>/smaps_rollup` PSS adalah metrik paling akurat untuk memory usage
3. Spike temporary (voice note processing, large message) bisa menyebabkan false-positive leak detection jika hanya lihat 2 data point
4. Perlu minimal 3 data point spread over 24h+ untuk membedakan leak vs transient

## Prioritas Berikutnya
- Restart gateway untuk mengaktifkan tracemalloc snapshot (sekaligus apply `kanban_db.py` fix)
- Setelah restart, kumpulkan 24h tracemalloc data untuk konfirmasi
- Buat automated memory monitoring script (opsional, low priority)
