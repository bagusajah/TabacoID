# Engineering Report: Pi Cluster Resource Profile

**Date:** 2026-08-03
**Category:** Core Engineering — System Profiling
**Decision:** Needs Human Review (baseline established, optimization is separate decision)

## Engineering Question
What is the current resource profile of this Pi cluster — CPU, RAM, disk, and what services consume them?

## Method
Collected live system metrics via standard Linux tooling (`ps`, `free`, `df`, `ss`, `docker ps`, `tailscale status`, `/proc`, `/sys`). No synthetic load — measured at steady-state with all production services running.

## System Overview

| Spec | Value |
|------|-------|
| Board | Orange Pi RK3588 |
| Kernel | 6.1.43-rockchip-rk3588 aarch64 |
| CPU | 8-core (4×2.4GHz + 4×1.8GHz big.LITTLE) |
| RAM | 7.7 GB total |
| Disk | 234 GB NVMe, 19% used (44 GB) |
| Swap | 3.9 GB zram, 220 MB used |
| Uptime | 15 days 15:45 |
| Temp | 37°C (normal) |
| Load avg | 2.28 / 2.44 / 2.35 (healthy for 8 cores) |

## Memory Breakdown (RSS)

| Component | RAM (MB) | CPU% | Role |
|-----------|----------|------|------|
| Hermes Dashboard (Python) | 441 | 5.2% | Web dashboard on :9119 |
| Hermes Gateway (Python) | 286 | 0.6% | WA bridge controller |
| TUI Session 1 (Node) | 221 | 1.5% | Active session |
| TUI Session 2 (Node) | 200 | 1.0% | |
| TUI Session 3 (Node) | 133 | 0.6% | |
| TUI Session 4 (Node) | 127 | 1.6% | |
| WA Bridge (Node/Baileys) | 127 | 0.2% | WhatsApp bridge :3000 |
| TUI Session 5 (Node) | 121 | 0.6% | |
| TUI Session 6 (Node) | 114 | 0.5% | |
| **Total Hermes stack** | **~1870** | **~11.8%** | |

## Running Services

### Systemd user services (Hermes-owned)
- `hermes-dashboard.service` — dashboard web UI (:9119)
- `hermes-gateway.service` — messaging gateway (WA bridge :3000)

### Docker containers
- `webreader-api` — TICMI proxy API (:8787)
- `webreader-nginx` — nginx reverse proxy (:8181)

### Other services
- MySQL/MariaDB (:3306)
- Tailscale (mesh VPN, 5 nodes: twihay, gamingpc, host, mbm-mp, thinkbook14g2itl)
- ADB daemon (:5037)
- RDP server (:3389)
- NFS/rpcbind (:111)
- Cockpit/other (:8096)

## Key Findings

1. **Memory is the bottleneck candidate.** 7.7 GB total, 3.6 GB used, 3.8 GB available (buff/cache). Hermes stack consumes ~1.87 GB (~24% of total RAM). 6 active TUI sessions eat 914 MB — that's 49% of Hermes memory. Each extra TUI session costs ~120-220 MB.

2. **CPU is comfortable.** Load avg 2.28/8 cores = 28.5%. Hottest process is dashboard at 5.2%. Plenty of headroom.

3. **Disk is abundant.** 188 GB free of 234 GB. No pressure.

4. **Swap usage minimal.** 220 MB / 3.9 GB zram — system is not memory-pressured.

5. **6 TUI sessions is the single biggest optimization opportunity.** 914 MB for 6 TUI terminals. Closing idle sessions would immediately reclaim ~300-400 MB.

## Metrics

```
ram_total: 7.7 GB
ram_used: 3.6 GB (47%)
ram_available: 3.8 GB
ram_by_hermes: 1.87 GB (24% of total, 52% of used)
ram_by_tui_sessions: 914 MB (6 sessions)
cpu_load_avg_1m: 2.28 / 8 cores (28.5%)
cpu_temp: 37°C
disk_used: 44 GB / 234 GB (19%)
swap_used: 220 MB / 3.9 GB
docker_containers: 2
systemd_services: 2
tailscale_nodes: 5
listening_ports_meaningful: 22, 53, 111, 3000, 3306, 3389, 5037, 5555, 8096, 8181, 8787, 9119
```

## Risk
None — read-only profiling, no system changes made.

## Next Priority
1. WhatsApp bot latency benchmark (end-to-end: message received → response sent)
2. TICMI API response time measurement (baseline for caching experiment)
