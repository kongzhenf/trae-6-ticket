#!/usr/bin/env node
// build-vercel.mjs: 把 admin + h5 两个 SPA 合并成 Vercel 可部署的单一 output
// 布局：
//   .vercel/output/                ← h5（部署在根 /）
//   .vercel/output/admin/          ← admin（部署在 /admin/*）
//
// 调用：
//   node scripts/build-vercel.mjs    （从任意子目录均可）
import { execSync } from 'node:child_process'
import { rmSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const step = (label) => console.log(`\n==> ${label}`)

function run(cmd, cwd, extraEnv = {}) {
  step(`执行: ${cmd}  (cwd: ${cwd})`)
  try {
    execSync(cmd, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
    })
  } catch (err) {
    console.error(`\n❌ 命令失败: ${cmd}`)
    console.error(`   status: ${err.status}`)
    console.error(`   signal: ${err.signal}`)
    if (err.stdout) console.error(`   stdout: ${err.stdout.toString().slice(-500)}`)
    if (err.stderr) console.error(`   stderr: ${err.stderr.toString().slice(-500)}`)
    process.exit(err.status ?? 1)
  }
}

function copyDir(src, dst) {
  if (!existsSync(src)) {
    console.error(`❌ 源目录不存在: ${src}`)
    process.exit(1)
  }
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true })
  cpSync(src, dst, { recursive: true })
}

const TSC = join(ROOT, 'node_modules', '.bin', 'tsc')
const TSUP = join(ROOT, 'node_modules', '.bin', 'tsup')
const VITE = join(ROOT, 'node_modules', '.bin', 'vite')

console.log('ROOT:', ROOT)
console.log('TSC:', TSC, existsSync(TSC) ? '✅' : '❌ 不存在')
console.log('TSUP:', TSUP, existsSync(TSUP) ? '✅' : '❌ 不存在')
console.log('VITE:', VITE, existsSync(VITE) ? '✅' : '❌ 不存在')

const sharedDir = join(ROOT, 'packages', 'shared')
const apiDir = join(ROOT, 'packages', 'api')
const h5Dir = join(ROOT, 'apps', 'h5')
const adminDir = join(ROOT, 'apps', 'admin')
const OUT = join(ROOT, '.vercel', 'output')

step('[1/5] build @trae/shared')
run(`"${TSUP}"`, sharedDir)

step('[2/5] build @trae/api')
run(`"${TSUP}"`, apiDir)

step('[3/5] build @trae/h5（base = /）')
run(`"${VITE}" build`, h5Dir)

step('[4/5] build @trae/admin（base = /admin/）')
run(`"${VITE}" build`, adminDir, { VITE_PUBLIC_BASE: '/admin/' })

step('[5/5] 合并到 .vercel/output')
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

copyDir(join(h5Dir, 'dist'), OUT)
copyDir(join(adminDir, 'dist'), join(OUT, 'admin'))

const demoHtml = join(OUT, 'iphone17pro-demo.html')
if (existsSync(demoHtml)) {
  rmSync(demoHtml)
  step('已移除调试产物 iphone17pro-demo.html')
}

console.log(`\n✅ Vercel 构建产物已就绪：${OUT}`)