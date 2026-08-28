#!/usr/bin/env node
// build-vercel.mjs: 把 admin + h5 两个 SPA 合并成 Vercel 可部署的单一 output
// 布局：
//   <CWD>/.vercel/output/             ← h5（部署在根 /）
//   <CWD>/.vercel/output/admin/       ← admin（部署在 /admin/*）
//
// 调用：
//   node scripts/build-vercel.mjs    （从任意子目录均可，脚本会自动定位仓库根）
//
// 关键：
//   - Vercel 期望 outputDirectory 在 buildCommand 的 cwd 下。
//   - Vercel 的 monorepo 模式会把 cwd 设到某个 workspace（如 apps/admin）。
//   - 我们自动判定仓库根（有 package.json 且含 "workspaces" 字段的那一层）。
//   - 把产物放到 <仓库根>/.vercel/output（确保 outputDirectory 永远相对项目根）
//     然后脚本最后把整个 .vercel/output 复制到 cwd/.vercel/output，兼容 Vercel。
import { execSync } from 'node:child_process'
import { rmSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 向上寻找包含 workspaces 字段的 package.json（仓库根） */
function findRepoRoot(start) {
  let cur = start
  for (let i = 0; i < 8; i++) {
    const pkg = join(cur, 'package.json')
    if (existsSync(pkg)) {
      try {
        const txt = readFileSync(pkg, 'utf8')
        if (/"workspaces"\s*:/.test(txt)) return cur
      } catch {}
    }
    const parent = dirname(cur)
    if (parent === cur) break
    cur = parent
  }
  return null
}

const ROOT = findRepoRoot(__dirname) || findRepoRoot(process.cwd()) || process.cwd()
const OUT = join(ROOT, '.vercel', 'output')
const CWD_OUT = join(process.cwd(), '.vercel', 'output')

console.log('ROOT:', ROOT)
console.log('OUT:', OUT)
console.log('CWD:', process.cwd())

const step = (label) => console.log(`\n==> ${label}`)

function run(cmd, cwd, extraEnv = {}) {
  step(`执行: ${cmd}  (cwd: ${cwd})`)
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...extraEnv } })
  } catch (err) {
    console.error(`\n❌ 命令失败: ${cmd}`)
    console.error(`   status: ${err.status}`)
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

console.log('TSC:', TSC, existsSync(TSC) ? '✅' : '❌ 不存在')
console.log('TSUP:', TSUP, existsSync(TSUP) ? '✅' : '❌ 不存在')
console.log('VITE:', VITE, existsSync(VITE) ? '✅' : '❌ 不存在')

const sharedDir = join(ROOT, 'packages', 'shared')
const apiDir = join(ROOT, 'packages', 'api')
const h5Dir = join(ROOT, 'apps', 'h5')
const adminDir = join(ROOT, 'apps', 'admin')

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

// 同时复制到 cwd/.vercel/output（兼容 Vercel 在子 workspace 跑构建的情况）
if (CWD_OUT !== OUT) {
  step(`同步产物到 ${CWD_OUT}（Vercel cwd）`)
  if (existsSync(CWD_OUT)) rmSync(CWD_OUT, { recursive: true, force: true })
  copyDir(OUT, CWD_OUT)
}

console.log(`\n✅ Vercel 构建产物已就绪：${OUT}`)
if (CWD_OUT !== OUT) console.log(`   同步到 cwd：${CWD_OUT}`)