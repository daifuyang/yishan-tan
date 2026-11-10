#!/usr/bin/env bash
# Build a static SPA preview and deploy it to EdgeOne Makers.
# Does NOT touch the Nitro / FC3 build chain or the existing FC3 site.
#
# Usage:
#   EDGEONE_API_TOKEN=<token> bash deploy/edgeone/deploy.sh [project-name]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WORK="$ROOT/.edgeone-deploy"
PROJECT="${1:-yishan-tan-edgeone}"

if [[ -z "${EDGEONE_API_TOKEN:-}" ]]; then
  echo "EDGEONE_API_TOKEN is required" >&2
  exit 1
fi

rm -rf "$WORK"
mkdir -p "$WORK"
for f in tsconfig.json components.json openapi.generated.json; do
  cp "$ROOT/$f" "$WORK/$f"
done
for d in src db public scripts; do
  cp -r "$ROOT/$d" "$WORK/$d"
done
cp "$HERE/vite.config.ts" "$WORK/vite.config.ts"

# Preview-only overrides: never written back to the repo.
# Makes /admin degrade to /login instead of crashing on missing server functions.
if [[ -d "$HERE/overrides" ]]; then
  cp -r "$HERE/overrides/." "$WORK/"
fi

# Resolves dependencies from the parent repo's node_modules.
(cd "$WORK" && NODE_ENV=production node "$ROOT/node_modules/vite/bin/vite.js" build)

# TanStack Start SPA mode emits _shell.html; Makers needs index.html as entry.
cp "$WORK/dist/client/_shell.html" "$WORK/dist/client/index.html"
cp "$HERE/edgeone.json" "$WORK/dist/client/edgeone.json"

(cd "$WORK/dist/client" && edgeone makers deploy \
  -t "$EDGEONE_API_TOKEN" -n "$PROJECT" -e production --json)
