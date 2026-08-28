# 演唱会票务平台

React + TypeScript 单仓多包（monorepo）项目，包含：

- **apps/h5** — 移动端售票 H5（`react-vant`，`postcss-px-to-viewport`）
- **apps/admin** — 管理后台 PC（`antd` v6）
- **packages/shared** — 共享类型、常量、工具方法
- **packages/api** — 基于 axios 的 API 客户端封装

## 环境要求

- Node.js ≥ 20.19（推荐 22 LTS）
- npm ≥ 10

## 安装依赖

```bash
npm install
```

## 常用命令

> **重要**：npm 11 在 workspaces 模式下，`npm run <name>` 会自动把该脚本广播到所有 workspace 执行，**与根脚本内容无关**。
> 因此请使用以下任一方式运行根脚本：
>
> ```bash
> # 方式 1：直接调用 shell 脚本（推荐）
> bash scripts/dev.sh
> bash scripts/build.sh
> bash scripts/typecheck.sh
> bash scripts/lint.sh
> bash scripts/format.sh        # 格式化
> bash scripts/format.sh check  # 仅检查
> bash scripts/clean.sh
>
> # 方式 2：通过 npm run 时加 --workspaces=false
> npm run dev --workspaces=false
> npm run build --workspaces=false
> npm run typecheck --workspaces=false
> npm run lint --workspaces=false
>
> # 单独启动
> npm run dev:h5 --workspaces=false
> npm run dev:admin --workspaces=false
> npm run build:h5 --workspaces=false
> npm run build:admin --workspaces=false
> ```

## 目录结构

```
trae-6/
├── apps/
│   ├── h5/          # 移动端 H5（5173 端口）
│   └── admin/       # 管理后台（5174 端口）
├── packages/
│   ├── shared/      # 共享类型与工具
│   └── api/         # API 客户端
├── scripts/         # 构建/检查 shell 脚本（绕过 npm run 广播）
├── package.json     # 根 workspaces 配置
└── tsconfig.base.json
```

## 业务需求

详细需求会在后续对话中分批提供。当前阶段仅完成工程骨架与路由占位页。

## 已构建产物

- `@trae/shared` → ESM + CJS + d.ts
- `@trae/api` → ESM + CJS + d.ts
- `@trae/h5` → Vite 产出的静态资源（dist/）
- `@trae/admin` → Vite 产出的静态资源（dist/）

## 已知限制

- npm 11 在 workspaces 模式下会自动将根 `npm run <script>` 广播到所有 workspace，与根 scripts 内容无关。本项目通过 `scripts/*.sh` 提供绕过方案。
- antd v6 在 ESM 下需用 `import { Card } from 'antd'` 等命名导入。
