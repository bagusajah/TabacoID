#!/usr/bin/env bash
# Auto-commit untracked engineering reports to git.
# Runs as Hermes cron (no_agent). Prevents report loss on Pi failure.

set -euo pipefail

# Refresh LLM usage metrics first (best-effort) so metrics.json ships with every report push
bash "$HOME/.hermes/scripts/export-metrics.sh" >/dev/null 2>&1 || true

cd /home/orangepi/TabacoID

# Regenerate sitemap + trending-index on EVERY run (before the early-exit check)
# so freshness does not depend on this script being the one that commits:
# reports committed directly by the agent lane skip the commit path below,
# which left 2026-10-17 reports out of sitemap.xml until the next day, and
# left trending-index.json stale twice (13→19 Nov, 19→21 Nov 2026) because
# Vercel builds don't run gen-trending-index.py.
python3 /home/orangepi/TabacoID/scripts/gen-sitemap.py || true
python3 /home/orangepi/TabacoID/scripts/gen-trending-index.py || true

# Nothing to do if no tracked diffs AND no untracked docs (new reports)
# BATON.md included: agents that finish without committing their baton update
# (failed patch / iteration limit) strand it — observed 2x on 2026-10-24.
if git diff --quiet -- docs/ public/metrics.json public/sitemap.xml public/trending-index.json BATON.md && \
   ! git ls-files --others --exclude-standard -- docs/ | grep -q .; then
    echo "No changes in docs/, sitemap.xml, trending-index.json, or metrics.json"
    exit 0
fi

# Count what we'll commit — porcelain on the exact paths we add, so metrics.json/
# sitemap-only refreshes count too (old counter only looked at docs/, so those
# pushes were mislabelled "(0 files)"; 18 of 30 commits in Nov 8–22 2026).
TOTAL=$(git status --porcelain -- docs/reports/ docs/trending/ docs/ambience/ public/metrics.json public/sitemap.xml public/trending-index.json BATON.md | wc -l)

# Regenerate sitemap + trending index (includes new reports) so they ship in the same push
python3 /home/orangepi/TabacoID/scripts/gen-sitemap.py
python3 /home/orangepi/TabacoID/scripts/gen-trending-index.py
mkdir -p docs/trending docs/ambience

git add docs/reports/ docs/trending/ docs/ambience/ public/metrics.json public/sitemap.xml public/trending-index.json BATON.md
DATE=$(date -u +%Y-%m-%d)
git commit -m "docs: auto-commit reports ${DATE} (${TOTAL} files)" -- docs/reports/ docs/trending/ docs/ambience/ public/metrics.json public/sitemap.xml public/trending-index.json BATON.md

# Push with one rebase retry: other agents push between slots and a bare push
# fails "fetch first" (7x in Nov 8-22 2026, incl. 4 runs dead in a row on Nov 22
# 09:30-13:30 — reports only shipped 3h late on the next slot's success).
if ! git push origin main; then
    git pull --rebase -q origin main || { echo "rebase failed, push abandoned"; exit 1; }
    git push origin main
fi

echo "Committed + pushed ${TOTAL} report file(s)"
