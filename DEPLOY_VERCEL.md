# Vercel 部署说明（演唱会票务平台）

> 单 Project 同时托管 H5 用户端（根 /）和管理后台（/admin/*）。

## 架构

- **入口**：`/admin/login` → 管理后台登录；其他路径 → H5 用户端
- **API**：纯前端 mock（axios 拦截器），无服务端
- **数据**：用户浏览器 LocalStorage
- **路由 fallback**：`/admin/*` → `admin/index.html`；其他 → `index.html`

## 本地构建预览

```bash
# 1. 装依赖
npm install

# 2. 一次性构建（包含 packages + apps）
bash scripts/build-vercel.sh
# 产物：.vercel/output/{index.html, assets/, admin/index.html, admin/assets/}

# 3. 用 vercel CLI 本地模拟 Vercel 环境
./node_modules/.bin/vercel dev   # 或 vercel dev
```

## 部署步骤

### 方案 A：Vercel CLI（无 Git）

```bash
# 1. 登录（首次会打开浏览器）
npx vercel login

# 2. 在项目根目录首次部署（创建项目）
npx vercel

# CLI 会问你几个问题：
# - Set up and deploy?  → Y
# - Which scope?         → 选你的 team/用户名
# - Link to existing project? → N（首次）
# - What's your project's name? → trae-6-ticket
# - In which directory is your code located? → ./
# - Override settings? → N（用 vercel.json）

# 3. 部署到生产
npx vercel deploy --prod
```

部署完成后 Vercel 会返回形如 `https://trae-6-ticket-xxx.vercel.app` 的地址：
- 用户端：<https://trae-6-ticket-xxx.vercel.app/>
- 管理后台：<https://trae-6-ticket-xxx.vercel.app/admin/login>

### 方案 B：连接 GitHub（自动部署）

1. 把代码 push 到 GitHub 仓库
2. 在 [vercel.com/new](https://vercel.com/new) 选 GitHub → 选这个仓库 → Import
3. **Framework Preset**：选 "Other"
4. **Build & Output Settings**：
   - Build Command：`bash scripts/build-vercel.sh`
   - Output Directory：`.vercel/output`
   - Install Command：`npm install --no-audit --no-fund`
5. 点击 Deploy

每次 push 到 main 分支会自动部署生产环境；其他分支会创建 preview URL。

## 自定义域名

在 Vercel 控制台 Project → Settings → Domains 添加你的域名，按提示配置 DNS：
- apex（example.com）：A 记录 → 76.76.21.21
- www 子域：CNAME → cname.vercel-dns.com

## 路由规则（vercel.json）

| 路径模式 | 行为 |
|---|---|
| `/admin/assets/*` | 静态资源（1 年缓存） |
| `/admin/*` | fallback 到 `admin/index.html`（SPA 路由） |
| `/assets/*` | h5 静态资源（1 年缓存） |
| 其他 `/*` | fallback 到 `index.html`（SPA 路由） |

## 本地开发如何切回 /

Vercel 部署下 admin 是 `/admin/*` 路径。本地 dev 默认 `/`：
```bash
npm run dev:admin   # 启 5174，admin 走 /
```

如需本地 dev 也走 `/admin/*`，可在 `.env.local` 设置 `VITE_BASENAME=/admin`。

## 故障排查

- **部署后 admin 页面 404**：检查 `vercel.json` 的 `outputDirectory` 是否是 `.vercel/output`，以及 `npm run build:admin` 后 `apps/admin/dist/index.html` 是否生成成功
- **管理后台静态资源 404**：确认 `vite.config.ts` 的 `base` 是 `/admin/`（Vercel 部署时）
- **登录无效 / 数据不显示**：mock 数据存在浏览器 LocalStorage，不同设备 / 浏览器互不相通——演示场景下用户需自行注册或使用默认账号