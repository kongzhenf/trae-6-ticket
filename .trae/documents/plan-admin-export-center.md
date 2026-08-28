# 管理后台「导出中心」实施计划

> 计划范围：管理后台新增"导出任务"独立模块，覆盖创建导出 → 任务列表 → 真实下载 Excel（CSV-U8 + BOM，后缀 .xls）。
> 设计目标：与既有 `adminOrder` 模块一致风格（共享层 → API → mock handler → 页面）。
> 本期所有功能以 mock 数据实现（DB 走 localStorage），不依赖真实后端 cron。

## 1. Summary

在管理后台侧栏新增「导出中心」入口，承担：
1. **创建导出**：用户选一个演出 + 订单状态 + 支付状态 + 时间区间 → 异步生成导出任务
2. **任务列表**：10 列（任务编号 / 导出类型 / 演出名称 / 订单数量 / 订单状态 / 支付状态 / 创建人 / 创建时间 / 状态 / 下载）
3. **真实下载**：点击"下载"按钮触发浏览器下载 Excel 文件（CSV-U8 + BOM + .xls 后缀，Excel 可直接打开；多观演人订单每位观演人独占一行，姓名 / 身份证 / 手机号重复该订单其它字段）
4. **异步模拟**：mock 端用 `setTimeout` 模拟任务状态机 `pending → processing → completed / failed`（约 2-3 秒完成）
5. **下载链接有效期**：7 天过期；过期任务状态显示"已过期"且禁用下载

## 2. Current State Analysis

### 2.1 既有模块
- `apps/admin/src/pages/OrderManage/`（H9 订单管理）— 含 FilterBar / OrderTable / OrderDetailDrawer / useOrderList / RefundMockDialog；接 `adminOrderApi`
- `apps/admin/src/pages/ConcertEdit/`、`ConcertList/`、`TicketManage/`、`Dashboard/`、`UserManage/`、`ViewersManage/`
- `apps/admin/src/router/index.tsx`：注册了 `dashboard / concerts / orders / users / users/viewers` 5 个路由
- `apps/admin/src/layouts/BasicLayout.tsx`：侧栏 menuItems
- `apps/admin/src/components/PrdPanelHost.tsx`：PRD 侧边栏统一容器（AGENTS.md 强制要求）

### 2.2 既有 mock 模式
- `packages/api/src/mock/router.ts`：按"最长前缀优先"注册路由
- `packages/api/src/mock/handlers/adminOrder.ts`：
  - 三个 handler：`listOrders(ctx)` / `getOrderDetail(ctx)` / `refundOrder(ctx)`
  - 通过 `getDB()` / `persist()` 同步写 localStorage
  - `toAdminView(order, db)` 统一 join eventName / ticketTierSummary / userMobile
- `packages/api/src/mock/types.ts`：
  - `MockDB = { events, ticketTiers, stockAdjustments, orders, users, viewers, counters }`
  - `MockError` 抛错 → axios 拒绝 → 前端 catch
- `packages/api/src/mock/store.ts`：`getDB()` / `persist()` / `resetDB()` / `nextId(kind)` / `expireOrders()`

### 2.3 既有 API 模块
- `packages/api/src/modules/adminOrder.ts`：3 个方法
- `apps/admin/src/contexts/apiTypes.ts`：`AdminApis` 类型
- `apps/admin/src/contexts/ApiContext.tsx`：通过 `useApi()` 注入

### 2.4 既有共享层
- `packages/shared/src/types/order.ts`：`Order` / `OrderAdminView` / `AdminOrderQuery` / `OrderItem` / `Viewer` / `PayMethod`
- `packages/shared/src/constants/orderStatus.ts` / `paymentStatus.ts` / `routes.ts` / `errorCode.ts`
- `packages/shared/src/utils/format.ts`：`formatMoney` / `formatDate` / `maskPhone` / `maskIdCard`
- 错误码：400012（订单不存在）、400025 / 400026（退款）

### 2.5 关键发现
1. **无 xlsx 库**：根 `package.json` / `apps/admin/package.json` 都没有 `exceljs` / `xlsx` / `file-saver` 依赖。新增依赖会涉及工作区重新装包 + 锁文件。→ **决策：用 CSV-U8 + BOM + `.xls` 后缀**，Excel 可直接双击打开；纯浏览器 `Blob` 下载，零新依赖。
2. **多观演人展开**：当前 `Order` 是 `viewers: Viewer[]`（`plan-order-viewers` 已实装"一票一观演人"），导出时需要"按观演人行展开"：3 位观演人 → 3 行，订单号/金额/支付状态等公共字段在每行重复。
3. **状态机**：用户的需求只列了 3 个状态（生成中 / 已完成 / 失败）；我们额外增加"已过期"作为下载链接过期态（用户原话："下载链接建议设置有效期"）。→ 内部用 4 态：`processing` / `completed` / `failed` / `expired`。
4. **下载链接有效期**：7 天；过期检查在 list 阶段做（按 `expireAt` 与 `now` 比较）。
5. **任务存储**：`MockDB.exportTasks: ExportTask[]` + 计数器 `exportTaskId`；与 `orders` 一样走 localStorage 持久化。
6. **创建人**：mock 端默认填 `'admin-1'`（与 `Concert.creatorId` 同语义；后续可从 auth 注入）。
7. **导出字段**：用户列了 16 字段，其中"单价 / 数量 / 订单金额"按当前 `OrderItem` 拆出 → 每个观演人行携带 `unitPrice * quantity` 一份（不变，因为 `quantity` 已是整张订单的票数）。

## 3. Proposed Changes

### 3.1 共享层

#### 3.1.1 新增类型 `packages/shared/src/types/exportTask.ts`
```ts
export type ExportTaskStatus = 'processing' | 'completed' | 'failed' | 'expired'
export interface ExportTaskFilter {
  eventId: string
  orderStatus?: OrderStatus[]  // 空数组 = 全部
  paymentStatus?: PaymentStatus[]  // 空数组 = 全部
  createdAtRange: [string, string]  // ISO
}
export interface ExportTask {
  id: string                    // EXP-时间戳-自增
  taskNo: string                // EXP20260827001
  type: 'order'                 // 预留多类型，本期只支持 order
  eventId: string
  eventName: string             // 冗余存，避免活动改名后历史任务失真
  filter: ExportTaskFilter
  orderCount: number            // 命中订单数
  orderStatuses: OrderStatus[]  // 用于列表展示（创建时的多选）
  paymentStatuses: PaymentStatus[]
  createdBy: string             // 'admin-1'
  createdAt: string             // ISO
  status: ExportTaskStatus
  errorMessage?: string
  /** ISO；completed 时写 = createdAt + 7d；客户端按此判断 expired */
  expireAt: string
  /** mock 端把生成好的 CSV 内容 base64 存这里；真实场景会指向对象存储 */
  payloadBase64?: string
}
export type CreateExportPayload = Omit<
  ExportTask,
  'id' | 'taskNo' | 'eventName' | 'orderCount' | 'createdBy' | 'createdAt' | 'status' | 'expireAt' | 'payloadBase64' | 'errorMessage'
>
```
桶式 export：在 `packages/shared/src/index.ts` 加 `export * from './types/exportTask'`。

#### 3.1.2 错误码 `packages/shared/src/constants/errorCode.ts`
- 400030：导出任务不存在
- 400031：导出任务未完成 / 已失败 / 已过期，无法下载
- 400032：必须选择一个演出
- 400033：时间区间不合法（end < start）

#### 3.1.3 路由常量 `packages/shared/src/constants/routes.ts`
```ts
exportCenter: '/exports',
exportTaskDetail: (id: string | ':id' = ':id') => `/exports/${id}`,
```

#### 3.1.4 状态 Meta `packages/shared/src/constants/exportStatus.ts`（新增）
```ts
export const EXPORT_STATUS: Record<ExportTaskStatus, { label: string; color: 'processing' | 'success' | 'error' | 'default' }> = {
  processing: { label: '生成中', color: 'processing' },
  completed:  { label: '已完成', color: 'success' },
  failed:     { label: '失败',   color: 'error' },
  expired:    { label: '已过期', color: 'default' },
}
export const EXPORT_STATUS_LIST: ExportTaskStatus[] = ['processing', 'completed', 'failed', 'expired']
```
桶式 export。

### 3.2 API 层

#### 3.2.1 新增 `packages/api/src/modules/adminExport.ts`
```ts
export const adminExportApi = (client: AxiosInstance) => ({
  listTasks: (q: PageQuery): Promise<PageResult<ExportTask>> =>
    client.get('/admin/v1/exports', { params: q }).then(r => r.data as PageResult<ExportTask>),
  createTask: (payload: CreateExportPayload): Promise<ExportTask> =>
    client.post('/admin/v1/exports', payload).then(r => r.data as ExportTask),
  getTask: (id: string): Promise<ExportTask> =>
    client.get(`/admin/v1/exports/${id}`).then(r => r.data as ExportTask),
  /** 前端用此方法把后端 base64 解析为 Blob；mock handler 直接返回 { base64, filename } */
  downloadTask: (id: string): Promise<{ base64: string; filename: string; mime: string }> =>
    client.get(`/admin/v1/exports/${id}/download`).then(r => r.data),
})
```
导出此模块 + `CreateExportPayload` 在 `packages/api/src/index.ts`。

#### 3.2.2 注入 `apps/admin/src/contexts/apiTypes.ts` 与 `ApiContext.tsx`
- `AdminApis` 加 `adminExport: ReturnType<typeof adminExportApi>`
- `ApiProvider` 注入

### 3.3 Mock 层

#### 3.3.1 扩展 `packages/api/src/mock/types.ts`
```ts
export interface MockDB {
  ...  // 既有
  /** H10 新增：导出任务 */
  exportTasks: ExportTask[]
  counters: { ...; exportTaskId: number }
}
```

#### 3.3.2 Seed 初始化
`packages/api/src/mock/seed.ts` 的 `buildDefaultDB()`：
- `exportTasks: []`
- `counters.exportTaskId: 80000`
`mergeWithDefault` 兼容旧数据：缺则补 `[]` 和 `80000`。

#### 3.3.3 新增 handler `packages/api/src/mock/handlers/adminExport.ts`
四个 handler：
- `listTasks(ctx)`：从 `db.exportTasks` 倒序返回；带 `eventId` 过滤；page / pageSize 分页
- `createTask(ctx)`：
  1. 校验 `eventId` 存在（400032 缺 / 400003 活动不存在）
  2. 校验 `createdAtRange` 起止（400033）
  3. 调 `listOrders` 相同过滤逻辑得命中订单
  4. 创建 `ExportTask`，`status='processing'`，`expireAt=now+7d`，`taskNo=EXP+YYYYMMDD+4位自增`
  5. `setTimeout(..., 2500)` 模拟生成：
     - 成功：算 `orderCount`、拼 CSV → base64 → 写 `payloadBase64` → `status='completed'`
     - 失败：5% 概率（可控种子）`status='failed'` + `errorMessage`
  6. 立即返回 `ExportTask`（用户先看到"生成中"，轮询刷新列表）
- `getTask(ctx)`：400030 / 400031 视情况（本期只查）
- `downloadTask(ctx)`：
  - 任务不存在 → 400030
  - 状态非 `completed` → 400031
  - `expireAt < now` → 改 `status='expired'` 后抛 400031
  - 返回 `{ base64, filename, mime }`

CSV 拼装（内部小工具函数）：
- 头部：`演出名称,演出时间,场馆,订单号,用户ID,联系手机号,观演人姓名,观演人身份证号,票档,单价,数量,订单金额,支付状态,订单状态,下单时间,支付时间`
- 行展开：每个 `order` × `viewer`，按顺序展开；每行均含订单公共字段；票档 = `items[0].categoryNameSnapshot`；单价 = `items[0].unitPrice`（元）；数量 = `items[0].quantity`；订单金额 = `payAmount/100` 元；下单/支付/演出时间 `formatDate`；状态中文 label
- 字段含 `,` / `"` / 换行 时用 RFC 4180 加引号
- UTF-8 BOM (`\ufeff`) 拼在最前，避免 Excel 打开中文乱码
- 文件名：`订单导出_{event.eventName}_{taskNo}.xls`

#### 3.3.4 路由 `packages/api/src/mock/router.ts`
按"长前缀优先"在 `adminOrder` 段附近插入：
```ts
{ method: 'GET',  pattern: re('/admin/v1/exports/([^/]+)/download'), handler: (ctx) => import('./handlers/adminExport').then(m => m.downloadTask(ctx)) },
{ method: 'GET',  pattern: re('/admin/v1/exports/([^/]+)'),            handler: (ctx) => import('./handlers/adminExport').then(m => m.getTask(ctx)) },
{ method: 'GET',  pattern: re('/admin/v1/exports'),                    handler: (ctx) => import('./handlers/adminExport').then(m => m.listTasks(ctx)) },
{ method: 'POST', pattern: re('/admin/v1/exports'),                    handler: (ctx) => import('./handlers/adminExport').then(m => m.createTask(ctx)) },
```
注意顺序：`/exports/:id/download` 必须在 `/exports/:id` 之前。

### 3.4 前端页面

#### 3.4.1 入口
- `apps/admin/src/router/index.tsx`：新增 `{ path: 'exports', element: <ExportCenter /> }`
- `apps/admin/src/layouts/BasicLayout.tsx`：menuItems 加 `{ key: ADMIN_ROUTES.exportCenter, icon: <DownloadOutlined />, label: '导出中心' }`

#### 3.4.2 新建 `apps/admin/src/pages/ExportCenter/`
- `index.tsx`：包裹 `<PrdPanelHost pageKey="ExportCenter">`（AGENTS.md 强制）
- `components/CreateExportCard.tsx`：创建表单
  - 演出名称：复用 `FilterBar` 的远端搜索 `Select`（`adminEventApi.listEvents({ keyword })`），`mode={undefined}`（**单选**）
  - 订单状态：多选 `Select`，选项来自 `ORDER_STATUS_LIST`
  - 支付状态：多选 `Select`，选项来自 `PAYMENT_STATUS_LIST`
  - 时间区间：`RangePicker`（创建时间）
  - 「导出」按钮 → 调 `adminExport.createTask({ eventId, orderStatus, paymentStatus, createdAtRange })` → 成功 toast「已创建导出任务，预计 2-3 秒完成」→ `refresh()` 刷新任务列表
- `components/TaskListTable.tsx`：任务列表
  - 列：任务编号（可复制 mono）/ 导出类型（Tag `order`）/ 演出名称（链向 `concertEdit`）/ 订单数量（带千分位）/ 订单状态（多个 Tag 拼接）/ 支付状态（多个 Tag 拼接）/ 创建人 / 创建时间 / 状态（Tag）/ 下载（按钮）
  - 状态为 `processing` 时：下载按钮 disabled + Spin
  - 状态为 `completed` 时：调 `adminExport.downloadTask(id)` → `atob(base64)` → `new Uint8Array(...)` → `Blob([bytes], { type: mime })` → `URL.createObjectURL` + `<a download={filename}>.click()`
  - 状态为 `failed` / `expired` 时：disabled + Tooltip
  - 自动刷新：`status==='processing'` 时每 1.5s `refresh` 一次
- `hooks/useExportTaskList.ts`：列表 hook（query / list / total / loading / refresh）

#### 3.4.3 PRD
- `apps/admin/src/pages/ExportCenter/prd.md` v1.0：按 16 字段定义 + 状态机 + 下载协议 + 隐私说明
- 顶部遵守 AGENTS.md：右上角自动出现"PRD"按钮

### 3.5 验证
- `bash scripts/typecheck.sh`：0 错
- `bash scripts/lint.sh`：0 错 0 警告
- `bash scripts/build.sh`：4 包成功
- 浏览器手测：
  1. 侧栏出现"导出中心" → 路由 `/exports` 渲染卡片
  2. 选一个演出 + 不选状态 + 不选时间 → 导出 → 列表立刻多一条（生成中）→ 约 2-3 秒变已完成
  5. 点击"下载" → 浏览器下载 `订单导出_周杰伦 xxx_xxx.xls` → Excel 双击打开 → 16 列齐全
  6. 含 3 位观演人的订单 → 文件中该订单号占 3 行，姓名/身份证/手机号均不同
  7. 把任务 `expireAt` 改到过去（DevMockToolbar）→ 列表状态变"已过期"→ 下载按钮 disabled

## 4. Assumptions & Decisions

| 假设 | 决策 | 原因 |
|---|---|---|
| 导出文件格式 | **CSV-U8 + BOM + `.xls` 后缀** | 项目无 xlsx 依赖；Excel 可直接打开中文 CSV；零依赖 |
| 异步状态机 | `processing` / `completed` / `failed` / `expired` | 用户列了 3 态；额外加 `expired` 对应"下载链接有效期"语义 |
| 链接有效期 | **7 天** | 用户建议设置有效期；mock 端在 download 时校验 |
| 创建人 | `'admin-1'` | mock 端无 auth；与 `Concert.creatorId` 一致；后续接 auth 直接替换 |
| 任务 ID 命名 | `EXP + YYYYMMDD + 4位自增`（`EXP202608270001`） | 与 `CON` 订单号同风格；可读 |
| 任务存储 | `MockDB.exportTasks[]` + 计数器 `exportTaskId` 起步 80000 | 复用 localStorage 模式 |
| 文件存储 | base64 存 `payloadBase64` | mock 端可自包含；真实场景指向对象存储 URL |
| 自动刷新 | `status==='processing'` 时 1.5s 轮询 | 用户不点刷新也能看到状态变化 |
| 单选演出 | `Select` 不带 `mode`，单值 | 需求明确"仅支持选择一场演出" |
| 字段顺序 | 严格按用户给的 16 字段顺序（含"联系手机号"而非"手机号"） | 尊重需求 |
| 行展开策略 | 每观演人一行（多观演人重复订单公共字段） | 用户原话"如一个订单含有3位观演人，则这3个人的姓名、身份证号、手机号均需要导出" |
| 票档/单价/数量 | 取 `items[0]`（单票档约束） | 与 `plan-order-viewers` 强约束一致 |
| 时间格式 | `formatDate` 默认 `YYYY-MM-DD HH:mm` | 与订单管理一致 |
| 脱敏 | 导出文件**不做脱敏** | 用户说"联系手机号/观演人身份证号"——导出是给运营/财务用的，**明文出**；在 prd.md 单独声明"导出数据按内部数据使用，请勿外发" |
| 数量限制 | 时间区间跨度 ≤ 92 天（防止一次性导出过多） | mock 演示用；超限 400034 |
| 错误码 | 400030 / 400031 / 400032 / 400033 / 400034 | 预留扩展 |

## 5. Files to Create / Modify

### 新建
- `packages/shared/src/types/exportTask.ts`
- `packages/shared/src/constants/exportStatus.ts`
- `packages/api/src/modules/adminExport.ts`
- `packages/api/src/mock/handlers/adminExport.ts`
- `apps/admin/src/pages/ExportCenter/index.tsx`
- `apps/admin/src/pages/ExportCenter/prd.md`
- `apps/admin/src/pages/ExportCenter/components/CreateExportCard.tsx`
- `apps/admin/src/pages/ExportCenter/components/TaskListTable.tsx`
- `apps/admin/src/pages/ExportCenter/hooks/useExportTaskList.ts`

### 修改
- `packages/shared/src/index.ts`：桶式 export 新增类型 + 状态
- `packages/shared/src/constants/errorCode.ts`：5 个新错误码
- `packages/shared/src/constants/routes.ts`：2 个新路由
- `packages/api/src/index.ts`：export `adminExportApi`
- `packages/api/src/mock/router.ts`：4 个新路由
- `packages/api/src/mock/types.ts`：`MockDB` 加 `exportTasks` + counter
- `packages/api/src/mock/seed.ts`：`buildDefaultDB` 初始化
- `apps/admin/src/router/index.tsx`：注册新路由
- `apps/admin/src/layouts/BasicLayout.tsx`：侧栏菜单
- `apps/admin/src/contexts/apiTypes.ts`：`AdminApis` 加 `adminExport`
- `apps/admin/src/contexts/ApiContext.tsx`：注入 `adminExport`

## 6. Out of Scope
- 多类型导出（活动 / 票档 / 用户）—— 本期只做 `order`
- 真实对象存储（S3 / OSS）—— mock 端用 base64 存 localStorage
- 邮件通知 / Webhook —— 本期不做
- 任务取消 / 重试 / 删除 —— 本期不做
- 导出定时任务 / cron —— 本期不做
- 文件大小 / 行数限制前端校验 —— 仅 mock 端 400034 做后端校验
