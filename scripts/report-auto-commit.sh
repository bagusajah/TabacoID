#!/usr/bin/env bash
# Auto-commit untracked engineering reports to git.
# Runs as Hermes cron (no_agent). Prevents report loss on Pi failure.

set -euo pipefail

cd /home/orangepi/TabacoID

# Nothing to do if working tree clean for docs/reports/
if git diff --quiet -- docs/reports/ && git ls-files --others --exclude-standard -- docs/reports/ | grep -q .; then
    : # has untracked files, fall through
elif git diff --quiet -- docs/reports/; then
    echo "No changes in docs/reports/"
    exit 0
fi

# Count what we'll commit
TRACKED_CHANGED=$(git diff --name-only -- docs/reports/ | wc -l)
UNTRACKED=$(git ls-files --others --exclude-standard -- docs/reports/ | wc -l)
TOTAL=$((TRACKED_CHANGED + UNTRACKED))

git add docs/reports/
DATE=$(date -u +%Y-%m-%d)
git commit -m "docs: auto-commit reports ${DATE} (${TOTAL} files)" -- docs/reports/

echo "Committed ${TOTAL} report file(s)"
