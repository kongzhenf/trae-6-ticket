#!/usr/bin/env sh
# build-vercel.sh: 把 admin + h5 两个 SPA 合并成 Vercel 可部署的单一 output
# 布局：
#   .vercel/output/                ← h5（部署在根 /）
#   .vercel/output/admin/          ← admin（部署在 /admin/*）
#
# 调用：
#   sh scripts/build-vercel.sh    （POSIX sh，兼容 Vercel 镜像）
#
# 注意：用 sh 而非 bash，确保在 alpine / distroless 等最小镜像里也能跑
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TSC="$ROOT_DIR/node_modules/.bin/tsc"
TSUP="$ROOT_DIR/node_modules/.bin/tsup"
VITE="$ROOT_DIR/node_modules/.bin/vite"
OUT="$ROOT_DIR/.vercel/output"

cd "$ROOT_DIR"

echo "==> [1/5] build @trae/shared"
( cd packages/shared && "$TSUP" )

echo "==> [2/5] build @trae/api"
( cd packages/api && "$TSUP" )

echo "==> [3/5] build @trae/h5（base = /）"
( cd apps/h5 && "$TSC" -b --noEmit && "$VITE" build )

echo "==> [4/5] build @trae/admin（base = /admin/）"
( cd apps/admin && "$TSC" -b --noEmit && VITE_PUBLIC_BASE=/admin/ "$VITE" build )

echo "==> [5/5] 合并到 .vercel/output"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$ROOT_DIR/apps/h5/dist/." "$OUT/"

mkdir -p "$OUT/admin"
cp -R "$ROOT_DIR/apps/admin/dist/." "$OUT/admin/"

if [ -f "$OUT/iphone17pro-demo.html" ]; then
  rm -f "$OUT/iphone17pro-demo.html"
  echo "==> 已移除调试产物 iphone17pro-demo.html"
fi

echo "==> 输出目录结构："
( cd "$OUT" && find . -maxdepth 2 -type d -o -name "index.html" | sort )

echo "==> Vercel 构建产物已就绪：$OUT"