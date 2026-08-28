#!/usr/bin/env bash
# lint.sh: 运行 ESLint 检查
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ESLINT="$ROOT_DIR/node_modules/.bin/eslint"
cd "$ROOT_DIR"
"$ESLINT" . --max-warnings=0
