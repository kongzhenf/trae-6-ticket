#!/usr/bin/env bash
# build.sh: 构建 packages 与 apps
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TSC="$ROOT_DIR/node_modules/.bin/tsc"
TSUP="$ROOT_DIR/node_modules/.bin/tsup"
VITE="$ROOT_DIR/node_modules/.bin/vite"

cd "$ROOT_DIR"

echo "==> [1/4] build @trae/shared"
( cd packages/shared && "$TSUP" )

echo "==> [2/4] build @trae/api"
( cd packages/api && "$TSUP" )

echo "==> [3/4] build @trae/h5"
( cd apps/h5 && "$TSC" -b --noEmit && "$VITE" build )

echo "==> [4/4] build @trae/admin"
( cd apps/admin && "$TSC" -b --noEmit && "$VITE" build )

echo "==> all builds completed"
