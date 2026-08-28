#!/usr/bin/env bash
# typecheck.sh: 类型检查所有子包
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TSC="$ROOT_DIR/node_modules/.bin/tsc"

cd "$ROOT_DIR"

echo "==> [1/4] typecheck @trae/shared"
( cd packages/shared && "$TSC" --noEmit )

echo "==> [2/4] typecheck @trae/api"
( cd packages/api && "$TSC" --noEmit )

echo "==> [3/4] typecheck @trae/h5"
( cd apps/h5 && "$TSC" -b --noEmit )

echo "==> [4/4] typecheck @trae/admin"
( cd apps/admin && "$TSC" -b --noEmit )

echo "==> all typechecks passed"
