# 管理后台「订单管理 B05」模块实施计划

> 工作目录：`/Users/kzf/Documents/trae-6`
> 文档定位：在 B05 PRD（4.5 订单管理 + 第八节后台 API）基础上，**对齐 C 端 plan-order-viewers 已经做出的下单结构调整**（单票档单选 + `Order.viewers[]` 顶层数组 + `contactPhone` + 用户级观演人），落地管理后台"订单管理"模块。
> 文档约束：遵守 `AGENTS.md` 全部规范（PRD 侧边栏 / PRD 同步 / 中文回复）；金额单位统一**分**；状态机集中在 `@trae/shared/constants`；不可变历史由 mock handler 强制（PRD §31 第 7 条）。

---

## Summary

| 阶段 | 范围 | 状态 |
|---|---|---|
| O-1 | 共享层补齐：B05 查询条件枚举、状态拆分（订单状态 vs 支付状态）、路由 `ADMIN_ROUTES.orderDetail`、错误码补 `400025`（活动不存在/已停售） | 待开发 |
| O-2 | Mock 后端：新增 `adminOrderApi` 三个 handler（`listOrders`/`getOrderDetail`/`refundOrder`）+ 注册 `/admin/v1/orders*` 路由 + 兼容 C 端已有 `/api/v1/orders*`；订单 seed 补 `viewers` 与 `contactPhone` | 待开发 |
| O-3 | API 模块：新增 `packages/api/src/modules/adminOrder.ts`；`orderApi` 增加 `refundOrder` 占位（仅 UI 弹窗用） | 待开发 |
| O-4 | Admin 上下文：`ApiContext` / `apiTypes` 注入 `adminOrder` | 待开发 |
| O-5 | 页面重写：`OrderManage/index.tsx` 拆为子组件 + `useOrderList` hook + `OrderDetailDrawer` 完整版；查询条件扩到 10 项；表格列对齐 B05；状态 Tab 拆分「订单状态 / 支付状态」 | 待开发 |
| O-6 | 详情 Drawer 增强：基本信息 / 票档明细 / 观演人表（脱敏）/ 支付信息 / 入场码；操作列新增「退款」按钮（**仅 UI 弹窗**） | 待开发 |
| O-7 | 验证 + PRD 同步（`OrderManage/prd.md` v1.2） | 待开发 |

业务决策（已与用户确认）：

1. **范围聚焦**：以 B05 为基础，对齐 C 端 plan-order-viewers 已落地的下单结构调整（单票档 + `viewers[]` + `contactPhone`），确保管理后台能完整支持现有 C 端产生的订单数据。
2. **退款实现深度**：仅做 UI 占位弹窗（输入退款原因、确认金额），不实际调用后端 refund handler；如需启用，按钮可一键切换到真接口（设计留 hook）。

---

## Current State Analysis

### 已具备的资产（直接复用，无需重写）

| 资产 | 路径 | 用途 |
|---|---|---|
| `Order` 完整类型 | `packages/shared/src/types/order.ts` | 已含 `viewers`、`contactPhone`、`items`、`entryCode`、`paidAt`/`refundedAt`/`cancelledAt` |
| `OrderItem` / `Viewer` / `ViewerInput` 类型 | `packages/shared/src/types/{order,viewer}.ts` | 直接复用 |
| 状态枚举 | `packages/shared/src/constants/orderStatus.ts` | `ORDER_STATUS` / `ORDER_STATUS_META` 5 态 + `ORDER_STATUS_LIST` |
| 支付状态 | `Order.status` 当前承载「订单 + 支付」二义性 | **O-1 拆分**：新增 `PAYMENT_STATUS` 枚举（unpaid / paying / paid / refunding / refunded / failed） |
| 工具 | `packages/shared/src/utils/format.ts` | `formatMoney` / `formatDate` / `maskPhone` / `maskIdCard` 全部就位 |
| 路由常量 | `packages/shared/src/constants/routes.ts` | `ADMIN_ROUTES.orderManage` 已有；**O-1 新增** `ADMIN_ROUTES.orderDetail(id)` |
| 错误码 | `packages/shared/src/constants/errorCode.ts` | 400012-400024 已有；**O-1 补 400025**「订单已退款/已取消，不可重复退款」 |
| API 客户端 | `packages/api/src/client.ts` | 已含 mock 注入；复用 |
| 现有 OrderManage | `apps/admin/src/pages/OrderManage/index.tsx` | 3 筛 + 9 列表 + 页面内 Drawer；**O-5 整体重写**为子组件化 |
| PRD 按钮 | `apps/admin/src/components/{PrdButton,PrdSidePanel,PrdPanelHost}.tsx` | 继续使用，无需新建 |
| 观演人管理 | `apps/admin/src/pages/ViewersManage/` | 已只读实装，可在详情中点击观演人 → `/users/viewers?userId=` 跳转 |
| ApiContext | `apps/admin/src/contexts/ApiContext.tsx` | 已含 `order / user / viewer`；**O-4 注入** `adminOrder` |
| 菜单 | `apps/admin/src/layouts/BasicLayout.tsx` | 「订单管理」菜单项已就位 |
| 路由 | `apps/admin/src/router/index.tsx` | `/orders` 已注册；**O-5 可选**加 `orderDetail` 独立页（默认 Drawer 内嵌） |
| DevMockToolbar | `apps/admin/src/components/DevMockToolbar.tsx` | 已含「重置 mock」按钮；可顺便展示订单统计 |

### 需要补的资产

1. **`PAYMENT_STATUS` 枚举** + `PAYMENT_STATUS_META` 标签映射（拆分订单状态 vs 支付状态）
2. **后台订单专用查询参数**：`AdminOrderQuery` 类型（覆盖 B05 10 项）
3. **`ADMIN_ROUTES.orderDetail(id)` 路由常量**
4. **Mock handler 三件套**：
   - `listOrdersAdmin(ctx)`：按 10 项筛选 + 分页；返回 `Order & { eventName, ticketTierSummary, viewerCount, contactPhone }`
   - `getOrderDetailAdmin(ctx)`：同结构单条
   - `refundOrder(ctx)`：状态机校验（paid → refunding → refunded），写 `refundedAt`；**O-6 不调用，仅 mock 落库**
5. **Mock router 注册**：`GET /admin/v1/orders`、`GET /admin/v1/orders/:id`、`POST /admin/v1/orders/:id/refund`（最长前缀优先）
6. **Seed 订单补字段**：`viewers[]`（从 `db.viewers` 中按 `userId` 随机抽 1-3 条）+ `contactPhone`（从该 user 的 viewer.phone 取一条）
7. **`adminOrderApi` 模块**
8. **OrderManage 重构**：拆 `FilterBar` / `OrderTable` / `OrderDetailDrawer` / `hooks/useOrderList`
9. **`RefundMockDialog` 组件**：UI 占位弹窗

### 与 B05 上传 PRD 的差异（gap）

| 维度 | B05 上传 PRD 要求 | 当前 OrderManage 现状 | 差距 |
|---|---|---|---|
| 路由 | `GET /admin/v1/orders` | 走 `GET /api/v1/orders` | 路径不符（O-2 加 admin 路径，**保留 C 端**） |
| 详情 | `GET /admin/v1/orders/{id}` | 走 `GET /api/v1/orders/:id` | 路径不符（同上） |
| 退款 | `POST /admin/v1/orders/{id}/refund` | 无 | O-2 加 mock handler，O-6 仅 UI 弹窗 |
| 查询条件 | 订单号 / 活动 / 票档 / 手机号 / 姓名 / 身份证号 / 订单状态 / 支付状态 / 创建时间 / 支付时间 | 仅 订单号 / 用户 ID / 状态 | 缺 7 个（O-5） |
| 列表字段 | 订单号 / 活动 / 用户 / 票档 / 数量 / 金额 / **支付状态** / **订单状态** / 创建时间 / **支付时间** | 9 列混合 | 需扩到 10 列并把支付状态独立（O-5） |
| C 端观演人适配 | 文档未强调，但 `plan-order-viewers` 已要求 `viewers[]` | 当前 Drawer 已显示 viewers | 已对齐 |
| C 端联系信息 | 同上 | Drawer 已显示 `contactPhone` | 已对齐 |

### 不在本次范围（明确不做）

- 真实退款（不调用任何第三方支付；不修改 `tier.soldStock`，退款不归库——与现行「售出门票不退库存」业务规则一致；如未来需要退库，再单独迭代）
- 操作日志（PRD 第十九节属于 Phase 7）
- 数据导出（PRD B07 单独模块）
- 高级运营权限分级（PRD 第二十三节属于 Phase 7；本期按「运营」角色可访问）
- 订单状态机的人工主动 cancel（仅支持 C 端 cancel 后台查看，不做后台主动取消）
- 订单修改金额 / 改票档
- 票档维度汇总（聚合报表属 Dashboard 范畴）
- 路由级独立 `/orders/:id` 详情页（**默认 Drawer 内嵌**；如需跳转可后续加 `ADMIN_ROUTES.orderDetail`）

---

## Proposed Changes

### O-1 共享层

#### 文件：`packages/shared/src/types/order.ts`（改）

新增 `AdminOrderQuery`：

```ts
export interface AdminOrderQuery extends PageQuery {
  orderNo?: string
  eventId?: string
  ticketTierId?: string
  userMobile?: string
  viewerName?: string
  viewerIdCard?: string
  orderStatus?: OrderStatus | OrderStatus[]
  paymentStatus?: PaymentStatus | PaymentStatus[]
  createdAtRange?: [string, string]
  paidAtRange?: [string, string]
}
```

`Order` 扩展可选展示字段（在 `OrderRow` 派生类型里用，不动 `Order` 本身）：

```ts
export interface OrderAdminView extends Order {
  eventName: string
  ticketTierSummary: string   // "VIP × 2"
  viewerCount: number
  userMobile?: string         // 从 viewer 拼
}
```

#### 文件：`packages/shared/src/types/payment.ts`（新增）

```ts
export type PaymentStatus =
  | 'unpaid'      // 待支付
  | 'paying'      // 支付中
  | 'paid'        // 已支付
  | 'partial_refund'  // 部分退款（本期不启用，预留）
  | 'refunding'   // 退款中
  | 'refunded'    // 已退款
  | 'failed'      // 支付失败

export interface PaymentStatusMeta {
  label: string
  color: 'default' | 'processing' | 'success' | 'warning' | 'error'
}
```

并在 `packages/shared/src/index.ts` 桶式 export。

#### 文件：`packages/shared/src/constants/paymentStatus.ts`（新增）

```ts
export const PAYMENT_STATUS: Record<PaymentStatus, PaymentStatusMeta> = {
  unpaid:        { label: '未支付',   color: 'default'    },
  paying:        { label: '支付中',   color: 'processing' },
  paid:          { label: '已支付',   color: 'success'    },
  partial_refund:{ label: '部分退款', color: 'warning'    },
  refunding:     { label: '退款中',   color: 'processing' },
  refunded:      { label: '已退款',   color: 'warning'    },
  failed:        { label: '支付失败', color: 'error'      },
}
export const PAYMENT_STATUS_LIST: PaymentStatus[] = [
  'unpaid','paying','paid','partial_refund','refunding','refunded','failed',
]

/** 订单状态 → 默认支付状态映射（用于 OrderRow 派生） */
export function derivePaymentStatus(o: Pick<Order, 'status' | 'paidAt' | 'refundedAt' | 'expireTime'>): PaymentStatus {
  if (o.status === 'paid' && !o.refundedAt) return 'paid'
  if (o.status === 'refunded') return 'refunded'
  if (o.status === 'cancelled') return 'unpaid'  // 默认；若 expired 则切 failed
  if (o.status === 'finished') return 'paid'
  if (o.status === 'pending') {
    if (o.paidAt) return 'paying'
    return Date.parse((o.expireTime as string).replace(' ', 'T') + 'Z') < Date.now() ? 'failed' : 'unpaid'
  }
  return 'unpaid'
}
```

#### 文件：`packages/shared/src/constants/errorCode.ts`（改）

新增：

```ts
400025: '订单已退款或已取消，无法再次退款',
400026: '退款原因至少 4 个字',
```

#### 文件：`packages/shared/src/constants/routes.ts`（改）

新增：

```ts
export const ADMIN_ROUTES = {
  // ...existing
  orderDetail: (id: string | ':id' = ':id') => `/orders/${id}`,
} as const
```

> 注：仅做常量预留，独立详情页本期不做；如后续要 `/orders/:id` 独立页直接挂上。

#### 文件：`packages/shared/src/index.ts`（改）

桶式 export：`AdminOrderQuery`、`OrderAdminView`、`PaymentStatus`、`PaymentStatusMeta`、`PAYMENT_STATUS`、`PAYMENT_STATUS_LIST`、`derivePaymentStatus`。

---

### O-2 Mock 后端

#### 文件：`packages/api/src/mock/handlers/adminOrder.ts`（新建）

```ts
// 三个 handler：
// 1) listOrdersAdmin(ctx) → PageResult<OrderAdminView>
//    - 解析 ctx.query，按 10 项筛；分页；按 createdAt 倒序
//    - 每条 join：eventName（db.events）、ticketTierSummary（"VIP × 2" 或 "VIP × 1 / 看台 × 1"）、
//      viewerCount（order.viewers.length）、userMobile（取 viewers[0].phone 或 user.mobile）
//
// 2) getOrderDetailAdmin(ctx, id) → OrderAdminView
//    - 同 join 逻辑；找不到 400012
//
// 3) refundOrder(ctx, id) → Order
//    - 状态机校验：仅 paid/finished 可退；refunded/cancelled/pending → 400025
//    - body：{ reason: string } 长度 ≥ 4，否则 400026
//    - 写 refundedAt = now；status = 'refunded'；updatedAt
//    - 票档库存不动（已售不退库）
//    - 操作日志：console.info('[admin refund]', ...) 占位（Phase 7 接 audit）
```

**关键实现要点**：

- `ticketTierSummary` 拼装：遍历 `order.items`，输出 `${categoryNameSnapshot} × ${quantity}`，多档用 ` / ` 连接
- `userMobile`：优先 `order.contactPhone`（C 端 plan-order-viewers 字段），fallback 到第一个 viewer.phone，再 fallback 到 user.mobile
- 隐私：`OrderAdminView.contactPhone` / `userMobile` / `viewers[].phone` / `viewers[].idCardCipher` 在 **list 列表**全部脱敏；仅 detail Drawer 可见完整（仍走 `maskPhone` / `maskIdCard` 工具）

#### 文件：`packages/api/src/mock/router.ts`（改）

新增路由（按最长前缀优先放在 `order.ts` 路由附近）：

```ts
{ method: 'GET',    pattern: /^\/admin\/v1\/orders$/,                  handler: h.listOrdersAdmin },
{ method: 'GET',    pattern: /^\/admin\/v1\/orders\/([^/]+)$/,         handler: h.getOrderDetailAdmin },
{ method: 'POST',   pattern: /^\/admin\/v1\/orders\/([^/]+)\/refund$/, handler: h.refundOrder },
```

> 不动原有 `/api/v1/orders*`（C 端仍在用），两者并存。

#### 文件：`packages/api/src/mock/seed.ts`（改）

`buildOrders()` 末尾增加 patch：

```ts
// 1) 给每条 seed 订单补 viewers（从该 user 的 db.viewers 抽 1-3 条）
// 2) 补 contactPhone（取该 user 第一条 viewer 的 phone，否则 user.mobile）
// 3) 若 user 没有 viewer，则 contactPhone = user.mobile
```

> 注意：seed 升级时已经写了 `items` 但没写 `viewers / contactPhone`；patch 让 history 兼容。

#### 文件：`packages/api/src/mock/store.ts`（改）

`dbStats()` 增加 `orderAdmin?: never`（不必要）；保持现状。

`mergeWithDefault()` 已在 history 升级时把 `viewers` 补全；本次不动。

---

### O-3 API 模块

#### 文件：`packages/api/src/modules/adminOrder.ts`（新建）

```ts
import type { AxiosInstance } from 'axios'
import type { AdminOrderQuery, Order, OrderAdminView, PageResult } from '@trae/shared'

export const adminOrderApi = (client: AxiosInstance) => ({
  listOrders: (q: AdminOrderQuery) =>
    client.get('/admin/v1/orders', { params: q }).then(r => r.data.data as PageResult<OrderAdminView>),

  getOrderDetail: (id: string) =>
    client.get(`/admin/v1/orders/${id}`).then(r => r.data.data as OrderAdminView),

  /** 本期 UI 占位用；refund 真实落地在 O-6 决定 */
  refundOrder: (id: string, reason: string) =>
    client.post(`/admin/v1/orders/${id}/refund`, { reason }).then(r => r.data.data as Order),
})
```

#### 文件：`packages/api/src/modules/order.ts`（改）

C 端 `orderApi` 不动（继续走 `/api/v1/orders*`），保持现有 H5 调用方零改动。

#### 文件：`packages/api/src/index.ts`（改）

桶式 export `adminOrderApi`。

---

### O-4 Admin 上下文

#### 文件：`apps/admin/src/contexts/apiTypes.ts`（改）

```ts
import type { adminOrderApi } from '@trae/api'

export interface AdminApis {
  // ...existing
  adminOrder: ReturnType<typeof adminOrderApi>
}
```

#### 文件：`apps/admin/src/contexts/ApiContext.tsx`（改）

```ts
import { adminOrderApi } from '@trae/api'
// buildApis 内：
adminOrder: adminOrderApi(client),
```

---

### O-5 OrderManage 页面重写

#### 文件：`apps/admin/src/pages/OrderManage/index.tsx`（重写）

页面骨架：

```tsx
<PrdPanelHost pageKey="OrderManage">
  <Card>
    <FilterBar value={query} onChange={setQuery} onReset={reset} onSearch={refresh} />
    <OrderTable loading={loading} data={list} pagination={pagination} onChange={handleTableChange} onRow={openDetail} />
  </Card>
  <OrderDetailDrawer open={!!current} order={current} onClose={closeDetail} onRefund={openRefund} />
  <RefundMockDialog open={!!refundTarget} order={refundTarget} onClose={closeRefund} onConfirm={doRefund} />
</PrdPanelHost>
```

#### 文件：`apps/admin/src/pages/OrderManage/components/FilterBar.tsx`（新建）

10 项查询（用 antd `Form` + `Row` + `Col`）：

| 控件 | 字段 | 备注 |
|---|---|---|
| `Input` | 订单号 | 精确匹配 |
| `Select`（远程搜索） | 活动 | `adminEventApi.listEvents({ keyword })` 模糊搜索；value=eventId |
| `Select`（联动） | 票档 | 选中活动后加载 `adminTicketApi.listTickets(eventId)` |
| `Input` | 手机号 | 精确匹配 viewer.phone / contactPhone |
| `Input` | 姓名 | 模糊匹配 viewer.name |
| `Input` | 身份证号 | 精确匹配 viewer.idCardCipher |
| `Select` 多选 | 订单状态 | `ORDER_STATUS_LIST` |
| `Select` 多选 | 支付状态 | `PAYMENT_STATUS_LIST` |
| `DatePicker.RangePicker` | 创建时间 | `createdAtRange` |
| `DatePicker.RangePicker` | 支付时间 | `paidAtRange` |

右侧按钮：「查询 / 重置 / 清空」。

#### 文件：`apps/admin/src/pages/OrderManage/components/OrderTable.tsx`（新建）

10 列 + 1 操作列（按 B05）：

| 列 | 字段 | 宽度 | 备注 |
|---|---|---|---|
| 订单号 | `orderNo` | 160 | 链接样式，点击打开 Drawer |
| 活动 | `eventName` | 200 | ellipsis |
| 用户 | `userId`（手机号脱敏） | 140 | 显示 `maskPhone(userMobile ?? userId)` |
| 票档 | `ticketTierSummary` | 180 | ellipsis |
| 数量 | `items[].quantity` 求和 | 70 | — |
| 金额 | `payAmount` | 110 | `formatMoney` |
| 支付状态 | `paymentStatus` | 100 | Tag，按 `PAYMENT_STATUS` |
| 订单状态 | `status` | 100 | Tag，按 `ORDER_STATUS_META` |
| 创建时间 | `createdAt` | 160 | `formatDate` |
| 支付时间 | `paidAt` | 160 | `formatDate`；空显示「—」 |
| 操作 | — | 120 | 「详情 / 退款」（按状态条件） |

操作按钮可见性：

- `status === 'paid' || status === 'finished'` → 「退款」可点
- `status === 'refunded' || status === 'cancelled'` → 「退款」disabled + tooltip「订单已退款/已取消」
- `status === 'pending'` → 隐藏「退款」（避免歧义）

#### 文件：`apps/admin/src/pages/OrderManage/hooks/useOrderList.ts`（新建）

封装：

```ts
export function useOrderList() {
  const { adminOrder } = useApi()
  const [query, setQuery] = useState<AdminOrderQuery>({ page: 1, pageSize: 20 })
  const [list, setList] = useState<OrderAdminView[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminOrder.listOrders(query)
      setList(res.list)
      setTotal(res.total)
    } finally { setLoading(false) }
  }, [adminOrder, query])

  useEffect(() => { refresh() }, [refresh])
  return { query, setQuery, list, total, loading, refresh }
}
```

#### 文件：`apps/admin/src/pages/OrderManage/components/OrderDetailDrawer.tsx`（新建，从 `index.tsx` 抽出）

Drawer 宽度 640，5 个 `<Descriptions>` 区块：

1. **基本信息**：订单号、用户 ID、用户手机（脱敏）、下单时间、订单状态 Tag、支付状态 Tag
2. **活动信息**：活动名（链向 `/concerts/:id/edit`）、演出时间、场馆
3. **票档明细**：`Table` 列：票档 / 单价 / 数量 / 小计
4. **观演人**：`Table` 列：序号 / 姓名 / 身份证（`maskIdCard`）/ 手机号（`maskPhone`）；空时显示「— 无观演人信息 —」（兼容 C 端旧数据）
5. **支付信息**：支付方式、支付时间、取消时间（如有）、退款时间（如有）、退款原因（如有）、入场码

底部 Footer：左下「关闭」、右下「申请退款」（按状态条件显示，规则同 OrderTable）。

#### 文件：`apps/admin/src/pages/OrderManage/components/RefundMockDialog.tsx`（新建）

UI 占位弹窗（按用户决策，**不实际调 refundOrder**，仅展示 + 记录到 localStorage 草稿）：

- 顶部红色 NoticeBar：「本期退款为 UI 占位演示，未对接真实退款流；如需启用请联系开发」
- 表单：订单号、金额（只读）、退款原因（`Input.TextArea`，≥ 4 字，校验 400026）
- 底部：取消 / 确认（点击后 antd `message.info('已记录退款申请（演示）')` + 关闭弹窗 + 把 `{orderId, reason, ts}` 写入 `localStorage.concert_admin_refund_log`）

> **设计留 hook**：`RefundMockDialog` 内部暴露一个 `useRefundSubmit` 抽象，O-6 后期可一行替换为真 `adminOrder.refundOrder(id, reason)`，不需改 UI 文件。

---

### O-6 联动 + 体验细节

#### 文件：`apps/admin/src/pages/OrderManage/index.tsx`（落地）

- `openDetail(orderId)` → `adminOrder.getOrderDetail(id)` → 写入 `current`
- `openRefund(order)` → 写入 `refundTarget`
- `doRefund()` → 调 `RefundMockDialog` 内部 hook
- 「创建时间 / 支付时间」点击 Drawer 顶部 `RangePicker`，与 FilterBar 双向同步
- 列表行 hover 高亮 +「点击订单号」打开 Drawer（与「操作 > 详情」同效）

#### 文件：`apps/admin/src/pages/OrderManage/prd.md`（改 v1.2）

新增/修订段落：

- **v1.2 变更说明**：本期对齐 C 端 plan-order-viewers 调整；新增支付状态字段；查询条件 10 项；列表 10 列 + 操作列含「退款」按钮（仅 UI 弹窗）；详情 Drawer 5 区块；新增 `RefundMockDialog` 占位
- **接口**：`GET /admin/v1/orders` / `GET /admin/v1/orders/:id` / `POST /admin/v1/orders/:id/refund`（mock 已落，UI 占位）
- **状态机**：订单状态（5 态）+ 支付状态（7 态）双轴；状态机白名单 `paid/finished → refunding → refunded`
- **隐私**：列表手机/身份证一律脱敏；详情仅展示完整 `contactPhone` 与 `viewers[]`
- **操作日志**：本期仅 console.info 占位；Phase 7 接 audit 模块

---

### O-7 验证 + 收尾

| 项 | 命令 / 操作 | 通过条件 |
|---|---|---|
| TS | `bash scripts/typecheck.sh` | 0 错误 |
| Lint | `bash scripts/lint.sh` | 0 错误 |
| Build | `bash scripts/build.sh` | 4 包 dist 成功 |
| Admin dev | `bash scripts/dev.sh admin` | `http://localhost:5174/orders` 打开正常 |
| 列表 | 任意筛 → 列表刷新 | ≤ 500ms |
| 详情 | 点击订单号 → Drawer | 5 区块完整；观演人脱敏 |
| 退款 UI | paid 订单点「退款」 | 弹窗显示订单信息 + 退款原因输入 + 确认；console 打印占位 |
| 退款 disabled | refunded 订单点按钮 | 按钮 disabled + tooltip |
| PRD 侧栏 | 右上角「PRD」按钮 | 滑出 markdown 面板，渲染 v1.2 |
| 状态机 | 模拟 cancelled 订单点退款 | 按钮 disabled |
| 数据隔离 | DevMockToolbar 「重置」 | 列表回 seed |

---

## Assumptions & Decisions

| # | 决策 | 备选 | 理由 |
|---|---|---|---|
| D1 | 同时保留 `/api/v1/orders*`（C 端）+ `/admin/v1/orders*`（管理端）两套 | 迁移 C 端到 `/admin` | C 端已上线；改动 C 端风险大；两套并存 mock handler 轻量 |
| D2 | 拆 `PaymentStatus` 7 态，与 `OrderStatus` 5 态并列 | 把 `paid/refunded` 都塞进 `OrderStatus` | B05 PRD 明确要求独立「支付状态」字段；语义清晰 |
| D3 | 退款**仅 UI 占位** | 完整实现状态机 + 退库 | 用户决策：本期不实装；为后续可启用留 hook（`useRefundSubmit`） |
| D4 | 退款**不归库**（不退 `tier.soldStock`） | 退库 | 与 B05 §31 + plan-phase3 「已售门票」业务一致；如未来需退库单独评估 |
| D5 | 默认详情走 Drawer 内嵌 | 独立 `/orders/:id` 路由 | 与现有 UI 一致；如需 SEO/可分享再独立路由；常量 `ADMIN_ROUTES.orderDetail` 已预留 |
| D6 | 列表手机/身份证**始终脱敏** | 高级运营可看完整 | 本期不实现权限分级（Phase 7）；所有角色一致脱敏 |
| D7 | 订单状态 `cancelled` 默认对应 `paymentStatus='unpaid'` | 拆出 `expired` 态 | 沿用 plan-order-viewers 既有语义；`expireOrders()` 工具已存在 |
| D8 | 查询条件「活动/票档」用 antd `Select`（远端搜索 + 联动） | 全部 Input | 字段数 ≥ 30 场，远端搜索体验更好；票档按活动联动 |
| D9 | `userMobile` 优先 `order.contactPhone` → 第一位 viewer.phone → user.mobile | 仅 user.mobile | C 端 plan-order-viewers 写入的 `contactPhone` 是更准确的「联系手机」 |
| D10 | seed 补 `viewers / contactPhone` 字段 | 不动 seed | 演示需要看真实脱敏效果；H8 升级已要求 |
| D11 | `OrderManage/prd.md` v1.2 一次性更新 | 分多版本 | 改动相对集中，一次性更清晰 |
| D12 | 不引 react-query | 简单 `useState + useCallback` | 列表简单、无轮询需求；与 Phase 1 决策一致 |
| D13 | Admin 路由保持 `/orders` 单页（Drawer 内详情） | 拆 `/orders` + `/orders/:id` | 用户体验上 Drawer 更快；常量预留 |
| D14 | `RefundMockDialog` 用 localStorage 写草稿 | 纯 console.log | 演示可重看；同时不污染 mock DB |
| D15 | 操作日志仅 console.info 占位 | 立即接 audit 表 | 审计属 Phase 7；不阻塞本期 |

---

## Verification

### V1. 静态

| 项 | 命令 | 通过 |
|---|---|---|
| TS | `bash scripts/typecheck.sh` | 0 error |
| Lint | `bash scripts/lint.sh` | 0 error |
| Build | `bash scripts/build.sh` | 4 包都出 dist |

### V2. Mock 契约（写 `scripts/verify-admin-order.cjs` 或手测）

| 类别 | 用例 | 期望 |
|---|---|---|
| 列表基线 | `GET /admin/v1/orders` | 200，≥ 100 条（seed 120） |
| 订单号筛 | `?orderNo=CON2026...` | 仅命中 |
| 活动筛 | `?eventId=...` | 仅命中 |
| 票档筛 | `?ticketTierId=...` | 仅命中 |
| 手机筛 | `?userMobile=13800001111` | 仅命中（精确） |
| 姓名筛 | `?viewerName=张三` | 模糊命中 |
| 身份证筛 | `?viewerIdCard=1101...` | 精确命中 |
| 订单状态 | `?orderStatus=paid,finished` | 仅命中 |
| 支付状态 | `?paymentStatus=paid` | 仅命中 |
| 创建时间 | `?createdAtRange=2026-08-01,2026-08-31` | 仅 8 月 |
| 支付时间 | `?paidAtRange=...` | 仅命中 |
| 分页 | `?page=2&pageSize=20` | 第 21-40 条 |
| 详情 | `GET /admin/v1/orders/:id` | 返回 OrderAdminView 含 eventName/ticketTierSummary/viewerCount |
| 详情不存在 | 随机 id | 400012 |
| 退款 paid | `POST /admin/v1/orders/:id/refund` body `{ reason: "客户申请退款" }` | 200，status='refunded'，refundedAt 写入 |
| 退款 cancelled | 同上 | 400025 |
| 退款原因短 | reason="a" | 400026 |
| 退款 5 张硬限 | pending 订单 | 400025 |

### V3. 浏览器手测

| # | 场景 | 通过 |
|---|---|---|
| 1 | admin `/orders` 打开 → 列表 ≥ 100 条 | ✓ |
| 2 | 输入订单号前缀 → 列表过滤 | ✓ |
| 3 | 选「活动 A」→ 票档下拉只显示 A 的票档 | ✓ |
| 4 | 手机号 13800001111 → 仅命中 | ✓ |
| 5 | 选「订单状态=paid + 支付状态=paid」 → 仅命中 | ✓ |
| 6 | 创建时间范围 8 月 → 命中 | ✓ |
| 7 | 点订单号 → Drawer 打开 → 5 区块全 | ✓ |
| 8 | Drawer 观演人 身份证 / 手机号 全部脱敏 | ✓ |
| 9 | paid 订单点「退款」 → 弹窗 → 填理由 → 确认 → toast 演示 + localStorage 写入 | ✓ |
| 10 | refunded 订单点「退款」 → 按钮 disabled | ✓ |
| 11 | pending 订单无「退款」按钮 | ✓ |
| 12 | 右上角「PRD」按钮 → 滑出 markdown 面板，渲染 v1.2 | ✓ |
| 13 | DevMockToolbar 「重置」 → 列表回 seed | ✓ |
| 14 | C 端 H5 下单 → admin 列表立即多 1 条（含 viewers / contactPhone） | ✓ |

### V4. 不破坏既有

- C 端 H5 链路（下单 → 支付 → 详情）不变
- `apps/admin/src/pages/ViewersManage/` / `UserManage/` / `Dashboard` 不动
- `packages/api/src/modules/order.ts` C 端接口签名零改动
- `apps/admin/src/pages/OrderManage/prd.md` 由 v1.1 → v1.2（升级而非替换）

---

## 模块交付节奏

按 O-1 → O-7 串行交付；每完成一阶段停下等用户确认。

执行建议顺序：

1. **O-1**（共享层，1 文件类型 + 1 文件支付状态 + 1 文件路由 + 1 文件错误码）— **数据层先稳**
2. **O-2**（Mock：3 个 adminOrder handler + router 注册 + seed patch）— **可独立 mock 联调**
3. **O-3**（API 模块）— **前后端握手**
4. **O-4**（ApiContext 注入）— **前端可联调**
5. **O-5**（页面重写：FilterBar + OrderTable + Drawer + hook）— **核心 UI**
6. **O-6**（RefundMockDialog + 联动细节）— **补齐操作**
7. **O-7**（验证 + prd.md 同步）— **收尾**

每个阶段交付时严格按：

1. 修改代码
2. 跑 V1 + V2 + V3 全部检查项
3. 同步 `prd.md`（O-1~O-6 阶段无需；O-7 一次性补 v1.2）
4. 停下等用户确认

---

## Appendix A. 关键文件总览

```
trae-6/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── types/
│   │       │   ├── order.ts            [O-1 改：AdminOrderQuery、OrderAdminView]
│   │       │   └── payment.ts          [O-1 新增]
│   │       ├── constants/
│   │       │   ├── orderStatus.ts      [不动]
│   │       │   ├── paymentStatus.ts    [O-1 新增]
│   │       │   ├── routes.ts           [O-1 增 orderDetail]
│   │       │   └── errorCode.ts        [O-1 增 400025/400026]
│   │       └── index.ts                [O-1 桶式导出]
│   └── api/
│       └── src/
│           ├── mock/
│           │   ├── handlers/
│           │   │   ├── adminOrder.ts   [O-2 新增]
│           │   │   ├── order.ts        [O-2 不动 C 端]
│           │   │   └── seed.ts         [O-2 patch viewers/contactPhone]
│           │   └── router.ts           [O-2 增 /admin/v1/orders*]
│           ├── modules/
│           │   ├── adminOrder.ts       [O-3 新增]
│           │   ├── order.ts            [O-3 不动]
│           │   └── index.ts            [O-3 桶式导出]
└── apps/admin/src/
    ├── contexts/
    │   ├── apiTypes.ts                 [O-4 增 adminOrder]
    │   └── ApiContext.tsx              [O-4 注入]
    └── pages/OrderManage/
        ├── index.tsx                   [O-5/O-6 重写]
        ├── prd.md                      [O-7 v1.2]
        ├── components/
        │   ├── FilterBar.tsx           [O-5 新增]
        │   ├── OrderTable.tsx          [O-5 新增]
        │   ├── OrderDetailDrawer.tsx   [O-5 新增]
        │   └── RefundMockDialog.tsx    [O-6 新增]
        └── hooks/
            └── useOrderList.ts         [O-5 新增]
```

## Appendix B. 字段映射速查

| UI 字段 | 数据源 |
|---|---|
| 列表「活动」 | `order.eventName` (handler join) |
| 列表「票档」 | `order.ticketTierSummary` (handler join，`"VIP × 2"` 或 `"VIP × 1 / 看台 × 1"`) |
| 列表「用户手机」 | `order.userMobile` = `order.contactPhone ?? viewers[0].phone ?? user.mobile` |
| 列表「支付状态」 | `derivePaymentStatus(order)` |
| 列表「支付时间」 | `order.paidAt`（空 → 「—」） |
| Drawer「活动」 | `order.eventName` + 链向 `ADMIN_ROUTES.concertEdit(order.eventId)` |
| Drawer「观演人」 | `order.viewers` 数组；空兼容「— 无 —」 |
| Drawer「入场码」 | `order.entryCode` |
| Drawer「退款时间」 | `order.refundedAt` |
| Drawer「取消时间」 | `order.cancelledAt` |

## Appendix C. 退款 UI 占位设计

> 本期为 UI 占位，不实装 refund handler。**但 mock handler 已落地**（O-2），未来可一键启用。

`RefundMockDialog` 内部：

```ts
// 抽象：可被未来真接口一行替换
async function useRefundSubmit(order: OrderAdminView, reason: string) {
  // 真接口版本（O-6 未来切换）：
  // return adminOrderApi(client).refundOrder(order.id, reason)
  // 占位版本（本期）：
  const log = JSON.parse(localStorage.getItem('concert_admin_refund_log') ?? '[]')
  log.push({ orderId: order.id, orderNo: order.orderNo, amount: order.payAmount, reason, ts: Date.now() })
  localStorage.setItem('concert_admin_refund_log', JSON.stringify(log))
  console.info('[admin refund mock]', order.orderNo, reason)
  return { ok: true, mocked: true }
}
```

---

**计划完。等用户确认进入 O-1。**
