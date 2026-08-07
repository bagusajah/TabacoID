#!/usr/bin/env bash
# Ponytail: one-shot NVMe SMART check. Cron-friendly, exits 0/1/2 for nagios-style monitoring.
# Upgrade to JSON parsing + alerting if thresholds get interesting.
set -euo pipefail

DEVICE="${1:-/dev/nvme0}"

if ! command -v nvme &>/dev/null; then
    echo "ERROR: nvme-cli not installed"
    exit 1
fi

smart=$(sudo nvme smart-log "$DEVICE" 2>&1) || { echo "Failed to read SMART log for $DEVICE"; exit 1; }

temp=$(echo "$smart" | awk -F'[:\t ]+' '/^temperature/ {print $2}')
crit_warn=$(echo "$smart" | awk -F'[:\t ]+' '/^critical_warning/ {print $2}')
pct_used=$(echo "$smart" | awk -F'[:\t ]+' '/^percentage_used/ {print $2}')
spare=$(echo "$smart" | awk -F'[:\t ]+' '/^available_spare\t/ {print $2}')
media_err=$(echo "$smart" | awk -F'[:\t ]+' '/^media_errors/ {print $2}')
unsafe_shut=$(echo "$smart" | awk -F'[:\t ]+' '/^unsafe_shutdowns/ {print $2}')
power_hours=$(echo "$smart" | awk -F'[:\t ]+' '/^power_on_hours/ {print $2}')
power_cycles=$(echo "$smart" | awk -F'[:\t ]+' '/^power_cycles/ {print $2}')

echo "=== NVMe SMART: $DEVICE ==="
echo "Temperature:     ${temp} C"
echo "Critical Warning: ${crit_warn} (0=OK)"
pct_used_clean="${pct_used%\%}"
echo "Wear Level:       ${pct_used_clean}% used"
echo "Spare:            ${spare}"
echo "Media Errors:     ${media_err}"
echo "Unsafe Shutdowns: ${unsafe_shut}"
echo "Power On Hours:   ${power_hours}"
echo "Power Cycles:     ${power_cycles}"

if [ "$crit_warn" -ne 0 ]; then
    echo "ALERT: critical_warning = ${crit_warn}"
    exit 2
fi
if [ "$media_err" -gt 0 ]; then
    echo "ALERT: ${media_err} media errors detected"
    exit 2
fi
if [ "${temp%% *}" -gt 70 ]; then
    echo "WARN: temperature ${temp} exceeds 70 C"
    exit 1
fi

echo "Status: OK"
exit 0
