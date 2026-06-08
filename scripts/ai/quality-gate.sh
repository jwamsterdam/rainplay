#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gate..."

if [ -f package.json ]; then
  npm run lint --if-present
  npm run typecheck --if-present
  npm test --if-present
  npm run build --if-present
fi

echo "Quality gate passed."