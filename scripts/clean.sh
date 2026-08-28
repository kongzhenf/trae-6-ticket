#!/usr/bin/env bash
# clean.sh: 清理构建产物
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RIMRAF="$ROOT_DIR/node_modules/.bin/rimraf"
cd "$ROOT_DIR"
"$RIMRAF" "**/dist" "**/.turbo" "**/.tsbuildinfo" "**/node_modules/.cache"
