#!/usr/bin/env bash
# Publish the single-file portal to Vercel.
#
# The portal deploys from site/ rather than the repository root: Vercel detects
# frontend/ as Next.js and backend/ as FastAPI and treats them as services,
# which cannot be combined with a top-level build config. A directory holding
# only the built page avoids that entirely — set the Vercel project's Root
# Directory to "site".
#
# Default route is Git: this script refreshes site/index.html, commits it and
# pushes to the portal remote, and Vercel's GitHub integration builds from
# there. That needs no Vercel credentials on this machine.
#
#   ./deploy.sh              refresh, commit and push to portal/main
#   ./deploy.sh --cli        upload site/ straight from the Vercel CLI instead
#                            (needs `vercel login` first)
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p site
cp inspection-portal.html site/index.html

if [ "${1:-}" = "--cli" ]; then
  cd site
  exec npx --yes vercel@latest deploy --prod --yes
fi

if git diff --quiet -- site/index.html; then
  echo "site/index.html is already up to date."
else
  git add site/index.html
  git commit -m "Refresh the deployed page from inspection-portal.html"
fi

git push portal HEAD:main
echo "Pushed to portal/main — Vercel builds from there."
