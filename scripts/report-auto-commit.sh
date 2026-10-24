#!/usr/bin/env bash
# Auto-commit untracked engineering reports to git.
# Runs as Hermes cron (no_agent). Prevents report loss on Pi failure.

set -euo pipefail

# Refresh LLM usage metrics first (best-effort) so metrics.json ships with every report push
bash "$HOME/.hermes/scripts/export-metrics.sh" >/dev/null 2>&1 || true

cd /home/orangepi/TabacoID

# Regenerate sitemap on EVERY run (before the early-exit check) so sitemap
# freshness does not depend on this script being the one that commits:
# reports committed directly by the agent lane skip the commit path below,
# which left 2026-10-17 reports out of sitemap.xml until the next day.
python3 /home/orangepi/TabacoID/scripts/gen-sitemap.py || true

# Nothing to do if no tracked diffs AND no untracked docs (new reports)
# BATON.md included: agents that finish without committing their baton update
# (failed patch / iteration limit) strand it — observed 2x on 2026-10-24.
if git diff --quiet -- docs/ public/metrics.json public/sitemap.xml BATON.md && \
   ! git ls-files --others --exclude-standard -- docs/ | grep -q .; then
    echo "No changes in docs/, sitemap.xml, or metrics.json"
    exit 0
fi

# Count what we'll commit
TRACKED_CHANGED=$(git diff --name-only -- docs/reports/ docs/trending/ docs/ambience/ | wc -l)
UNTRACKED=$(git ls-files --others --exclude-standard -- docs/reports/ docs/trending/ docs/ambience/ | wc -l)
TOTAL=$((TRACKED_CHANGED + UNTRACKED))

# Regenerate sitemap (includes new reports) so it ships in the same push
python3 /home/orangepi/TabacoID/scripts/gen-sitemap.py
mkdir -p docs/trending docs/ambience

git add docs/reports/ docs/trending/ docs/ambience/ public/metrics.json public/sitemap.xml BATON.md
DATE=$(date -u +%Y-%m-%d)
git commit -m "docs: auto-commit reports ${DATE} (${TOTAL} files)" -- docs/reports/ docs/trending/ docs/ambience/ public/metrics.json public/sitemap.xml BATON.md
git push origin main

echo "Committed + pushed ${TOTAL} report file(s)"
