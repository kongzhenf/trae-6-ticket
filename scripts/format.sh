#!/usr/bin/env bash
# format.sh: 运行 Prettier 格式化
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PRETTIER="$ROOT_DIR/node_modules/.bin/prettier"
cd "$ROOT_DIR"

if [ "${1:-}" = "check" ]; then
  exec "$PRETTIER" --check "**/*.{ts,tsx,js,jsx,json,css,md}"
else
  exec "$PRETTIER" --write "**/*.{ts,tsx,js,jsx,json,css,md}"
fi
