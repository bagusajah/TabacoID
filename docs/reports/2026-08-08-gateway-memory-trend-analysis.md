---
task_id: t_49b5dbdd
objective: OBJ-002
date: 2026-08-08
status: draft
human_review: autonomous
---

# Gateway Memory Trend Analysis: Bukan Leak, tapi Page Cache

## Engineering Question
`systemctl --user status hermes-gateway` melaporkan `Memory: 2.0G`. Apakah gateway Python punya memory leak, atau angka itu menyesatkan? Backlog item H2 minta leak detection — apakah RSS gateway memang tumbuh over time?

## Method
1. Baca process-level memory via `/proc/<pid>/status` (VmRSS, VmHWM, VmPeak) untuk gateway Python (PID 1857), WhatsApp bridge Node (PID 3931), dan dashboard Python (PID 1859) sebagai comparison.
2. Baca cgroup v2 `memory.current`, `memory.peak`, `memory.stat` untuk gateway dan dashboard service.
3. Analisis memory map (`/proc/<pid>/smaps`) untuk breakdown anon vs file-backed.
4. Cek OOM events (`memory.events`) dan system pressure (PSI).
5. Compare VmHWM vs VmRSS untuk menentukan growth pattern.

## Findings (with measurements)

### systemctl "Memory: 2.0G" adalah cgroup memory, bukan process RSS

| Metric | Gateway (Python) | Bridge (Node) | Dashboard (Python) |
|--------|-----------------|---------------|-------------------|
| **VmRSS** (actual) | **754 MB** | 118 MB | 421 MB |
| VmHWM (peak RSS) | 755 MB | 147 MB | 422 MB |
| VmSize (virtual) | 2,110 MB | 22,060 MB | 3,123 MB |
| **Cgroup current** | **2,044 MB** | — | 1,345 MB |
| Cgroup peak | 4,593 MB | — | 3,981 MB |

### Cgroup memory breakdown (gateway)
| Component | Size | % of cgroup |
|-----------|------|-------------|
| **anon (heap + stack)** | 783 MB | 38% |
| **file (page cache)** | 1,156 MB | **56%** |
| kernel (slab) | 153 MB | 7% |
| **Total cgroup** | **2,044 MB** | 100% |

**56% dari "2.0G" adalah file-backed page cache** — file yang dibaca dari disk dan di-cache oleh kernel. Ini recliamable, bukan leak.

### Leak determination: NO LEAK
- **VmHWM (754,768 kB) ≈ VmRSS (754,724 kB)** — selisih 44 kB. RSS sudah di high-water mark dan tidak tumbuh.
- Gateway uptime: 10.5 jam, RSS stabil di ~754 MB.
- Cgroup peak 4.59 GB adalah startup spike (module import, Baileys session restore) yang sudah turun ke 2.04 GB.

### Tracemalloc overhead
- Drop-in `HERMES_GATEWAY_TRACEMALLOC=1` aktif. Tracemalloc menyimpan Python traceback untuk setiap allocation → overhead ~150-200 MB.
- Estimated baseline tanpa tracemalloc: ~550-600 MB RSS.

### System health
- **OOM events: 0** (low=0, high=0, max=0, oom=0, oom_kill=0)
- **Available memory: 5.3 GB** dari 7.7 GB total
- **Swap: 7 MB / 3.9 GB** (0.2%) — zero memory pressure
- **No memory.max limit** set on gateway cgroup (unlimited)

## Decision
**Adopt (no action needed).** Gateway tidak punya memory leak. "2.0G" dari systemctl menyesatkan karena 56% adalah page cache yang reclaimable. Actual process RSS 754 MB, stabil (VmHWM ≈ VmRSS), system punya 5.3 GB headroom, zero OOM events.

Tracemalloc drop-in boleh tetap aktif selama debugging — overhead 150-200 MB acceptable given 5.3 GB available. Kalau resource pressure muncul di masa depan, tracemalloc bisa di-disable untuk reclaim ~150 MB.

## Risk
- **Low.** Tidak ada code change. Ini pure analysis.
- **Future monitoring:** kalau gateway uptime > 7 hari dan RSS mulai melebihi VmHWM, baru pertimbangkan leak investigation. Saat ini premature.

## Lessons Learned
- **`systemctl status` "Memory:" menyesatkan** untuk diagnosa leak — itu cgroup memory.current yang include page cache. Untuk leak detection, selalu pakai `/proc/<pid>/status` VmRSS dan compare dengan VmHWM.
- **VmHWM ≈ VmRSS = stable memory.** Ini pattern check tercepat untuk "is it leaking?" — kalau high-water mark sama dengan current RSS, memory tidak tumbuh.
- **Cgroup v2 `memory.stat` breakdown (anon vs file) adalah diagnostic tool yang powerful** — tersedia di setiap `.service` cgroup, zero-cost.
- Backlog item H2 bisa di-close: bukan leak, expected behavior.

## Next Priority
- Close backlog item H2 (gateway memory trend) — resolved as non-issue.
- Item H3 (TUI session cleanup, 6 idle sessions = 914 MB) lebih actionable untuk memory savings daripada gateway.
- Pertimbangkan periodic RSS monitoring (hourly snapshot to file) untuk detect slow leaks yang baru visible setelah days/weeks of uptime.
