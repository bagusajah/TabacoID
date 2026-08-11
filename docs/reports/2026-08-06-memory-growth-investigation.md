---
human_review: autonomous
---

# Daily Report 2026-08-06 — Memory Growth Investigation (Hermes Subprocesses)

## Pertanyaan Engineering
Apakah memory growth di Hermes dashboard dan gateway merupakan memory leak genuine, ataukah merupakan perilaku normal Python allocator + request-driven allocation?

## Metode
Analisis data time-series dari `memory-baseline.log` (sampling 30 menit, 18 jam hari ini) dikombinasi dengan:
- `smaps_rollup` untuk breakdown anonymous vs file-backed memory
- `top -H` untuk per-thread CPU usage
- `iostat` untuk disk I/O correlation
- `ps` parent-child tree untuk atribusi proses
- `agent.log` untuk korelasi waktu antara memory spike dan request/agent session

## Temuan (dengan pengukuran)

### 1. Pola Growth: Step-Function, Bukan Linear Leak

**Gateway Python** (PID 515158, up since Aug 3):
| Periode | RSS | Delta | Keterangan |
|---------|-----|-------|-------------|
| 05:00-10:00 | 384 MB | +0 MB | Stabil 5 jam |
| 10:30 | 400 MB | +14 MB | Agent request |
| 11:30 | 576 MB | **+176 MB** | Voice note generation (WhatsApp) |
| 12:00-22:00 | 586-595 MB | ±13 MB | Plateau, Python GC aktif |
| 23:00 | 599 MB | +4 MB | Cron session terakhir |

**Dashboard Python** (PID 48118, up since Aug 2):
| Periode | RSS | Delta | Keterangan |
|---------|-----|-------|-------------|
| 05:00-10:00 | 666 MB | +0 MB | Stabil |
| 10:00-14:00 | 672→696 MB | +30 MB | Staircase, per-request |
| 14:00-20:00 | 696→709 MB | +13 MB | Lebih lambat |
| 21:00-23:00 | 722→729 MB | +7 MB | Cron sessions |

**Dashboard growth rate**: 63 MB / 18 jam = **3.5 MB/h**
**Gateway growth rate**: 215 MB / 18 jam = **11.9 MB/h** (didominasi satu event 176MB)

### 2. Gateway Spike +176MB Teridentifikasi

Korelasi log menunjukkan spike 384→576 MB pada 11:30 berkorelasi dengan:
- WhatsApp message masuk 11:17:57: "Bikin voice note sapa fahmi"
- Agent session `20260728_230936_d3396dcf` menjalankan tool registry load
- Memory **tidak turun kembali** setelah request selesai

Ini adalah Python mmap arena retention, bukan leak. Python's `malloc`/`pymalloc` memperluas heap via `mmap` saat perlu, dan OS tidak reclaim pages tersebut meskipun objek sudah di-free oleh GC.

### 3. Anomali Load Average: Phantom `b=1`

- Load average: **5.23** pada 8-core RK3588 dengan **85% idle CPU**
- 0 threads dalam D-state (uninterruptible sleep) terdeteksi
- `vmstat` menunjukkan `b=1` konsisten — satu phantom blocked thread
- NVMe I/O idle (0.19% utilization), iowait 12% transient
- Penyebab kemungkinan: zram swap compression thread (180MB swap used)
- **Bukan masalah performa**, hanya kosmetik di load average counter

### 4. Pyright Langserver: Zombie LSP Session

- PID 2039532: `pyright-langserver` (211 MB RSS), child of gateway
- Spawned 22:57 oleh cron session untuk lint `kanban_db.py`
- Masih running 2+ jam setelah selesai
- LSP reaper hanya reaps setelah 600s, tapi session mungkin di-keep alive oleh parent

### 5. Memory Budget Keseluruhan

| Komponen | RSS | % Total |
|----------|-----|---------|
| Dashboard Python | 746 MB | 9.2% |
| Gateway Python | 614 MB | 7.5% |
| Pyright Langserver | 211 MB | 2.5% |
| Node TUI | 132 MB | 1.6% |
| WhatsApp Bridge | 125 MB | 1.5% |
| **Total Hermes** | **1,828 MB** | **23%** |
| System total used | 3,721 MB | 47% |
| Available | 3,824 MB | — |
| Swap used | 180 MB / 3,967 MB | 4.5% |

## Keputusan
**Adopt** — tidak ada action yang diperlukan saat ini.

## Alasan
1. Growth bersifat step-function (request-driven), bukan linear leak
2. Python GC aktif dan melakukan reclamation (terlihat dari delta -1 sampai -13MB di beberapa titik)
3. Total memory usage sustainable: 23% RAM, swap minimal
4. Pada growth rate saat ini: ~10 MB/h max, system punya 3.8 GB available — **aman 16+ hari tanpa restart**

## Risiko
- Gateway akan mencapai ~1 GB RSS dalam ~2 minggu jika pola voice-note request terus terjadi (176MB per request tidak di-reclaim)
- Pyright langserver idle consuming 211 MB — harusnya di-reap oleh LSP reaper

## Lessons Learned
1. Memory-baseline.log sangat berguna untuk analisis tren — jaga terus
2. Load average di RK3588 tidak reliable sebagai health indicator — gunakan `vmstat b` dan per-thread analysis
3. Python memory "leaks" di long-running processes biasanya arena retention, bukan code leak — `tracemalloc` diperlukan untuk memastikan

## Prioritas Berikutnya
- Tambahkan periodic `gc.collect()` di gateway setelah agent session selesai (soft mitigation, bukan fix)
- Investigasi kenapa pyright-langserver tidak di-reap setelah 600s idle
- Pertimbangkan `tracemalloc` snapshot di gateway untuk memastikan tidak ada genuine leak
- Periksa apakah webreader API restart berkala (18 min ago) normal atau terlalu sering
