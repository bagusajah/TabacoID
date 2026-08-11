---
human_review: autonomous
---

# Daily Report 2026-08-06

## Engineering Question
**Mengapa tsserver (TypeScript LSP) menjadi orphan setelah cron session selesai? Apakah ada cleanup mechanism, dan apakah ini problem nyata atau transient?**

## Method
Investigasi end-to-end: audit process tree saat idle, trace LSP lifecycle code (manager.py, client.py, scheduler.py, run_agent.py), verifikasi cleanup path pada cron session teardown.

## Findings

### 1. Tsserver Tidak Orphan Sekarang
Pada saat audit (23:27 WIB), **0 tsserver/orphaned LSP processes** ditemukan. 3 orphan yang dilaporkan di audit sebelumnya (450MB, 4% CPU) sudah dibersihkan.

### 2. Root Cause: `AIAgent.close()` Tidak Memanggil `shutdown_service()`

`AIAgent.close()` membersihkan 8 jenis resource:
1. ProcessRegistry (background processes)
2. Terminal sandboxes
3. Browser daemons
4. Computer-use sessions
5. Child agents
6. OpenAI/httpx clients
7. Conversation history
8. Session DB

**TAPI: tidak ada LSP cleanup.** `shutdown_service()` dari `agent.lsp.__init__` hanya di-register via `atexit`, yang hanya fires saat **gateway process exit** — bukan saat individual cron session selesai.

### 3. Safety Net: Idle Reaper Berjalan Normal

LSP Manager punya `_idle_reaper_loop()` yang sweep setiap 60 detik. Client yang idle >600 detik (10 menit) di-shutdown. Jadi orphan tsserver **tidak bertahan lebih dari 10 menit** setelah cron session selesai.

### 4. `start_new_session=True` Intentional

`LSPClient._spawn()` menggunakan `start_new_session=True` agar tsserver tidak terkilled saat gateway membersihkan child processes. Ini design choice yang benar — tanpa itu, LSP akan terkilled saat MCP child cleanup `killpg()` dijalankan.

### 5. dampak: Transient, Bukan Persistent Leak
- Worst case: tsserver orphan selama 10 menit setelah cron session
- Memory impact: ~150MB per tsserver, transient
- Tidak akumulasi: idle reaper memastikan cleanup
- Jika cron job sering (misalnya tiap 30 menit), overlap bisa terjadi — tapi dalam praktik saat ini (cron interval jarang), tidak masalah

## Measurements
- `orphaned_lsp_processes: 0 (saat audit)`
- `idle_reaper_interval: 60s`
- `idle_reaper_timeout: 600s (10 min)`
- `lsp_cleanup_in_agent_close: MISSING (root cause)`
- `atexit_lsp_cleanup: YES (fires on gateway exit only)`

## Decision
**Adopt — no code change needed saat ini.**

Alasan:
1. Idle reaper sudah menangani cleanup dalam 10 menit
2. Orphan bersifat transient, tidak akumulasi
3. Memory impact kecil (~150MB, transient) untuk workload saat ini
4. Risiko perubahan (break LSP for gateway/dashboard sessions) lebih besar dari benefit

**Catatan untuk masa depan:** Jika cron frequency meningkat (tiap 5-15 menit), pertimbangkan tambahkan `shutdown_service()` di `_teardown_cron_agent()` sebagai defense-in-depth.

## Risk
Jika cron jobs menjadi sangat frequent (multiple per hour) dan workspace TypeScript besar, tsserver overlap bisa konsumsi memory signifikan. Monitoring: `ps aux | grep tsserver | grep -v grep | wc -l`

## Lessons Learned
1. `atexit` cleanup tidak cukup untuk resource lifecycle per-session — hanya fires pada process exit
2. Idle reaper adalah safety net yang efektif untuk transient leaks
3. `start_new_session=True` pada LSP spawn adalah tradeoff: mencegah accidental kill tapi memudahkan orphan — harus punya cleanup counterpart

## Next Priority
- Disable + reset-failed 8 systemd units yang tidak relevan (operations cleanup)
- Trim hermes .env komentar dari 413 ke ~50 baris
