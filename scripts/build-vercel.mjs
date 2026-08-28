#!/usr/bin/env node
// build-vercel.mjs: 把 admin + h5 两个 SPA 合并成 Vercel 可部署的单一 output
// 完全用 Node 实现，绕开 shell，兼容 Vercel 的 alpine 镜像
//
// 布局：
//   .vercel/output/                ← h5（部署在根 /）
//   .vercel/output/admin/          ← admin（部署在 /admin/*）
//
// 调用：
//   node scripts/build-vercel.mjs
import { execSync } from 'node:child_process'
import { rmSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const TSC = join(ROOT, 'node_modules', '.bin', 'tsc')
const TSUP = join(ROOT, 'node_modules', '.bin', 'tsup')
const VITE = join(ROOT, 'node_modules', '.bin', 'vite')
const OUT = join(ROOT, '.vercel', 'output')

const run = (cmd, cwd) => {
  console.log(`==> ${cmd}  (cwd: ${cwd ?? ROOT})`)
  execSync(cmd, { cwd: cwd ?? ROOT, stdio: 'inherit', env: { ...process.env, VITE_PUBLIC_BASE: '/admin/' } })
}

const copyDir = (src, dst) => {
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true })
  cpSync(src, dst, { recursive: true })
}

console.log('==> [1/5] build @trae/shared')
run(`"${TSUP}"`, join(ROOT, 'packages', 'shared'))

console.log('==> [2/5] build @trae/api')
run(`"${TSUP}"`, join(ROOT, 'packages', 'api'))

console.log('==> [3/5] build @trae/h5（base = /）')
run(`"${TSC}" -b --noEmit && "${VITE}" build`, join(ROOT, 'apps', 'h5'))

console.log('==> [4/5] build @trae/admin（base = /admin/）')
run(`"${TSC}" -b --noEmit && "${VITE}" build`, join(ROOT, 'apps', 'admin'))

console.log('==> [5/5] 合并到 .vercel/output')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
copyDir(join(ROOT, 'apps', 'h5', 'dist'), OUT)
copyDir(join(ROOT, 'apps', 'admin', 'dist'), join(OUT, 'admin'))

const demoHtml = join(OUT, 'iphone17pro-demo.html')
if (existsSync(demoHtml)) {
  rmSync(demoHtml)
  console.log('==> 已移除调试产物 iphone17pro-demo.html')
}

console.log(`==> Vercel 构建产物已就绪：${OUT}`)