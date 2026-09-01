#!/usr/bin/env bash
# Publish the single-file portal to Vercel.
#
# The portal is deployed from site/ rather than the repository root: Vercel
# detects frontend/ as Next.js and backend/ as FastAPI and treats them as
# services, which cannot be combined with a top-level build config. Deploying
# a directory that contains only the built page avoids that entirely.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p site
cp inspection-portal.html site/index.html
cd site
npx --yes vercel@latest deploy --prod --yes
