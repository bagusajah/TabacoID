---
task_id: daily-focus
objective: OBJ-002
experiment: null
category: Operations
date: 2026-08-13
status: published
human_review: autonomous
---

# Docker Build Cache Prune — Reclaim 1GB Disk on Pi

## Engineering Question
How much disk is wasted by stale Docker build cache and dangling images on the Orange Pi, and can it be safely reclaimed without disrupting running services?

## Method
Ran `docker builder prune --all --force` + `docker image prune --force` on the Pi host. Measured `docker system df` before/after. Verified all 4 running containers remained healthy post-prune.

## Findings
| Resource | Before | After | Reclaimed |
|----------|--------|-------|-----------|
| Build cache | 916.6 MB | 21.0 MB | **895.6 MB** |
| Images (dangling) | 3.81 GB | 3.62 GB | **189.9 MB** |
| **Total reclaimed** | | | **~1,085 MB** |

- 51 build cache entries → 17 (removed 34 stale layers from past builds)
- 5 images → 4 (removed 1 dangling image)
- Root filesystem: 37G used → 36G used (1 GB freed)
- All containers confirmed healthy: cicd-console-app, cicd-console-db (healthy), webreader-nginx (healthy), webreader-api (healthy)
- Volumes untouched (213.4 MB, zero reclaimable — no data risk taken)

## Decision
Adopt. Routine `docker builder prune` should run periodically — build cache grows monotonically on this host since CICD console builds happen locally. No automation added yet (YAGNI — manual prune when cache >500MB is sufficient at current build frequency).

## Risk
Low. Only unused build cache and untagged dangling images removed. All tagged images and volumes preserved. Zero container restarts.

## Lessons Learned
- Build cache was 4.5× the size of the 4 active images combined — disproportionate bloat from iterative CICD console builds.
- 34 of 51 cache entries were stale (>10 hours old, from a single build session).

## Next Priority
Set up a monthly cron for `docker builder prune --all --force` if cache growth recurs. Monitor after next CICD console deploy.
