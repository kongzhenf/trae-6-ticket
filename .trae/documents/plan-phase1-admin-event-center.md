# 演唱会票务平台 — 第一阶段实施计划（管理后台 · 演出中心）

> 文档定位：本计划**仅覆盖第一阶段**（PRD 第三十节中的 Phase 1「基础工程」+ Phase 2「活动中心」）。
> 后续阶段（Phase 3 C 端购票 / Phase 4 订单 / Phase 5 支付 / Phase 6 后台其他模块 / Phase 7 安全）将各自独立成文。
>
> 工作目录：`/Users/kzf/Documents/trae-6`
> 适用人员：实现 Agent、Code Reviewer、QA
> 文档约束：所有模块严格遵守 PRD 第三十一节 20 条核心规则；每完成一个模块（M1–M6）停下等用户确认；交付时同步更新对应 `prd.md`。

---

## Summary

第一阶段目标：在已有 monorepo 工程骨架基础上，补齐**管理后台 · 演出中心**的完整业务闭环，覆盖数据 mock 层、运营数据概览、演出 CRUD、票档管理、库存管理五个交付点，并保证：

- 不开发后端，所有 API 通过 `@trae/api` 的 **axios adapter 拦截**在浏览器层短路，命中内存 + localStorage 的假数据。
- 每完成一个模块就停下等用户确认，不一次性提交。
- 每模块交付时同步更新 `apps/admin/src/pages/<Module>/prd.md`（按 `AGENTS.md`「PRD 文档同步更新规范」）。
- 所有金额单位**统一为分**（与现有 `formatMoney(cents)` 对齐），库存单位为「张」。
- 状态机映射、敏感数据脱敏、不可变历史等 20 条核心规则**作为代码层护栏**而非文档口号（详见 §6 与 §8）。

| 模块 | 文件 / 路径 | 状态 |
|---|---|---|
| M0 | 基础工程脚手架 | ✅ 已完成 |
| M1 | Mock 数据层（`@trae/api` axios adapter + 内存数据 + localStorage 持久化） | 待开发 |
| M2 | Dashboard 运营数据概览 | 待开发 |
| M3 | 演出列表（查询 / 筛选 / 分页 / 状态变更 / 删除草稿） | 待开发 |
| M4 | 演出创建 / 编辑（7 步分步表单） | 待开发 |
| M5 | 票档管理（含库存调整，与 M6 合并） | 待开发 |
| M6 | 库存管理（票档内的库存调整 + 调整日志） | 与 M5 合并交付 |

> 票档管理与库存管理在 PRD 4.4 / 8「票档」节中共用同一组接口（`adjust-stock` 写入库存变更日志），UI 上放在同一页面、同一个表格里更贴合运营场景，故合并为一个交付点。

---

## Current State Analysis

### 已具备的资产（可直接复用，无需重写）

| 资产 | 路径 | 用途 |
|---|---|---|
| BasicLayout | `apps/admin/src/layouts/BasicLayout.tsx` | 已含 Sider + Header + Outlet；侧栏菜单含 Dashboard / 演出管理 / 订单管理 / 用户管理 |
| 路由表 | `apps/admin/src/router/index.tsx` | `/dashboard`、`/concerts`、`/concerts/:id/edit`、`/orders`、`/users` 已注册 |
| PrdPanelHost | `apps/admin/src/components/PrdPanelHost.tsx` | 自动注入 PRD 按钮 + 侧边面板；新页面继续使用 |
| usePrdPanel | `apps/admin/src/hooks/usePrdPanel.ts` | 用 `import.meta.glob` 加载各页面 `prd.md` |
| `cn` 工具 | `apps/admin/src/utils/cn.ts` | Tailwind className 合并 |
| antd ConfigProvider | `apps/admin/src/main.tsx` | 已配置 `locale=zhCN`、`colorPrimary=#1677ff`，已用 `App as AntdApp` 包裹 |
| API 客户端骨架 | `packages/api/src/client.ts` + `modules/*.ts` | 已暴露 `concertApi` / `orderApi` / `userApi` / `uploadApi` 工厂函数 |
| 共享类型 | `packages/shared/src/types/{concert,ticket,order,user,common}.ts` | 含 `ConcertStatus`、`TicketTierStatus`、`PageQuery`、`PageResult`、`ApiResponse` |
| 路由常量 | `packages/shared/src/constants/routes.ts` | `ADMIN_ROUTES.concertEdit(id)` 已存在；本计划新增 `concertTickets(id)` |
| 工具 | `packages/shared/src/utils/{format,storage,validators}.ts` | `formatMoney(cents)`、`formatDate()`、`maskPhone()`、`getStorageItem/setStorageItem` |
| 占位页 | `apps/admin/src/pages/{Dashboard,ConcertList,ConcertEdit}/index.tsx` | 已有结构，进入实现只需替换主体 |
| 占位 PRD | `apps/admin/src/pages/{Dashboard,ConcertList,ConcertEdit}/prd.md` | 字段定义与 PRD 第三节已对得上 70%，但**接口路径前缀是 `/api/admin/...`** 与 PRD 第八节 `/admin/v1/...` 不一致，**M1 要统一到 `/admin/v1/...`** |

### 需要打补丁的地方

1. **共享类型字段不完整**：
   - `Concert` 缺：`subtitle`、`coverUrl`、`bannerUrl`、`detailContent`、`saleStartTime`、`saleEndTime`、`orderTimeoutMinutes`、`maxBuyQuantity`、`refundEnabled`、`showStock`、`createdAt`、`updatedAt`、`creatorId`、`publishStatus`。
   - `TicketTier` 缺：`availableStock`/`lockedStock`/`soldStock`（建议三态拆分，对齐 PRD §5.3）、`maxBuyQuantity`、`saleStartTime`、`saleEndTime`、`sort`、`createdAt`、`updatedAt`。
   - `ConcertStatus` 与 PRD §9.1 状态机不一致（缺 `published`、`off_sale`、`offline`、`stopped`）。**方案见 §1.1**，**不删除现有键**，仅追加。
2. **API 模块缺 admin 接口**：当前 `concertApi` 只暴露 C 端 5 个方法；需要新增 `adminEventApi`、`adminTicketApi`、`adminDashboardApi`，URL 前缀 `/admin/v1/...`（与 PRD 第八节一致）。
3. **axios 客户端没有 mock 开关**：当前 `client.ts` 总是发起真实请求；M1 需要在工厂内注入 adapter。
4. **没有状态/常量汇总**：演出状态、票档状态需要补一个 `eventStatus.ts`、`ticketStatus.ts` 常量映射（已部分存在，需要扩展）。
5. **没有全局 store**：`zustand` 已依赖；需要为 Dashboard / ConcertList / ConcertEdit / TicketManage 各加一个 slice（或合并到 `eventStore`）。
6. **Dashboard 占位只有 4 个卡片**：PRD B01 要求两排 8 个 + 图表 + 排行榜，需要新增。
7. **ConcertList 占位 6 列**：PRD B02 要求 10 列（活动名称、演出时间、场馆、销售时间、票档数、总库存、已售、销售金额、状态、操作）。
8. **ConcertEdit 占位 4 Tab**：PRD B03 要求 **7 步**，且必须改为 `Steps` 模式。
9. **没有新建 `/concerts/:id/tickets` 路由**：M5 需要在 `router/index.tsx` 注册，路由常量 `ADMIN_ROUTES.concertTickets(id)` 需新增。
10. **Login 占位「登录」直接 navigate**：M1 不会实现真实登录，**第一阶段不做路由守卫**（后续阶段引入）。

### 不在第一阶段范围（明确不实现，避免范围蔓延）

- 真实登录、token、路由守卫（Phase 7 安全再做）
- C端 H5 任何页面（PRD 第三节 C01–C11）
- 订单模块（PRD B05）、用户模块（PRD B06）、导出（PRD B07）、角色权限（PRD B09）、操作日志
- 富文本编辑器（ConcertEdit Step 2 / Step 6 用 `<Input.TextArea>` 占位 + 明确 TODO 注释，**不引入** `@tinymce`/`@wangeditor` 等）
- 文件上传（封面 / Banner 用 `<Input>` URL 输入框 + 默认占位图）
- 真实地图选址（经纬度用 `<InputNumber>` 手动输入）
- Excel 导出
- 任何服务端调用

---

## Proposed Changes

### §1. 全局前置：常量、路由、状态机定义（M1 之前必须先落地）

#### 1.1 新增 `packages/shared/src/constants/eventStatus.ts`

对齐 PRD §9.1 状态机，但**保留**现有 `ConcertStatus` 6 个键以避免破坏既有占位。

```ts
import type { ConcertStatus } from '../types/concert'

/** 扩展后的演出状态映射（PRD §9.1 状态机） */
export const EVENT_STATUS: Record<ConcertStatus, { label: string; color: string }> = {
  draft:     { label: '草稿',     color: 'default' },
  pending:   { label: '待开售',   color: 'cyan'    },
  published: { label: '已发布',   color: 'blue'    },
  on_sale:   { label: '售票中',   color: 'green'   },
  off_sale:  { label: '已停售',   color: 'orange'  },
  offline:   { label: '已下架',   color: 'red'     },
  stopped:   { label: '已暂停',   color: 'gold'    },
  sold_out:  { label: '已售罄',   color: 'magenta' },
  finished:  { label: '已结束',   color: 'gray'    },
  cancelled: { label: '已取消',   color: 'red'     },
}

export const EVENT_STATUS_LIST: ConcertStatus[] = [
  'draft','pending','published','on_sale','off_sale','offline','stopped','sold_out','finished','cancelled',
]

/** PRD §9.1 状态转移白名单 */
export const EVENT_TRANSITIONS: Record<ConcertStatus, ConcertStatus[]> = {
  draft:     ['published', 'cancelled'],
  pending:   ['published', 'on_sale', 'cancelled'],
  published: ['on_sale', 'offline'],
  on_sale:   ['stopped', 'off_sale', 'finished'],
  stopped:   ['on_sale', 'off_sale'],
  off_sale:  ['on_sale', 'finished'],
  offline:   ['published'],
  sold_out:  ['on_sale', 'off_sale', 'finished'],
  finished:  [],
  cancelled: [],
}
```

#### 1.2 扩展 `packages/shared/src/types/concert.ts`

```ts
export type ConcertStatus =
  | 'draft' | 'pending' | 'published' | 'on_sale' | 'off_sale'
  | 'offline' | 'stopped' | 'sold_out' | 'finished' | 'cancelled'

export interface Artist { id: string; name: string; avatar?: string }
export interface Venue {
  id: string; name: string; city: string;
  address?: string; longitude?: number; latitude?: number;
}

/** 完整 Event 实体（对齐 PRD §5.2） */
export interface Concert {
  id: string
  eventName: string
  subtitle?: string
  coverUrl?: string
  bannerUrl?: string
  detailContent?: string
  startTime: string
  endTime?: string
  venueName: string
  venueAddress?: string
  longitude?: number
  latitude?: number
  saleStartTime: string
  saleEndTime: string
  orderTimeoutMinutes: number
  maxBuyQuantity: number
  showStock: boolean
  refundEnabled: boolean
  status: ConcertStatus
  publishStatus?: 'draft' | 'published'
  creatorId?: string
  createdAt: string
  updatedAt: string
}

/** Dashboard 指标（PRD B01） */
export interface DashboardOverview {
  totalEvents: number
  onSaleEvents: number
  totalOrders: number
  paidOrders: number
  totalTicketsSold: number
  totalSalesAmount: number
  todayOrders: number
  todaySalesAmount: number
}

export interface DashboardTopConcert {
  concertId: string
  eventName: string
  ticketsSold: number
  salesAmount: number
}
```

#### 1.3 扩展 `packages/shared/src/types/ticket.ts`

```ts
export type TicketTierStatus =
  | 'available' | 'sold_out' | 'hidden' | 'stopped'

export interface TicketTier {
  id: string
  eventId: string
  categoryName: string
  price: number                        // 单位：分
  totalStock: number
  availableStock: number
  lockedStock: number
  soldStock: number
  maxBuyQuantity: number
  saleStartTime: string
  saleEndTime: string
  status: TicketTierStatus
  sort: number
  description?: string
  createdAt: string
  updatedAt: string
}

/** 库存调整记录（PRD §8 票档接口要求写入日志） */
export interface StockAdjustment {
  id: string
  ticketTierId: string
  delta: number
  beforeAvailable: number
  afterAvailable: number
  reason: string
  operatorId: string
  createdAt: string
}
```

#### 1.4 扩展 `packages/shared/src/constants/routes.ts`

```ts
export const ADMIN_ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  concertList: '/concerts',
  concertEdit: (id = ':id') => `/concerts/${id}/edit`,
  concertTickets: (id = ':id') => `/concerts/${id}/tickets`,  // M5 新增
  orderManage: '/orders',
  userManage: '/users',
} as const
```

#### 1.5 导出桶更新

`packages/shared/src/index.ts` 新增 `export * from './constants/eventStatus'`，并确保新类型从 `./types/concert`、`.types/ticket` 自动 re-export。

#### 1.6 新增 `packages/shared/src/constants/errorCode.ts`

```ts
export const ERROR_CODE: Record<number, string> = {
  400003: '活动不存在',
  400004: '活动已结束',
  400005: '尚未开售',
  400006: '已停止售票',
  400007: '票档不存在',
  400008: '票档已售罄',
  400009: '库存不足',
  400010: '超出限购',
  400018: '活动已下架',
  500001: '系统异常，请稍后重试',
}
```

---

### §2. M1 — Mock 数据层

**目标**：让 `apps/admin` 与 `apps/h5` 通过 `@trae/api` 发起的所有请求，被一个**自定义 axios adapter** 截获，按 URL 模式匹配返回内存中维护的假数据。整个第一阶段不再发起真实 HTTP。

#### 2.1 文件清单

| 操作 | 路径 | 原因 |
|---|---|---|
| 新增 | `packages/api/src/mock/types.ts` | mock 数据形状 + URL 模式类型 |
| 新增 | `packages/api/src/mock/seed.ts` | 种子数据：30 场演出、80 个票档、120 个订单、50 个用户 |
| 新增 | `packages/api/src/mock/store.ts` | 内存 store + localStorage 双向同步 |
| 新增 | `packages/api/src/mock/handlers/event.ts` | `/admin/v1/events*` 处理器 |
| 新增 | `packages/api/src/mock/handlers/ticket.ts` | `/admin/v1/events/:id/tickets` + `/admin/v1/tickets/:id/*` 处理器 |
| 新增 | `packages/api/src/mock/handlers/dashboard.ts` | `/admin/v1/dashboard/*` 处理器 |
| 新增 | `packages/api/src/mock/handlers/order.ts` | `/api/v1/orders*` 处理器（预留，防误调） |
| 新增 | `packages/api/src/mock/router.ts` | URL 正则 → handler 路由表 |
| 新增 | `packages/api/src/mock/adapter.ts` | axios `AxiosAdapter` 实现 |
| 新增 | `packages/api/src/mock/index.ts` | 桶式导出 + `installMock(client)` 工具 |
| 修改 | `packages/api/src/client.ts` | 增加 `mock?: boolean` 选项；true 时注入 adapter |
| 修改 | `packages/api/src/index.ts` | 增加 `installMock` 与 admin API 模块导出 |
| 修改 | `packages/api/src/modules/adminEvent.ts` | 新增 admin 演出接口 |
| 修改 | `packages/api/src/modules/adminTicket.ts` | 新增 admin 票档接口 |
| 修改 | `packages/api/src/modules/adminDashboard.ts` | 新增 admin Dashboard 接口 |
| 修改 | `apps/admin/src/main.tsx` | 创建 client 时 `mock: true` + `installMock(client)` + `<ApiProvider>` |
| 修改 | `apps/h5/src/main.tsx` | 同上 |
| 修改 | `apps/admin/.env.development` | `VITE_USE_MOCK=true` |
| 修改 | `apps/h5/.env.development` | `VITE_USE_MOCK=true` |
| 修改 | `apps/admin/vite.config.ts` | 注释 proxy（mock 模式下不触发） |
| 新增 | `apps/admin/src/components/DevMockToolbar.tsx` | 浮动调试条：「重置 mock 数据 / 清空 localStorage」 |

#### 2.2 关键设计点

**(a) 为什么用 axios adapter 而不是 interceptor？**

- 拦截器仍会进入 fetch 循环，触发 404 / network error 等噪音；adapter 是 axios 最底层的钩子，能在请求真正发出前返回伪 `AxiosResponse`，**完全离线**工作。
- 拦截器适合做 token 注入；mock 是「请求被吃掉」的语义，必须用 adapter。

**(b) mock store 形状**

```ts
// packages/api/src/mock/store.ts
import { getStorageItem, setStorageItem } from '@trae/shared'

const STORAGE_KEY = 'concert_mock_db_v1'

export interface MockDB {
  events: Concert[]
  ticketTiers: TicketTier[]
  stockAdjustments: StockAdjustment[]
  orders: Order[]
  users: User[]
  counters: { eventId: number; ticketId: number; orderId: number; userId: number; adjustmentId: number }
}

const defaultDB: MockDB = { /* seed */ }

let cache: MockDB | null = null

export function getDB(): MockDB {
  if (!cache) {
    cache = getStorageItem(STORAGE_KEY, defaultDB)
    if (cache.events.length === 0) {
      cache = deepClone(defaultDB)
      persist()
    }
  }
  return cache
}

export function persist(): void {
  if (cache) setStorageItem(STORAGE_KEY, cache)
}

export function resetDB(): void {
  cache = deepClone(defaultDB)
  persist()
}
```

**(c) adapter 实现要点**

```ts
// packages/api/src/mock/adapter.ts
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { matchHandler } from './router'

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  // 1. 模拟 50–300ms 延迟，让 loading 状态可见
  await new Promise(r => setTimeout(r, 50 + Math.random() * 250))

  const url = (config.baseURL ?? '') + (config.url ?? '')
  const method = (config.method ?? 'get').toUpperCase()
  const params = config.params
  const data = typeof config.data === 'string' ? safeJsonParse(config.data) : config.data

  const result = matchHandler(method, url, params, data)
  if (!result) {
    return makeAxiosError(config, 404, 'MOCK_NOT_FOUND', `未匹配到 mock handler: ${method} ${url}`)
  }
  return {
    data: { code: 0, message: 'ok', data: result },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  } as AxiosResponse
}

function makeAxiosError(config, status, code, message) {
  const err: any = new Error(message)
  err.response = { data: { code, message }, status, config }
  err.config = config
  return Promise.reject(err)
}
```

**(d) handler router**

```ts
// packages/api/src/mock/router.ts
const routes: Array<{
  method: string
  pattern: RegExp
  handler: (m: RegExpMatchArray, params: any, body: any) => any
}> = [
  { method: 'GET',    pattern: /^\/admin\/v1\/events$/,                  handler: h.listEvents },
  { method: 'GET',    pattern: /^\/admin\/v1\/events\/([^/]+)$/,         handler: h.getEvent },
  { method: 'POST',   pattern: /^\/admin\/v1\/events$/,                  handler: h.createEvent },
  { method: 'PUT',    pattern: /^\/admin\/v1\/events\/([^/]+)$/,         handler: h.updateEvent },
  { method: 'DELETE', pattern: /^\/admin\/v1\/events\/([^/]+)$/,         handler: h.deleteEvent },
  { method: 'POST',   pattern: /^\/admin\/v1\/events\/([^/]+)\/publish$/,      handler: h.publishEvent },
  { method: 'POST',   pattern: /^\/admin\/v1\/events\/([^/]+)\/offline$/,      handler: h.offlineEvent },
  { method: 'POST',   pattern: /^\/admin\/v1\/events\/([^/]+)\/stop-sale$/,    handler: h.stopSale },
  { method: 'POST',   pattern: /^\/admin\/v1\/events\/([^/]+)\/resume-sale$/,  handler: h.resumeSale },
  { method: 'GET',    pattern: /^\/admin\/v1\/events\/([^/]+)\/tickets$/, handler: h.listTickets },
  { method: 'POST',   pattern: /^\/admin\/v1\/events\/([^/]+)\/tickets$/, handler: h.createTicket },
  { method: 'PUT',    pattern: /^\/admin\/v1\/tickets\/([^/]+)$/,        handler: h.updateTicket },
  { method: 'POST',   pattern: /^\/admin\/v1\/tickets\/([^/]+)\/enable$/,  handler: h.enableTicket },
  { method: 'POST',   pattern: /^\/admin\/v1\/tickets\/([^/]+)\/disable$/, handler: h.disableTicket },
  { method: 'POST',   pattern: /^\/admin\/v1\/tickets\/([^/]+)\/adjust-stock$/, handler: h.adjustStock },
  { method: 'GET',    pattern: /^\/admin\/v1\/dashboard\/overview$/,     handler: h.dashboardOverview },
  { method: 'GET',    pattern: /^\/admin\/v1\/dashboard\/top-concerts$/, handler: h.topConcerts },
]

export function matchHandler(method, url, params, body) {
  for (const r of routes) {
    if (r.method !== method) continue
    const m = url.match(r.pattern)
    if (m) return r.handler(m, params, body)
  }
  return null
}
```

**(e) 业务规则在 handler 内强制**

| 护栏 | 实现位置 |
|---|---|
| 价格永远由 mock 服务端计算（即便请求带 price 也忽略） | `updateEvent` / `updateTicket`：覆盖式赋值 |
| 删除有票档/订单的演出 → 拒绝 | `deleteEvent`：若 `ticketTiers.some(t => t.eventId === id)` → 返回 `400018` |
| 状态转移白名单 | `publishEvent/offlineEvent/stopSale/resumeSale`：调用 `canTransition(from, to)`，非法 → `400004` |
| 库存调整必填 reason | `adjustStock`：无 reason → `500001` |
| 调整后 available 不能为负 | `adjustStock`：`available + delta < 0` → `400009` |
| 写入库存调整日志 | `adjustStock`：`stockAdjustments.push({...})` |
| 已发布活动不能物理删除 | `deleteEvent`：`status !== 'draft' && status !== 'pending'` → `400018` |

**(f) installMock 工具**

```ts
// packages/api/src/mock/index.ts
export function installMock(client: AxiosInstance) {
  client.defaults.adapter = mockAdapter
}
```

**(g) main.tsx 接入**

```ts
// apps/admin/src/main.tsx（关键改动）
import { createApiClient, installMock } from '@trae/api'

const client = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/admin/v1',
  timeout: 15000,
  mock: import.meta.env.VITE_USE_MOCK !== 'false',
})
if (import.meta.env.VITE_USE_MOCK !== 'false') installMock(client)
```

**(h) DevMockToolbar**

固定右下角小卡片，仅在 `import.meta.env.DEV` 时渲染：两个按钮——「重置 mock 数据」（带 confirm 弹窗 + reload）、「查看当前数据量」（message.info）。挂载在 `BasicLayout` 内（在 `Layout/Content` 之后）；H5 侧同样挂一份。

**(i) API 模块扩展**

```ts
// packages/api/src/modules/adminEvent.ts
import type { AxiosInstance } from 'axios'
import type { Concert, PageQuery, PageResult, DashboardOverview, DashboardTopConcert } from '@trae/shared'

export const adminEventApi = (client: AxiosInstance) => ({
  listEvents: (q: PageQuery & { status?: string; city?: string; startTimeRange?: [string,string]; saleTimeRange?: [string,string] }) =>
    client.get('/admin/v1/events', { params: q }).then(r => r.data.data as PageResult<Concert>),
  getEvent: (id: string) =>
    client.get(`/admin/v1/events/${id}`).then(r => r.data.data as Concert),
  createEvent: (payload: Omit<Concert,'id'|'createdAt'|'updatedAt'|'status'>) =>
    client.post('/admin/v1/events', payload).then(r => r.data.data as Concert),
  updateEvent: (id: string, payload: Partial<Concert>) =>
    client.put(`/admin/v1/events/${id}`, payload).then(r => r.data.data as Concert),
  deleteEvent: (id: string) =>
    client.delete(`/admin/v1/events/${id}`).then(r => r.data),
  publishEvent: (id: string) =>
    client.post(`/admin/v1/events/${id}/publish`).then(r => r.data),
  offlineEvent: (id: string) =>
    client.post(`/admin/v1/events/${id}/offline`).then(r => r.data),
  stopSale: (id: string) =>
    client.post(`/admin/v1/events/${id}/stop-sale`).then(r => r.data),
  resumeSale: (id: string) =>
    client.post(`/admin/v1/events/${id}/resume-sale`).then(r => r.data),
})

export const adminTicketApi = (client: AxiosInstance) => ({
  listTickets: (eventId: string) =>
    client.get(`/admin/v1/events/${eventId}/tickets`).then(r => r.data.data as TicketTier[]),
  createTicket: (eventId: string, payload: Omit<TicketTier,'id'|'eventId'|'availableStock'|'lockedStock'|'soldStock'|'createdAt'|'updatedAt'>) =>
    client.post(`/admin/v1/events/${eventId}/tickets`, payload).then(r => r.data.data as TicketTier),
  updateTicket: (id: string, payload: Partial<TicketTier>) =>
    client.put(`/admin/v1/tickets/${id}`, payload).then(r => r.data.data as TicketTier),
  enableTicket: (id: string) =>
    client.post(`/admin/v1/tickets/${id}/enable`).then(r => r.data),
  disableTicket: (id: string) =>
    client.post(`/admin/v1/tickets/${id}/disable`).then(r => r.data),
  adjustStock: (id: string, delta: number, reason: string) =>
    client.post(`/admin/v1/tickets/${id}/adjust-stock`, { delta, reason }).then(r => r.data),
})

export const adminDashboardApi = (client: AxiosInstance) => ({
  overview: () => client.get('/admin/v1/dashboard/overview').then(r => r.data.data as DashboardOverview),
  topConcerts: () => client.get('/admin/v1/dashboard/top-concerts').then(r => r.data.data as DashboardTopConcert[]),
})
```

并在 `packages/api/src/index.ts` 导出这三个新对象。

#### 2.3 M1 验证步骤

1. `bash scripts/typecheck.sh` 通过；
2. `bash scripts/build.sh` 成功打出 `@trae/api` 的 dist；
3. 启动 admin，打开 DevTools → Application → Local Storage，确认 `concert_mock_db_v1` 存在；
4. 在 `Dashboard` 占位页临时写一行 `await adminEventApi(client).listEvents({})`，刷新页面看到 30 条假数据（验证后删掉）；
5. 在 `DevMockToolbar` 点「重置」确认 localStorage 被覆写。

---

### §3. 全局基础设施：ApiContext + useApi（M1 落地）

```ts
// apps/admin/src/contexts/ApiContext.tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createApiClient, adminEventApi, adminTicketApi, adminDashboardApi } from '@trae/api'

const ApiCtx = createContext<ReturnType<typeof buildApis> | null>(null)

function buildApis(client: ReturnType<typeof createApiClient>) {
  return {
    client,
    adminEvent: adminEventApi(client),
    adminTicket: adminTicketApi(client),
    adminDashboard: adminDashboardApi(client),
  }
}

export function ApiProvider({ client, children }: { client: ReturnType<typeof createApiClient>; children: ReactNode }) {
  const value = useMemo(() => buildApis(client), [client])
  return <ApiCtx.Provider value={value}>{children}</ApiCtx.Provider>
}

export function useApi() {
  const v = useContext(ApiCtx)
  if (!v) throw new Error('useApi must be used inside <ApiProvider>')
  return v
}
```

`apps/admin/src/main.tsx` 在 `AntdApp` 内层包 `<ApiProvider client={client}>`。

---

### §4. M2 — Dashboard 运营数据概览

**目标**：把 Dashboard 占位替换为真实布局：8 个指标卡（PRD B01 第一排 4 + 第二排 4） + 销售趋势占位 Card + 订单状态分布占位 Card + 热门演出 TOP 10（antd `Table`） + 最近订单流水占位。**不引入**图表库。

#### 4.1 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 修改 | `apps/admin/src/pages/Dashboard/index.tsx` | 整体重写 |
| 修改 | `apps/admin/src/pages/Dashboard/prd.md` | 同步：① 列出实际渲染的 8 个指标；② 明确「销售趋势 / 订单分布」首期用占位 Card；③ 接口路径改为 `/admin/v1/dashboard/...` |
| 新增 | `apps/admin/src/hooks/useDashboard.ts` | 调 `adminDashboardApi.overview()` / `topConcerts()` |
| 新增 | `apps/admin/src/components/MetricCard.tsx` | 复用 8 次的 antd `Card` + `Statistic` |

#### 4.2 关键实现要点

**(a) 8 个指标卡布局**

```tsx
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={6}><MetricCard title="活动总数"   value={ov.totalEvents}      suffix="场" icon={<SoundOutlined />} /></Col>
  <Col xs={24} sm={12} md={6}><MetricCard title="销售中活动" value={ov.onSaleEvents}     suffix="场" icon={<RocketOutlined />} /></Col>
  <Col xs={24} sm={12} md={6}><MetricCard title="订单总数"   value={ov.totalOrders}      suffix="单" icon={<FileTextOutlined />} /></Col>
  <Col xs={24} sm={12} md={6}><MetricCard title="支付订单数" value={ov.paidOrders}       suffix="单" icon={<CheckCircleOutlined />} /></Col>

  <Col xs={24} sm={12} md={6}><MetricCard title="售出票数"   value={ov.totalTicketsSold} suffix="张" /></Col>
  <Col xs={24} sm={12} md={6}><MetricCard title="销售金额"   value={formatMoney(ov.totalSalesAmount)} /></Col>
  <Col xs={24} sm={12} md={6}><MetricCard title="今日订单"   value={ov.todayOrders}      suffix="单" highlight /></Col>
  <Col xs={24} sm={12} md={6}><MetricCard title="今日销售额" value={formatMoney(ov.todaySalesAmount)} highlight /></Col>
</Row>
```

> 金额单位严格走 `formatMoney(cents)` —— mock store 里也是「分」。

**(b) 卡片高亮逻辑**

`MetricCard` 接收 `highlight?: boolean`，为 true 时背景用 `bg-indigo-50`。

**(c) hook**

```ts
// apps/admin/src/hooks/useDashboard.ts
import { useEffect, useState } from 'react'
import { useApi } from '@/contexts/ApiContext'

export function useDashboard() {
  const api = useApi()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [topConcerts, setTopConcerts] = useState<DashboardTopConcert[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true); setError(null)
    try {
      const [ov, top] = await Promise.all([
        api.adminDashboard.overview(),
        api.adminDashboard.topConcerts(),
      ])
      setOverview(ov); setTopConcerts(top)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])
  return { loading, overview, topConcerts, error, refresh }
}
```

**(d) dashboard handler 内的真实计算**

```ts
// packages/api/src/mock/handlers/dashboard.ts
export function overview() {
  const db = getDB()
  const todayStart = startOfToday()
  return {
    totalEvents: db.events.length,
    onSaleEvents: db.events.filter(e => e.status === 'on_sale').length,
    totalOrders: db.orders.length,
    paidOrders: db.orders.filter(o => o.status === 'paid').length,
    totalTicketsSold: db.ticketTiers.reduce((s,t) => s + t.soldStock, 0),
    totalSalesAmount: db.orders
      .filter(o => o.status === 'paid')
      .reduce((s,o) => s + o.totalAmount, 0),
    todayOrders: db.orders.filter(o => new Date(o.createdAt) >= todayStart).length,
    todaySalesAmount: db.orders
      .filter(o => o.status === 'paid' && new Date(o.paidAt ?? o.createdAt) >= todayStart)
      .reduce((s,o) => s + o.totalAmount, 0),
  }
}

export function topConcerts() {
  const db = getDB()
  return db.events
    .map(e => ({
      concertId: e.id,
      eventName: e.eventName,
      ticketsSold: db.ticketTiers.filter(t => t.eventId === e.id).reduce((s,t) => s + t.soldStock, 0),
      salesAmount: db.orders
        .filter(o => o.concertId === e.id && o.status === 'paid')
        .reduce((s,o) => s + o.totalAmount, 0),
    }))
    .sort((a,b) => b.ticketsSold - a.ticketsSold)
    .slice(0, 10)
}
```

#### 4.3 M2 交付前同步

更新 `apps/admin/src/pages/Dashboard/prd.md`：
- 「接口」段从 `/api/admin/dashboard/*` 改为 `/admin/v1/dashboard/*`；
- 「状态」段改为「已对接 mock：8 个指标 + 热门演出 TOP 10；销售趋势 / 订单分布 / 最新订单 / 最新用户 暂以占位卡片呈现，后续阶段补图表」；
- 「字段说明」补充 `totalTicketsSold`、`totalSalesAmount`、`todaySalesAmount`、`onSaleEvents` 实际含义。

---

### §5. M3 — 演出列表（PRD B02）

**目标**：替换占位为真实查询表格 + 筛选 + 分页 + 行操作（编辑 / 上下架 / 删除草稿）。

#### 5.1 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 修改 | `apps/admin/src/pages/ConcertList/index.tsx` | 整体重写 |
| 修改 | `apps/admin/src/pages/ConcertList/prd.md` | 同步：① 列对齐 PRD B02；② 接口路径；③ 状态枚举；④ 搜索/筛选/分页字段 |
| 新增 | `apps/admin/src/hooks/useEventList.ts` | 调 `adminEventApi.listEvents(q)`，支持 query 防抖 |
| 新增 | `apps/admin/src/pages/ConcertList/components/FilterBar.tsx` | 搜索框 + 状态下拉 + 时间范围 + 「新建」按钮 |
| 新增 | `apps/admin/src/pages/ConcertList/components/ActionsColumn.tsx` | 「编辑 / 上下架 / 删除」三按钮，按 `EVENT_TRANSITIONS` 动态决定 |

#### 5.2 表格列定义

```ts
const columns: ColumnsType<Concert> = [
  { title: '活动ID',  dataIndex: 'id',         width: 90 },
  { title: '活动名称', dataIndex: 'eventName',  ellipsis: true,
    render: (text, r) => <a onClick={() => navigate(ADMIN_ROUTES.concertEdit(r.id))}>{text}</a> },
  { title: '演出时间', dataIndex: 'startTime',  width: 160, render: v => formatDate(v) },
  { title: '场馆',     dataIndex: 'venueName',  width: 180, ellipsis: true },
  { title: '销售时间', width: 220, render: (_, r) => `${formatDate(r.saleStartTime)} ~ ${formatDate(r.saleEndTime)}` },
  { title: '票档数',   width: 80,  render: (_, r) => ticketCount(r.id) },
  { title: '总库存',   width: 90,  render: (_, r) => totalStock(r.id) },
  { title: '已售',     width: 90,  render: (_, r) => soldStock(r.id) },
  { title: '销售金额', width: 120, render: (_, r) => formatMoney(salesAmount(r.id)) },
  { title: '状态',     width: 100, render: (_, r) => <Tag color={EVENT_STATUS[r.status].color}>{EVENT_STATUS[r.status].label}</Tag> },
  { title: '操作',     width: 220, fixed: 'right', render: (_, r) => <ActionsColumn row={r} onChanged={refresh} /> },
]
```

#### 5.3 ActionsColumn 行为

- 草稿（`draft`/`pending`）：「编辑 / 发布 / 删除」
- 已发布（`published`）：「编辑 / 上下架 / 售票」
- 售票中（`on_sale`）：「编辑 / 暂停销售 / 强制结束」
- 已停售（`off_sale`）：「编辑 / 恢复销售」
- 已下架（`offline`）：「编辑 / 重新发布」
- 已结束 / 已取消：只显示「编辑」（且只读）

每个操作前用 `Modal.confirm` 二次确认；删除草稿需输入活动名。

#### 5.4 筛选交互

- 关键字搜索：`Input.Search` + 防抖 300ms，按 `eventName` 模糊匹配；
- 状态下拉：`Select` 多选；
- 时间范围：`DatePicker.RangePicker`，分别对应 `startTime` / `saleStartTime`，通过 `Radio.Group` 切换。

#### 5.5 mock 端 listEvents

```ts
export function listEvents(m, params) {
  const db = getDB()
  let list = [...db.events]
  if (params?.keyword) {
    const kw = String(params.keyword).toLowerCase()
    list = list.filter(e => e.eventName.toLowerCase().includes(kw))
  }
  if (params?.status) {
    const arr = String(params.status).split(',')
    list = list.filter(e => arr.includes(e.status))
  }
  if (params?.startTimeRange) {
    const [s, e] = String(params.startTimeRange).split(',')
    list = list.filter(x => x.startTime >= s && x.startTime <= e)
  }
  const page = Number(params?.page ?? 1)
  const pageSize = Number(params?.pageSize ?? 10)
  const sorted = list.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))
  return { list: sorted.slice((page-1)*pageSize, page*pageSize), total: sorted.length, page, pageSize }
}
```

#### 5.6 M3 交付前同步

更新 `prd.md`：状态枚举 10 个、列与 PRD 顺序一致、接口路径 `/admin/v1/events`、增加「操作」列的可点击项规则表。

---

### §6. M4 — 演出创建 / 编辑 · 7 步分步表单（PRD B03）

**目标**：替换 4 个 Tab 占位为 `Steps` 横向步骤条 + 7 个步骤内容，最终「保存草稿 / 发布」。

#### 6.1 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 修改 | `apps/admin/src/pages/ConcertEdit/index.tsx` | 改为 `Steps` 容器 + 路由 `:id` 加载 + 保存 / 发布 |
| 修改 | `apps/admin/src/pages/ConcertEdit/prd.md` | 同步：① 7 步明细；② 各步字段；③ 校验规则；④ 状态机映射；⑤ 接口路径 |
| 新增 | `apps/admin/src/pages/ConcertEdit/steps/Step1Basic.tsx` | 基础信息 |
| 新增 | `apps/admin/src/pages/ConcertEdit/steps/Step2Detail.tsx` | 活动详情（富文本占位） |
| 新增 | `apps/admin/src/pages/ConcertEdit/steps/Step3SaleRule.tsx` | 销售规则 |
| 新增 | `apps/admin/src/pages/ConcertEdit/steps/Step4BuyerFields.tsx` | 购票字段配置 |
| 新增 | `apps/admin/src/pages/ConcertEdit/steps/Step5Tickets.tsx` | 票档（M4 阶段保存为 `ticketsSnapshot`，M5 进入后迁移） |
| 新增 | `apps/admin/src/pages/ConcertEdit/steps/Step6Notice.tsx` | 购票须知 |
| 新增 | `apps/admin/src/pages/ConcertEdit/steps/Step7Preview.tsx` | 发布预览 |
| 新增 | `apps/admin/src/hooks/useConcertEdit.ts` | 装载 + 缓存 + 保存 + 发布 |
| 新增 | `apps/admin/src/stores/concertDraftStore.ts` | zustand 临时草稿 store |

#### 6.2 7 步字段表（与 PRD B03 完全对齐）

| Step | 标题 | 主要字段 | 校验 |
|---|---|---|---|
| 1 | 基础信息 | eventName(必填,≤200), subtitle(≤300), coverUrl, bannerUrl, startTime(必填), endTime, venueName(必填,≤200), venueAddress(≤500), longitude(decimal), latitude(decimal) | endTime > startTime |
| 2 | 活动详情 | detailContent(longtext) | 无 |
| 3 | 销售规则 | saleStartTime(必填), saleEndTime(必填), orderTimeoutMinutes(默认15, 范围 1-1440), maxBuyQuantity(默认 2, 1-10), refundEnabled(bool), showStock(bool) | saleStartTime < saleEndTime < startTime |
| 4 | 购票字段 | name(默认 true, 必填), idCard(默认 true, 必填), mobile(默认 true, 不可编辑) | 至少保留 1 个 required 字段 |
| 5 | 票档 | 见 §6.3 | 至少 1 个票档；所有票档价 ≥ 0；总库存 ≥ 0 |
| 6 | 购票须知 | noticeContent(longtext) | 无 |
| 7 | 发布预览 | 只读汇总卡 | 无 |

#### 6.3 票档编辑子组件（M4 内嵌版本）

`Step5Tickets` 使用 antd `Table` + 弹出 `Modal` 编辑单行；字段：

```
票档名称 categoryName      [必填，≤100]
价格 price                [必填，InputNumber，单位元，内部 *100 转分]
总库存 totalStock          [必填，≥0 的整数]
单人限购 maxBuyQuantity    [必填，1-10]
销售开始 saleStartTime     [必填，DatePicker]
销售结束 saleEndTime       [必填，DatePicker]
排序 sort                  [默认 0]
说明 description           [可选]
```

> M4 阶段只把票档**当作活动下的子表单**保存（mock 端把数组塞进 `Concert.ticketsSnapshot`），M5 进入后再从 `Event` 维度迁移到独立的 `TicketTier` 表 + 自有页面 `TicketManage`。这样 M4 不会因等待 M5 阻塞。

#### 6.4 状态机与发布护栏

发布按钮触发以下校验（任一不过 → 弹错误并定位到对应步骤）：

1. PRD §31 第 19 条：「活动发布前必须通过完整业务校验」 → 7 步全过；
2. `EVENT_TRANSITIONS[currentStatus]` 包含 `published`；
3. `saleStartTime < saleEndTime < startTime`；
4. 至少 1 个票档；
5. 总库存之和 > 0；
6. 票档 sale 时间必须在活动 saleStart/saleEnd 内；
7. detailContent / noticeContent 非空（软提示，不强制）。

#### 6.5 离开页面提示

`concertDraftStore` 用 zustand persist 中间件写入 `localStorage.concertDraft_<eventId>`，未保存改动通过 antd `Modal.confirm` 拦截 `react-router` 的导航事件（React Router 7 的 `useBlocker`）。

#### 6.6 M4 交付前同步

更新 `prd.md`：
- 「页面结构」改为 7 步明细（与上表一致）；
- 增补「状态机」小节：列出 `draft → published → on_sale → off_sale → finished` 及人工操作；
- 「字段说明」补全 `eventName / subtitle / venueName / longitude / latitude / orderTimeoutMinutes / showStock`；
- 「接口」段改为 `GET/PUT /admin/v1/events/:id`、`POST /admin/v1/events`、`POST /admin/v1/events/:id/publish`；
- 「状态」段改为「M4 已对接 mock：7 步可前后翻页、保存草稿、发布」；
- 增加 TODO 注释项：`step2/step6 富文本编辑器` / `cover/banner 上传`。

---

### §7. M5+M6 — 票档与库存管理（合并交付）

**目标**：独立页 `/concerts/:id/tickets`，列出演出下所有票档，支持新增、编辑、启用、停售、**库存调整（含 reason + 日志）**。

#### 7.1 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 新增 | `apps/admin/src/pages/TicketManage/index.tsx` | 主页面 |
| 新增 | `apps/admin/src/pages/TicketManage/prd.md` | 新建 PRD（参考 PRD B04） |
| 新增 | `apps/admin/src/pages/TicketManage/components/TicketTable.tsx` | 票档表（操作列） |
| 新增 | `apps/admin/src/pages/TicketManage/components/TicketEditModal.tsx` | 新增/编辑 Modal |
| 新增 | `apps/admin/src/pages/TicketManage/components/StockAdjustModal.tsx` | 库存调整 Modal（含 reason 必填） |
| 新增 | `apps/admin/src/pages/TicketManage/components/StockLogDrawer.tsx` | 调整日志抽屉 |
| 新增 | `apps/admin/src/hooks/useTicketManage.ts` | CRUD + 调整 + 日志查询 |
| 修改 | `apps/admin/src/router/index.tsx` | 注册 `/concerts/:id/tickets` |
| 修改 | `apps/admin/src/pages/ConcertList/components/ActionsColumn.tsx` | 加「票档」入口 |
| 修改 | `apps/admin/src/pages/ConcertList/prd.md` | 在操作列加「票档」 |

#### 7.2 页面布局

```
┌────────────────────────────────────────────────────────┐
│ ← 返回  演出名 / 票档管理                          PRD │
├────────────────────────────────────────────────────────┤
│ [活动基本信息只读卡：名称 / 演出时间 / 销售时间 / 状态] │
├────────────────────────────────────────────────────────┤
│ [+ 新增票档] [调整记录]                                  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 票档 │ 价格 │ 总/可售/锁定/已售 │ 限购 │ 销售时间 │  │  │
│ │      │      │                   │      │          │  │  │
│ │      │      │           操作：编辑/启用/停售/调库 │  │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### 7.3 关键规则（PRD §31 第 8 条 + 业务细节）

- **已有支付订单的票档不允许物理删除**：ticket.status = `sold_out` 或 `soldStock > 0` 或 `lockedStock > 0` 时，删除按钮隐藏，改为「停售」；
- **库存调整必须填 reason**：StockAdjustModal 中 `Input.TextArea` 必填，最少 4 字；
- **adjustStock 后必须写日志**：`stockAdjustments.push({...})`，`Drawer` 内展示 `时间 / 操作人 / 调整量 / before/after / reason`；
- **delta 不能让 available 变负**：mock handler 校验 `available + delta >= 0` → 400009；
- **单价 / 库存任何修改都即时更新 updatedAt**；
- **编辑中改了 status 之外字段不影响 history**：符合 PRD §31 第 7 条「已支付订单不得因为活动修改而改变历史价格」（订单快照独立于票档）。

#### 7.4 M5 交付前同步

新建 `TicketManage/prd.md`：概述、用户场景、页面结构、字段表（票档 16 字段）、接口（5 个）、状态机（available/sold_out/hidden/stopped）、与 M4 票档子表单的关系（迁移/版本说明）。

---

### §8. 全局注意事项（所有模块共用）

#### 8.1 按钮动态样式（AGENTS.md 规范）

所有新页面继续用 `<PrdPanelHost pageKey="Xxx">`，按钮高亮逻辑已经内置，**不要**自己再写一个 PRD 按钮。

#### 8.2 不信任前端价格 / 库存（PRD §31 第 1、2 条）

mock handler 对 `updateEvent` / `updateTicket` / `createOrder` 统一执行：
- 前端传的 `price` 若与当前 mock DB 不一致，**以 mock DB 为准**；
- `availableStock` 永远由 `adjustStock` 流程改写，`updateTicket` 不允许覆盖 `availableStock` 字段；
- 这两条规则在 handler 内通过「黑名单字段」过滤实现，**有单元注释引用 §31 条款**。

#### 8.3 错误码体系（PRD §11）

mock handler 返回的 `code` 严格使用 PRD 第十一节定义值（400001–500001）。`App.useApp().message.error` 优先用 PRD message 文本（已在 §1.6 集中在 `ERROR_CODE`）。

#### 8.4 路由常量扩展

`@trae/shared` 增加 `ADMIN_ROUTES.concertTickets(id)` 后，所有跳转**必须**用此常量，禁止裸字符串。

#### 8.5 状态机白名单共用

所有演出 / 票档状态变更必须经过 `EVENT_TRANSITIONS` / 自建的 `TICKET_TRANSITIONS`（在 `packages/shared/src/constants/ticketStatus.ts` 增加同构白名单）。

---

## Assumptions & Decisions

### A. 设计决策（已锁，模块实施不再讨论）

| # | 决策 | 备选 | 理由 |
|---|---|---|---|
| D1 | Mock 用 axios **adapter** 拦截 | 拦截器 / MSW / 独立 dev server | adapter 完全离线、不引第三方、易于随库发布 |
| D2 | Mock DB 持久化到 **localStorage** | 仅内存 | 刷新页面数据不丢、便于演示与 bug 复现；提供「重置」按钮 |
| D3 | 金额统一为**分** | 元 | 现成工具，避免多处单位混淆 |
| D4 | 状态机集中在 `@trae/shared/constants` | 各模块各自定义 | 与类型集中放一处，避免重复实现规则 |
| D5 | 状态枚举**扩展**而非替换 | 删除旧键重建 | 不破坏现有 prd.md 占位、不破坏 H5 占位 |
| D6 | **不引入** 富文本编辑器 / 图表库 | @tinymce/@wangeditor/echarts | 第一阶段尽量轻；占位 + 明确 TODO |
| D7 | **不引入** react-query / SWR | 用 zustand + useState | 第一阶段列表简单，react-query 在 Phase 4 订单轮询再评估 |
| D8 | 客户端创建走 **React Context + useApi** | 全局单例 | 与 H5 共享工厂模式，未来切换 real backend 不影响调用方 |
| D9 | 票档管理与库存管理合并 | 拆两个页面 | PRD 接口语义本就一体；同一页面表格 + 弹窗更顺 |
| D10 | 不做路由守卫 | 受保护路由 | 登录放在 Phase 7 安全；第一阶段任何 URL 都进得去 |
| D11 | Dashboard 第二排 4 个指标放最前；趋势/分布/订单/用户用占位 Card | 真图表 | 不引图表库，但保留结构 |

### B. 后续阶段需要重新评估

- 当 C 端进入后，**是否需要 MSW** 而非 axios adapter：MSW 能拦截 Service Worker，对 C 端调试更友好；但 axios adapter 已被 admin 大量使用，**一致性优先**，暂不切换。
- 当 Phase 4 进入后，**react-query 是否值得引入**：订单轮询、状态机心跳等都受益。
- 当 Phase 7 进入后，**路由守卫 / 真实登录态 / token 注入** 一并落地，**`installMock` 需要可关**（`VITE_USE_MOCK=false` 切到真后端）。

### C. 风险点

| 风险 | 影响 | 缓解 |
|---|---|---|
| antd v6 `Tabs` 在某些组件被标记 deprecated，**优先用 Steps** | Tabs 占位 → 替换 | M4 直接用 Steps；M3 / Dashboard 不需要 Tabs |
| Steps 表单翻页丢字段 | 用户体验差 | 用 zustand persist + `useBlocker` 拦截离开 |
| mock 路由正则匹配 `events/:id/tickets` 与 `tickets/:id/*` 顺序敏感 | handler 错配 | router 表按「最长前缀优先」排序；handler 单元断言覆盖 |
| localStorage 5MB 上限塞爆 | seed 数据过大 | seed 只放 30 场 + 80 票档 + 120 订单，远低于 1MB |
| mock 数据的 ID 自增跨标签页不一致 | 多窗口演示 | 在 store 中用 `Math.max(localStorage.lastId, ...)` 同步 |
| DevMockToolbar 浮在生产构建中 | 安全 | `import.meta.env.DEV` 守门 + 动态 import |
| Steps 内嵌表格在 iPad 横屏（<1280px）错位 | 移动端体验 | 表格加 `scroll={{ x: 1000 }}`；Body min-width 不影响（admin 不做移动端） |
| antd v6 `App.useApp()` 在 StrictMode 双调用导致 message 重复 | 噪音 | 已用 `<App as AntdApp>` 包裹，符合规范 |
| 创建草稿后立即点「发布」可能未等 Promise resolve | 体验 | 按钮 `loading` 状态 + 二次确认前禁用 |

---

## Verification

### V1. 模块级验证清单（每个 M1–M6 交付前都要跑一遍）

| 项 | 命令 / / 操作 | 通过标准 |
|---|---|---|
| 类型检查 | `bash scripts/typecheck.sh` | 0 错误 |
| 代码规范 | `bash scripts/lint.sh` | 0 错误 |
| 格式 | `bash scripts/format.sh check` | 0 差异 |
| 构建 | `bash scripts/build.sh` | 4 个包均产出 dist |
| Admin 启动 | `bash scripts/dev.sh admin` | 浏览器 `http://localhost:5174/` 打开正常 |
| Mock 初始化 | 首次打开 admin | localStorage `concert_mock_db_v1` 已写入；30 条 seed 演出可见 |
| 关键路径手测 | 至少执行：登录 → Dashboard → 演出列表 → 新建 → 7 步走完 → 保存草稿 → 编辑 → 发布 | UI 与 PRD B0X 一致；所有按钮有反馈 |
| 错误码 | 故意触发：库存调整超额 / 删除已发布活动 | 弹错误提示，文案对应 PRD 第十一节 code 表 |
| 状态机 | 草稿不能直接到 on_sale；只能 published→on_sale | 非法转移按钮被禁用 |
| 路由守卫软验证 | 直接访问 `/concerts/abc/edit`（id 不存在） | 列表返回空；mock 端返回 400003 |
| PRD 同步 | `git diff apps/admin/src/pages/<Module>/prd.md` | 与代码行为一致；接口路径前缀 `/admin/v1/` |
| 移动端无关 | 仅检查 dashboard / 列表在 1280px 下不破版 | min-width 1280px 生效 |

### V2. Phase 1 整体验收（在 M6 完成后跑一次）

| 项 | 操作 | 通过标准 |
|---|---|---|
| 数据闭环 | 新建 A 演出 → 配 2 个票档 → 发布 → 调整其中一个票档库存（reason: 测试） → 查看调整日志 | 列表展示 A、Dashboard「活动总数」+1、销售中+1、库存调整日志显示记录 |
| 状态闭环 | A 状态 `on_sale` → 手动 stop-sale → 列表 Tag 变「已暂停」 → resume-sale → 回到「售票中」 | 状态机白名单内的所有操作按钮可点；白名单外按钮 disabled |
| 持久化 | 浏览器刷新 → 数据仍在 → 关闭并重新打开浏览器 → 数据仍在 | localStorage 生效 |
| 重置 | 点 DevMockToolbar 重置 → 数据回到 30 条 seed | localStorage 被覆写；列表回到初始 |
| 并发不破坏 | 同时开两个 admin tab，都做新建 | ID 自增不冲突 |
| PRD 文档一致性 | 人工读 prd.md 与代码比对 | 字段名、接口、状态枚举完全一致 |
| 构建产物可预览 | `bash scripts/build.sh admin && cd apps/admin && ../../node_modules/.bin/vite preview` | 静态文件打开仍能加载 mock 数据 |

### V3. 不在本阶段验收（明确不做）

- 真实登录、token、401 跳转；
- C 端 H5 任何功能；
- 订单模块、用户模块、导出、权限；
- 富文本编辑器、图片上传、地图选址；
- 性能压测、E2E 自动化、单元测试覆盖率门槛（**M5 进入时引入轻量 vitest 跑 handler 状态机**，避免无限扩大）。

---

## Appendix A — 模块交付节奏（与 AGENTS.md 强一致）

每个 M1–M6 模块交付时**严格按以下顺序**：

1. **修改代码**（TypeScript + antd + zustand + axios adapter）；
2. **运行 V1 全部检查项**；
3. **同步 `prd.md`**：若字段 / 接口 / 状态有变化，先改代码后改文档；
4. **提交并停下等用户确认**：在用户给出反馈前**不**进入下一个模块；
5. 用户确认后再启动下一个模块。

> M5 + M6 合并为一次交付点（共享同一页面 + 同一 PRD）。

---

## Appendix B — 关键文件总览

```
trae-6/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── types/{concert,ticket,common}.ts        [M1 扩展]
│   │       └── constants/
│   │           ├── eventStatus.ts                       [M1 新增]
│   │           ├── ticketStatus.ts                      [M1 扩展]
│   │           ├── routes.ts                            [M1 扩展 concertTickets]
│   │           └── errorCode.ts                         [M1 新增]
│   └── api/
│       └── src/
│           ├── client.ts                                [M1 改造 mock 选项]
│           ├── modules/
│           │   ├── adminEvent.ts                        [M1 新增]
│           │   ├── adminTicket.ts                       [M1 新增]
│           │   └── adminDashboard.ts                    [M1 新增]
│           └── mock/
│               ├── types.ts                             [M1 新增]
│               ├── seed.ts                              [M1 新增]
│               ├── store.ts                             [M1 新增]
│               ├── router.ts                            [M1 新增]
│               ├── adapter.ts                           [M1 新增]
│               ├── index.ts                             [M1 新增]
│               └── handlers/{event,ticket,dashboard,order}.ts  [M1 新增]
└── apps/admin/src/
    ├── main.tsx                                          [M1 改造：client + ApiProvider]
    ├── contexts/ApiContext.tsx                           [M1 新增]
    ├── components/
    │   ├── DevMockToolbar.tsx                            [M1 新增]
    │   ├── MetricCard.tsx                                [M2 新增]
    │   ├── PrdButton.tsx                                 [M0 已有，复用]
    │   ├── PrdSidePanel.tsx                              [M0 已有，复用]
    │   └── PrdPanelHost.tsx                              [M0 已有，复用]
    ├── hooks/
    │   ├── useDashboard.ts                               [M2 新增]
    │   ├── useEventList.ts                               [M3 新增]
    │   ├── useConcertEdit.ts                             [M4 新增]
    │   └── useTicketManage.ts                            [M5 新增]
    ├── stores/concertDraftStore.ts                       [M4 新增]
    ├── pages/
    │   ├── Dashboard/{index.tsx,prd.md}                  [M2]
    │   ├── ConcertList/{index.tsx,prd.md}                [M3]
    │   │   └── components/{FilterBar,ActionsColumn}.tsx  [M3]
    │   ├── ConcertEdit/{index.tsx,prd.md}                [M4]
    │   │   └── steps/Step{1..7}.tsx                      [M4]
    │   └── TicketManage/                                 [M5 新建目录]
    │       ├── index.tsx
    │       ├── prd.md
    │       └── components/{TicketTable,TicketEditModal,StockAdjustModal,StockLogDrawer}.tsx
    └── router/index.tsx                                  [M5 增 /concerts/:id/tickets]
```

---

## Appendix C — Mock Seed 数据规模

| 实体 | 数量 | 说明 |
|---|---|---|
| 演出 | 30 | 覆盖 10 个状态至少各 2 条 |
| 票档 | 80 | 平均每场 2-3 个票档，价格 280-2580 元 |
| 库存调整记录 | 0 | 留空让 M5 演示时动态写入 |
| 订单 | 120 | 给 Dashboard「订单总数 / 销售金额 / 今日」提供真实数据 |
| 用户 | 50 | 给 Dashboard「注册用户」提供种子 |

seed 文件位于 `packages/api/src/mock/seed.ts`，通过 `resetDB()` 调用 `deepClone(defaultDB)` 写入 localStorage。

---

**第一阶段实施计划完。下一阶段（Phase 3 C 端购票）将在 Phase 1 全部模块经用户确认后再行起草。**