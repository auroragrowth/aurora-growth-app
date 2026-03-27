#!/bin/bash
# Aurora Growth — Git backup script
# Commits any uncommitted changes and pushes to GitHub.
# Run manually or via cron: 0 2 * * * cd /var/www/aurora-app-dev && bash scripts/backup.sh
set -euo pipefail

LOG="/home/paul/logs/aurora-backup.log"
DIR="/var/www/aurora-app-dev"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$(dirname "$LOG")"

echo "[$TIMESTAMP] Backup starting" >> "$LOG"

cd "$DIR"

# Check for uncommitted changes
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "[$TIMESTAMP] No changes to commit" >> "$LOG"
else
  git add -A
  git commit -m "auto-backup $(date +%Y-%m-%d-%H%M)" --no-verify 2>> "$LOG" || true
  echo "[$TIMESTAMP] Changes committed" >> "$LOG"
fi

# Push to GitHub
git push origin main 2>> "$LOG" && echo "[$TIMESTAMP] Pushed to GitHub" >> "$LOG" || echo "[$TIMESTAMP] Push failed" >> "$LOG"

# Log env vars present (names only, no values)
echo "[$TIMESTAMP] ENV vars set: $(grep -c '=' "$DIR/.env.local" 2>/dev/null || echo 0) entries in .env.local" >> "$LOG"

echo "[$TIMESTAMP] Backup complete" >> "$LOG"
