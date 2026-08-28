#!/usr/bin/env bash
# dev.sh: 启动 H5 与 Admin 开发服务器
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VITE="$ROOT_DIR/node_modules/.bin/vite"
CONCURRENTLY="$ROOT_DIR/node_modules/.bin/concurrently"

cd "$ROOT_DIR"
exec "$CONCURRENTLY" -n h5,admin -c blue,magenta \
  "(cd apps/h5 && $VITE)" \
  "(cd apps/admin && $VITE)"
