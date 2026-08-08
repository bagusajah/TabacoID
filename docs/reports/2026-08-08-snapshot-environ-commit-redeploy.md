---
task_id: t_9ace58f6
objective: OBJ-002
date: 2026-08-08
status: draft
---

# Commit _snapshot_environ Fix dan Redeploy Dashboard

## Engineering Question
Task sebelumnya (t_89876697) menulis fix untuk KeyError `HERMES_KANBAN_BOARD` race condition ke disk, tapi apakah fix tersebut benar-benar aktif di production?

## Method
1. Cek `errors.log` untuk KeyError timestamps setelah fix ditulis (~13:20 WIB)
2. Trace git status file `tools/environments/local.py` — committed atau working tree only?
3. Cek apakah service yang sedang running (start 01:37) loaded code lama atau baru
4. Run stress test untuk verify fix correctness
5. Commit fix, restart services yang bisa di-restart

## Findings (with measurements)

**Root cause ditemukan:** Fix dari task t_89876697 tidak pernah di-commit ke git dan service production tidak pernah di-restart.

| Metric | Before | After |
|--------|--------|-------|
| Fix in git | ❌ working tree only | ✅ committed (0c284ebf0) |
| Dashboard code | old `dict(os.environ \| env)` | new `_snapshot_environ()` |
| Dashboard start time | 01:37:31 WIB | 21:01:43 WIB (restarted) |
| KeyError total count | 11 | 11 (0 new since restart) |
| Post-fix production errors | 2 (19:16, 19:54 WIB) | 0 |
| Stress test (5000 iterations) | 0 failures | 0 failures |

**Timeline KeyError:**
- 01:30, 02:25, 12:50 — sebelum fix ditulis
- 19:16, 19:54 — **setelah fix ditulis**, bukti production running old code
- 21:01+ — 0 errors setelah dashboard restart

**Gateway limitation:** Gateway restart di-block oleh security guard (`cannot restart or stop the gateway from inside the gateway process`). Gateway masih running code lama, akan pick up fix pada natural restart berikutnya. KeyError di gateway bersifat non-fatal (tool auto-retry succeeds).

## Decision
**Adopt** — Fix committed dan dashboard redeployed. Gateway deferred to natural restart.

## Risk
- Gateway masih running old code → KeyError bisa terjadi di gateway-spawned tool calls sampai natural restart. Risk rendah karena gateway jarang melakukan concurrent env mutation dengan density yang sama sebagai dashboard cron.
- Jika gateway perlu segera di-restart, user harus jalankan `hermes gateway restart` dari shell terpisah.

## Lessons Learned
1. **"Done" tanpa redeploy = belum selesai.** Task t_89876697 marked done dengan verification test yang run di fresh process, tapi production services tetap running old code. Verification harus include production deployment check.
2. **Code di working tree ≠ code di production.** Git status check harus jadi bagian dari "done" criteria untuk code fixes.
3. **Dashboard restart berhasil, gateway guard-blocked** — known limitation, bukan failure.

## Next Priority
- Monitor `errors.log` untuk KeyError setelah gateway natural restart
- Consider adding "is fix deployed?" checklist item ke executor procedure
