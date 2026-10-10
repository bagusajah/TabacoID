#!/usr/bin/env bash
# Auto-commit untracked engineering reports to git.
# Runs as Hermes cron (no_agent). Prevents report loss on Pi failure.

set -euo pipefail

# Refresh LLM usage metrics first (best-effort) so metrics.json ships with every report push
bash "$HOME/.hermes/scripts/export-metrics.sh" >/dev/null 2>&1 || true

cd /home/orangepi/TabacoID

# Nothing to do if working tree clean for docs/ and metrics.json
if git diff --quiet -- docs/ public/metrics.json && git ls-files --others --exclude-standard -- docs/ | grep -q .; then
    : # has untracked files, fall through
elif git diff --quiet -- docs/ public/metrics.json; then
    echo "No changes in docs/ or metrics.json"
    exit 0
fi

# Count what we'll commit
TRACKED_CHANGED=$(git diff --name-only -- docs/reports/ docs/trending/ | wc -l)
UNTRACKED=$(git ls-files --others --exclude-standard -- docs/reports/ docs/trending/ | wc -l)
TOTAL=$((TRACKED_CHANGED + UNTRACKED))

# Regenerate sitemap (includes new reports) so it ships in the same push
python3 /home/orangepi/TabacoID/scripts/gen-sitemap.py
mkdir -p docs/trending

git add docs/reports/ docs/trending/ public/metrics.json public/sitemap.xml
DATE=$(date -u +%Y-%m-%d)
git commit -m "docs: auto-commit reports ${DATE} (${TOTAL} files)" -- docs/reports/ docs/trending/ public/metrics.json public/sitemap.xml
git push origin main

echo "Committed + pushed ${TOTAL} report file(s)"
