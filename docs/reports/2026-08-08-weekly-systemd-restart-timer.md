---
task_id: t_f715aff5
objective: OBJ-002
experiment: null
date: 2026-08-08
status: draft
human_review: autonomous
---

# Weekly Systemd Restart Timer untuk Hermes Services

## Engineering Question
Memory growth step-function di hermes-dashboard (666→809MB/5d) dan hermes-gateway (384→690MB/4d) bukan acute leak tapi residual allocation yang lambat ter-GC. Bisakah weekly restart timer memitigasi ini tanpa intervention manual?

## Method
Setup systemd user timer (`hermes-weekly-restart.timer`) + oneshot service (`hermes-weekly-restart.service`) yang restart kedua services secara sequential: gateway dulu (supaya dashboard bisa reconnect), kemudian dashboard. Schedule Sunday 03:00 WIB — lowest traffic window. Karena kedua services punya `Restart=always`, kill/restart triggers immediate respawn dengan fresh state.

## Findings (with measurements)

**Timer/service setup:**
- `hermes-weekly-restart.timer`: enabled, active (waiting)
- Next trigger: Sun 2026-08-09 03:00:00 WIB (1 day 2h left)
- `hermes-weekly-restart.service`: oneshot, last run exit status=0/SUCCESS
- Both `ExecStart` lines completed: gateway restart + dashboard restart

**Memory before/after (immediate post-restart):**
- gateway RSS: 690MB (pre-restart, 4d uptime) → 457.6MB (fresh, 10min uptime)
  - Reduction: **232.4MB (-33.7%)**
- dashboard RSS: 809MB (pre-restart, 5d uptime) → 122.6MB (fresh, 10min uptime)
  - Reduction: **686.4MB (-84.9%)**

**Files:**
- `~/.config/systemd/user/hermes-weekly-restart.service` (507 bytes)
- `~/.config/systemd/user/hermes-weekly-restart.timer` (282 bytes)

## Decision
**Adopt.** Timer aktif dan verified. Weekly restart akan menjaga memory footprint kedua services di bawah threshold masif. Dashboard reduction paling dramatis (-84.9%) menunjukkan residual allocation paling besar ada di dashboard process. No new dependencies, pure systemd config — ponytail approach: native platform feature over custom cron/script.

## Risk
- Restart gateway selama active WhatsApp session bisa briefly drop connection (~3-5s). Mitigated: Sunday 03:00 WIB = lowest traffic.
- Jika ada long-running operation saat restart, akan terinterrupt. Risiko rendah pada jam tersebut.
- Timer menggunakan `Persistent=true` — jika host down saat scheduled time, timer fires immediately on next boot.

## Lessons Learned
- Task `t_f715aff5` ditinggalkan dalam status `running` oleh executor sebelumnya setelah work selesai. Root cause: executor session terminated tanpa menyelesaikan step complete/report. Ini blocking issue untuk cycle — task stuck di running mencegah executor lain pick up work. **Recommendation:** tambahkan stale-task reaper di planner (auto-complete atau re-queue tasks yang running > 1 hour tanpa heartbeat).

## Next Priority
- Monitor memory growth curve post-weekly-restart untuk validate bahwa 7-day cycle cukup (apakah growth linear hingga melebihi budget sebelum weekly restart?).
- Consider more granular restart schedule jika growth rate terlalu cepat (e.g., biweekly).
