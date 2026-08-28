# 演唱会票务平台 - 项目初始化实施方案

> 工作目录根：`/Users/kzf/Documents/trae-6`
> 本计划只覆盖工程骨架与路由占位页，**不涉及任何业务实现**。详细需求由用户在后续对话中分批提供。

---

## 0. 重要前置说明（执行前请确认）

### 0.1 关于 "Vant 5"

"Vant"（npm 包名 `vant`）是有赞维护的 **Vue 3** 移动端组件库，**React 生态中没有 "Vant 5" 这个库**。本计划的默认选择：

| 候选 | 状态 | 与用户原意匹配度 |
|---|---|---|
| `react-vant`（基于 Vant 视觉规范移植到 React） | 社区维护，最近一次发版 2024；进入"仅修 bug"模式 | ★★★★ 视觉/API 最接近 "Vant" |
| `antd-mobile` v5（Ant Design 官方 React 移动端） | 月度小版本发布，生态完整 | ★★★ 视觉不同源，但与后台 `antd` 设计语言统一，长期更稳 |

**默认采用 `react-vant`**。如果后续需要换 `antd-mobile`，仅需替换 H5 的依赖与组件导入，目录结构、共享层、API 包均不受影响。

### 0.2 用户已确认决策

| 决策项 | 选型 |
|---|---|
| 结构 | 单仓多包 monorepo |
| 语言 | TypeScript |
| H5 UI | `react-vant`（Vant 视觉规范的 React 实现） |
| 后台 UI | `antd` v6 |
| 包管理器 | npm（使用 `npm workspaces`） |

---

## 1. 版本选型（2026 年现状）

| 维度 | 版本 | 依据 |
|---|---|---|
| Node.js | ≥22.12 LTS | Vite 7 要求；与 npm 10+ 配套 |
| npm | ≥10.x | Node 22 自带；原生 workspaces |
| 构建工具 | Vite ^7.0 | 2026 稳定主版本，Rolldown 路线进展稳定 |
| React | ^18.3.1 | AntD v6 最低支持；规避 React 19 生态噪音 |
| React Router | ^7.x（经典模式） | 经典 `<BrowserRouter>` + `<Routes>`，上手成本最低 |
| TypeScript | ^5.6 | 与 Vite 7 兼容区间 |
| H5 UI | `react-vant` ^3.x | 与 Vant 视觉对齐 |
| 后台 UI | `antd` ^6.5 | 2025-11 发布，最低 React 18，原生 CSS Variables |
| HTTP | axios ^1.7 | 主流稳定 |
| 状态管理 | zustand ^5 | 轻量、TS 友好 |
| 并发脚本 | concurrently ^9 | 跨平台并行执行 npm scripts |
| 共享包构建 | tsup ^8 | 对 ESM/CJS/d.ts 三输出成熟 |
| 代码规范 | ESLint ^9 + Prettier ^3 | 2025-2026 主流 |

---

## 2. 完整目录结构

```
/Users/kzf/Documents/trae-6/
├── package.json                     # 根：声明 workspaces、scripts、devDeps
├── package-lock.json
├── .npmrc                           # workspaces=true
├── .gitignore
├── .editorconfig
├── .nvmrc                           # 22
├── .prettierrc.json
├── eslint.config.js                 # ESLint 9 flat config（根共享）
├── tsconfig.base.json               # 全局 TS 编译选项
├── tsconfig.json                    # 根：仅 references，不参与编译
├── README.md
│
├── apps/
│   ├── h5/                          # 移动端 H5
│   │   ├── package.json             # name: @trae/h5
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts           # port=5173, alias, proxy /api
│   │   ├── postcss.config.cjs       # px-to-viewport（viewportWidth=375）
│   │   ├── index.html
│   │   ├── .env.development
│   │   ├── .env.production
│   │   ├── public/favicon.svg
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── styles/{reset.css, global.css}
│   │       ├── router/index.tsx
│   │       ├── layouts/{RootLayout.tsx, TabBarLayout.tsx}
│   │       ├── pages/
│   │       │   ├── Home/index.tsx              # 首页/演出列表
│   │       │   ├── ConcertDetail/index.tsx
│   │       │   ├── TicketTier/index.tsx        # 票档选择
│   │       │   ├── OrderCreate/index.tsx
│   │       │   ├── OrderDetail/index.tsx
│   │       │   ├── Profile/index.tsx           # 个人中心
│   │       │   └── Login/index.tsx
│   │       └── components/Placeholder.tsx
│   │
│   └── admin/                       # 管理后台 PC
│       ├── package.json             # name: @trae/admin
│       ├── tsconfig.json
│       ├── vite.config.ts           # port=5174, alias, proxy /api
│       ├── index.html
│       ├── .env.development
│       ├── .env.production
│       ├── public/favicon.svg
│       └── src/
│           ├── main.tsx             # ConfigProvider(zhCN) + RouterProvider
│           ├── App.tsx
│           ├── styles/global.css
│           ├── router/index.tsx
│           ├── layouts/{BasicLayout.tsx, BlankLayout.tsx}
│           ├── pages/
│           │   ├── Login/index.tsx
│           │   ├── Dashboard/index.tsx
│           │   ├── ConcertList/index.tsx
│           │   ├── ConcertEdit/index.tsx    # 含票档配置占位
│           │   ├── OrderManage/index.tsx
│           │   └── UserManage/index.tsx
│           └── components/Placeholder.tsx
│
└── packages/
    ├── shared/                      # 共享类型/常量/工具
    │   ├── package.json             # name: @trae/shared
    │   ├── tsconfig.json            # composite: true, declaration: true
    │   ├── tsup.config.ts
    │   └── src/
    │       ├── index.ts
    │       ├── types/
    │       │   ├── common.ts        # ApiResponse<T>, PageResult<T>, PageQuery
    │       │   ├── concert.ts       # Concert, Artist, Venue, ConcertStatus
    │       │   ├── ticket.ts        # TicketTier, TicketTierStatus
    │       │   ├── order.ts         # Order, OrderItem, OrderStatus
    │       │   └── user.ts          # User, UserProfile, LoginPayload
    │       ├── constants/
    │       │   ├── orderStatus.ts
    │       │   ├── ticketStatus.ts
    │       │   └── routes.ts        # 路由 path 常量集中管理
    │       └── utils/
    │           ├── format.ts        # 日期/金额/手机号格式化
    │           ├── validators.ts
    │           └── storage.ts       # localStorage/sessionStorage 封装
    │
    └── api/                         # API 客户端封装
        ├── package.json             # name: @trae/api, peerDeps: axios
        ├── tsconfig.json
        ├── tsup.config.ts
        └── src/
            ├── index.ts
            ├── client.ts            # createApiClient 工厂
            ├── interceptors.ts      # request/response 拦截器
            ├── modules/
            │   ├── concert.ts      # listConcert/getConcertDetail/createConcert (占位签名)
            │   ├── order.ts        # createOrder/getOrderDetail/listOrders
            │   ├── user.ts         # login/logout/getCurrentUser
            │   └── upload.ts       # uploadFile
            └── types/request.ts
```

---

## 3. 关键文件用途速查

### 3.1 根级

- `package.json`：声明 `workspaces: ["apps/*", "packages/*"]`，根级 scripts：`dev`、`dev:h5`、`dev:admin`、`build`、`build:shared`、`build:api`、`lint`、`format`、`typecheck`、`clean`
- `tsconfig.base.json`：`strict`、`target ES2022`、`jsx react-jsx`、`moduleResolution: Bundler`、`paths` 预留 `@trae/shared`、`@trae/api`
- `tsconfig.json`：根仅作 `references`，`files: []`
- `eslint.config.js`：ESLint 9 flat config，启用 React Hooks + React Refresh 规则
- `.prettierrc.json`：单引号、无分号、宽度 100、`trailingComma: all`
- `.nvmrc`：`22`

### 3.2 H5 应用 `apps/h5`

- `vite.config.ts`：plugin-react-swc、alias（`@trae/shared`、`@trae/api`）、port=5173、proxy `/api`
- `postcss.config.cjs`：`postcss-px-to-viewport`（viewportWidth=375，exclude `/node_modules\/(react-vant)/`）
- `index.html` viewport meta：`width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover`
- `router/index.tsx`：见 §4.1
- `layouts/RootLayout.tsx`：顶栏 + `<Outlet/>` + 底栏
- `layouts/TabBarLayout.tsx`：含底部 TabBar（首页 / 我的）
- `pages/*/index.tsx`：每个占位页用 `<Placeholder title="..." />`
- `.env.development`：`VITE_API_BASE_URL=/api`、`VITE_APP_TITLE=演唱会票务`

### 3.3 Admin 应用 `apps/admin`

- `vite.config.ts`：plugin-react-swc、alias、port=5174、proxy `/api`
- `main.tsx`：`ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}` 包裹 `<RouterProvider/>`
  - **注意**：antd v6 已原生 tree-shaking（CSS-in-JS），**无需** import `'antd/dist/reset.css'`，也无需 `babel-plugin-import`
- `router/index.tsx`：见 §4.2
- `layouts/BasicLayout.tsx`：antd `Layout`（侧边 `Menu` + Header + Content）
- `layouts/BlankLayout.tsx`：登录页用
- `pages/*/index.tsx`：antd `Card` + `Typography` + 占位提示

### 3.4 共享包 `packages/shared`

- `package.json`：`main`/`module`/`types` 指向 `dist/`，scripts: `build`、`dev: tsup --watch`、`typecheck`
- `tsup.config.ts`：`entry: ['src/index.ts']`、`format: ['esm', 'cjs']`、`dts: true`、`clean: true`
- `tsconfig.json`：`extends: ../../tsconfig.base.json`，`composite: true`，`declaration: true`，`outDir: ./dist`

### 3.5 API 包 `packages/api`

- `client.ts`：`createApiClient({ baseURL, timeout?, getToken?, onUnauthorized?, onError? })` 工厂
  - 让 H5 与 Admin 共享 axios，错误处理各自注入（Admin 用 antd `message`，H5 用 react-vant `showToast` 或自写 toast）
- `interceptors.ts`：默认 request 拦截器注入 token，response 拦截器统一处理 `code !== 0`
- `modules/*.ts`：API 函数签名（占位实现返回 `Promise.resolve(mock)`）

---

## 4. 路由骨架设计

### 4.1 H5 路由

```
/ → RootLayout
├── /                              → TabBarLayout
│   ├── (home) /                   → Home（演出列表）
│   └── /profile                   → Profile（个人中心）
├── /login                         → Login（裸页）
├── /concerts/:id                  → ConcertDetail
├── /concerts/:id/tickets          → TicketTier（票档选择）
├── /orders/create                 → OrderCreate（下单页）
└── /orders/:id                    → OrderDetail
```

### 4.2 Admin 路由

```
/                                  → BasicLayout（侧边栏导航）
├── /dashboard                     → Dashboard
├── /concerts
│   ├── index                      → ConcertList
│   └── /:id/edit                  → ConcertEdit（含票档配置占位）
├── /orders                        → OrderManage
└── /users                         → UserManage

/login                             → BlankLayout（独立分支）
```

侧边导航菜单项：Dashboard、演出管理、订单管理、用户管理。

---

## 5. 跨端差异处理

### 5.1 H5 移动端适配

- 方案：`postcss-px-to-viewport`
- 设计稿基准：375px（与 react-vant 默认一致）
- 排除规则：`exclude: [/node_modules\/(react-vant)/]`
- 不使用 rem 方案，避免双套单位

### 5.2 Admin PC 端

- 不引入任何移动端适配插件
- 全局 `body { min-width: 1280px; }` 防止小屏挤压
- antd `ConfigProvider` 统一中文 locale 与主题 token

### 5.3 共享层差异化使用

- `packages/shared` 同时被 H5 与 Admin 消费
- `packages/api` 采用"工厂 + 拦截器注入"模式：每个 app 在 `main.tsx` 调用 `createApiClient({ ..., onError, onUnauthorized })`，底层 axios 共享，业务提示跨端隔离

---

## 6. 初始化执行清单

所有命令在 `/Users/kzf/Documents/trae-6` 下执行。

```bash
# 1. 进入工作目录
mkdir -p /Users/kzf/Documents/trae-6 && cd /Users/kzf/Documents/trae-6

# 2. 创建目录骨架
mkdir -p apps/h5/src/{router,layouts,components,styles}
for p in Home ConcertDetail TicketTier OrderCreate OrderDetail Profile Login; do
  mkdir -p apps/h5/src/pages/$p
done
mkdir -p apps/h5/public

mkdir -p apps/admin/src/{router,layouts,components,styles}
for p in Login Dashboard ConcertList ConcertEdit OrderManage UserManage; do
  mkdir -p apps/admin/src/pages/$p
done
mkdir -p apps/admin/public

mkdir -p packages/shared/src/{types,constants,utils}
mkdir -p packages/api/src/{modules,types}

# 3. 创建根 package.json（声明 workspaces、scripts、devDeps）
# 4. 创建 .npmrc / .nvmrc / .gitignore / .editorconfig
# 5. 创建 .prettierrc.json / eslint.config.js
# 6. 创建 tsconfig.base.json / tsconfig.json
# 7. 在每个子包内创建 package.json、tsconfig.json

# 8. 安装根依赖
npm install

# 9. 构建共享包与 API 包（生成 dist/ 与类型声明）
npm run build:shared
npm run build:api

# 10. 启动开发
npm run dev
# 预期：H5 监听 http://localhost:5173/ ，Admin 监听 http://localhost:5174/
```

---

## 7. 运行验证步骤

| 步骤 | 操作 | 期望结果 |
|---|---|---|
| 1 | `npm run typecheck` | 0 错误（含所有子包 references） |
| 2 | `npm run lint` | 0 错误 |
| 3 | `npm run dev` | 同时启动 H5 与 Admin，控制台分别打印端口 |
| 4 | 浏览器打开 `http://localhost:5173/` | H5 首页占位，底部 TabBar 显示 |
| 5 | 访问 `http://localhost:5173/concerts/123` | 跳转到演出详情占位页 |
| 6 | 浏览器打开 `http://localhost:5174/login` | Admin 登录占位页（居中卡片） |
| 7 | 登录后跳 `/dashboard`，点侧栏"演出管理" | 看到 `ConcertList` 占位页 |
| 8 | 点"新建/编辑" | 跳转 `/concerts/:id/edit`，看到 `ConcertEdit` 占位 |
| 9 | `npm run build` | 4 个包均产出 dist/ |
| 10 | `npm run preview --workspace=@trae/h5` | 预览生产包，检查 px-to-viewport 适配效果 |

---

## 8. 已知风险与权衡

| 风险 | 缓解 |
|---|---|
| "Vant" 是 Vue 库；React 默认采用 `react-vant`（已进入维护期） | 默认选型已注明；提供 `antd-mobile` 切换方案，迁移成本低 |
| antd v6 与 v5 仍有 API 差异 | 按 v6 官方文档写代码 |
| npm workspaces 不会自动 hoist 共享包类型 | 用 TS `composite + references`；共享包 `tsup --watch` 持续构建 |
| TS `composite: true` 要求引用图无循环 | 严格分层：`api` → `shared`；`apps/*` → `api` + `shared` |
| `postcss-px-to-viewport` 会转换第三方样式 | `exclude: /node_modules\/(react-vant)/` 屏蔽 |
| Vite 7 要求 Node 20.19+/22.12+ | `.nvmrc` 锁 22；README 注明 |
| React Router 7 经典模式与框架模式 API 接近但配置不同 | 路由集中在 `router/index.tsx`，后续可平滑迁移 |

### 架构权衡

1. **共享包用 tsup 而非 Vite 库模式**：tsup 对 ESM/CJS/DTS 三输出成熟，是 monorepo 共享包事实标准
2. **状态管理选 zustand**：体量小、TS 友好；业务复杂后再评估是否引入 RTK Query
3. **API 客户端用工厂 + 拦截器注入**：让 H5/Admin 共享 axios 逻辑，业务提示各自实现，避免硬编码 UI 库依赖
4. **不引入 turborepo / nx**：项目规模下 `concurrently` 足够；包数量超过 10 再评估 Turborepo
5. **React 18 而非 19**：牺牲部分新特性换取生态稳定性，AntD v6 已声明兼容
6. **占位页统一用 `<Placeholder>` 组件**：避免每个页面重复样板代码

---

## 9. 后续步骤（待用户提供详细需求后）

1. 扩展 `packages/shared/src/types/` 下的实体字段，配套在 `packages/api/src/modules/` 添加 API 签名
2. 替换占位页：实现 `apps/h5/src/pages/*` 和 `apps/admin/src/pages/*`
3. 按业务域拆 `stores/`（订单 store、用户 store）
4. 加 route guard：`BasicLayout`（Admin）/`RootLayout`（H5）；`@trae/api` 的 `onUnauthorized` 触发跳转登录
5. CI：根级 `npm run build` 直接调用
