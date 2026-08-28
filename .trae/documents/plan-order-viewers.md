# 下单结构调整：单票档单选 + 观演人结构 + 个人中心「观演人」模块

> 范围：把现「多票档 + 单 buyer」改造为「单票档多张 + viewers[] 数组 + 用户级观演人库 + 身份证统一脱敏」。
> 输出语言：中文
> 不引入新依赖；保持 react-vant + zustand；mock handler 仍走 50–300ms 延迟；金额=分、时间=ISO（YYYY-MM-DD HH:mm:ss）

## Summary

| 阶段 | 范围 | 状态 |
|---|---|---|
| H8-1 | 数据层（Viewer 类型、Order 扩展、错误码 400020-400024、路由、脱敏工具） | 待开发 |
| H8-2 | Mock 后端（db.viewers + 6 个 viewer handler + 重写 createOrder + seed 2 个示例） | 待开发 |
| H8-3 | API 模块（viewer.ts + order.ts payload 调整 + 前后台 ApiContext 注册） | 待开发 |
| H8-4 | C 端：TicketTier 单选票档 + 下单 query 改为 `?event=&tier=&qty=` | 待开发 |
| H8-5 | C 端：OrderCreate 拆「联系信息（手机号）+ 观演人（每票一人）」 | 待开发 |
| H8-6 | C 端：OrderDetail 展示 viewers[] + maskIdCard | 待开发 |
| H8-7 | C 端：Profile 新增「观演人」入口 + `/profile/viewers` 完整页 | 待开发 |
| H8-8 | Admin：OrderManage 接 listOrders + 详情 Drawer 展示 viewers + 新增 ViewersManage 只读页 | 待开发 |
| H8-9 | 验证 + PRD 同步（8 份 PRD：5 改 + 1 新 C 端 / 2 改 + 1 新 admin） | 待开发 |

业务决策（已与用户确认）：
1. **单票档**：一个订单只能选 1 个票档的多张；不再叠加"5 张硬上限"，按 `min(tier.maxBuyQuantity, event.maxBuyQuantity, availableStock)` 走
2. **观演人结构**：`Order.viewers: Viewer[]`（顶层数组，length === quantity），每张票对应一人
3. **存储**：用户级 `db.viewers` + 6 个 mock 接口（list / get / create / update / delete / batch）
4. **身份证脱敏**：全场景统一 `前4位****后4位`（如 `1101**********1000`），C 端永不见完整号

---

## Current State Analysis

### 已具备的资产（直接复用）

| 资产 | 路径 | 用途 |
|---|---|---|
| `Order.buyer` 单数结构 | `packages/shared/src/types/order.ts:18-23` | 需替换为 viewers[] |
| `createOrder` 多 tier payload | `packages/api/src/mock/handlers/order.ts:63-181` | 需重写：单 tier + viewers 校验 + 自动落库 |
| TicketTier 多 tier 选择 | `apps/h5/src/pages/TicketTier/index.tsx` | 需改单选互斥交互 |
| RealNameForm | `apps/h5/src/pages/OrderCreate/components/RealNameForm.tsx` | 需拆为「联系信息」+「观演人」 |
| buyerDraftStore + persist | `apps/h5/src/pages/OrderCreate/stores/buyerDraftStore.ts` | 重命名 contactDraftStore，version 1→2 |
| Personal center | `apps/h5/src/pages/Profile/index.tsx` | 增加观演人入口 Cell |
| TabBarLayout | `apps/h5/src/layouts/TabBarLayout.tsx` | `useMatch('/profile/*')` 已支持嵌套 |
| maskPhone | `packages/shared/src/utils/format.ts` | 复用；新增 `maskIdCard` |
| errorCodeMessage | `packages/shared/src/constants/errorCode.ts` | 自动覆盖新错误码 |
| OrderManage | `apps/admin/src/pages/OrderManage/index.tsx` | 列表接 listOrders + 详情 Drawer |
| UserManage | `apps/admin/src/pages/UserManage/index.tsx` | 表格操作列加「观演人」按钮 |
| PrdButton / PrdSidePanel / PrdPanelHost | `apps/{h5,admin}/src/components/Prd*` | 8 份 PRD 同步按钮 |
| Admin mock token | `mock-token-<userId>` | 后续 viewers 接口直接走 `ctx.headers` 解析 userId |

### 需要补的资产

1. **`Viewer` 类型与 ViewerInput**：新增 `packages/shared/src/types/viewer.ts`
2. **`db.viewers` 集合**：MockDB 扩展；counters 增加 `viewerId`
3. **6 个 viewer handler**：`packages/api/src/mock/handlers/viewer.ts`（list / get / create / update / delete / batch）
4. **`viewerApi` 模块**：`packages/api/src/modules/viewer.ts`
5. **5 个错误码**：400020-400024
6. **`maskIdCard` 工具**：`packages/shared/src/utils/format.ts`
7. **新路由**：`/profile/viewers`（C 端）+ `/users/viewers`（admin）
8. **新页面**：C 端 `/profile/viewers` + admin `/users/viewers`
9. **新组件**：`ContactForm`（替换 RealNameForm）、`ViewersForm`、`ViewerSelector`、`ViewerEditorDialog`（公共）、`ViewersCard`、`OrderDetailDrawer`
10. **`contactDraftStore`**：替代 buyerDraftStore，version=2 触发旧数据迁移丢弃

### 不在本次范围（明确不做）

- 后台「订单详情」中可点击观演人查看更多
- 后台订单退款/关闭流程实装
- 观演人批量导入（CSV）
- 真实身份证加密存储（mock 仍用脱敏字符串作为 cipher）
- 「再次购票使用相同观演人」快捷选择

---

## Proposed Changes

### H8-1 数据层

#### 文件：`packages/shared/src/types/viewer.ts`（新增）

```ts
export interface ViewerInput {
  name: string
  idCardCipher: string   // 长度 ≥ 15
  phone: string           // 11 位 1[3-9]xxxxxxxxx
}

export interface Viewer extends ViewerInput {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}
```

#### 文件：`packages/shared/src/types/order.ts`（改）

- 删除 `OrderBuyer` interface 与 `Order.buyer` 字段
- `Order` 增加 `viewers?: Viewer[]` 与 `contactPhone?: string`
- 桶式 export 调整（移除 OrderBuyer export）

#### 文件：`packages/shared/src/constants/errorCode.ts`（改）

新增：
```ts
400020: '观演人数量与购票数量不一致',
400021: '观演人姓名不能为空',
400022: '观演人身份证号长度不合法（≥15 位）',
400023: '观演人手机号格式不正确',
400024: '观演人身份证号重复',
```

#### 文件：`packages/shared/src/constants/routes.ts`（改）

新增：
```ts
profileViewers: '/profile/viewers',
adminViewersManage: '/users/viewers',
```

#### 文件：`packages/shared/src/utils/format.ts`（改）

新增：
```ts
export function maskIdCard(cipher?: string): string {
  if (!cipher || cipher.length < 8) return cipher || ''
  if (cipher.length >= 18) {
    return `${cipher.slice(0, 4)}****${cipher.slice(-4)}`
  }
  return cipher
}
```

#### 文件：`packages/shared/src/index.ts`（改）

桶式 export `Viewer` / `ViewerInput`。

#### 文件：`packages/shared/src/utils/validators.ts`（改）

新增 `isValidPhone(phone: string): boolean`（如不存在则加）。

---

### H8-2 Mock 后端

#### 文件：`packages/api/src/mock/types.ts`（改）

`MockDB` 增加 `viewers: Viewer[]`；counters 增加 `viewerId: number`。

#### 文件：`packages/api/src/mock/store.ts`（改）

- `nextId` 支持 `'viewerId'` kind
- `dbStats()` 增加 `viewers` 字段
- `resetDB()` 自动清空 viewers

#### 文件：`packages/api/src/mock/seed.ts`（改）

- `buildDefaultDB()` 中 seed 2 个 viewer 归属 userId=40001（用于演示）
- counters.viewerId 起始 60001

#### 文件：`packages/api/src/mock/handlers/viewer.ts`（新建）

6 个 handler：
- `listViewers`：GET `/api/v1/viewers?userId=` → 按 updatedAt 倒序
- `getViewer`：GET `/api/v1/viewers/:id` → 不存在 400xxx
- `createViewer`：POST `/api/v1/viewers` → 校验 name/idCardCipher/phone；同 user 同 idCardHash 已存在 400024
- `updateViewer`：PUT `/api/v1/viewers/:id` → 部分字段；同样校验
- `deleteViewer`：DELETE `/api/v1/viewers/:id` → `{ ok: true }`
- `batchGetViewers`：POST `/api/v1/viewers/batch` body `{ ids }` → 过滤无效 id

#### 文件：`packages/api/src/mock/handlers/order.ts`（改）

重写 `createOrder`：
- 新 payload：`{ concertId, ticketTierId, quantity, viewers: ViewerInput[], contactPhone, payMethod, idempotencyKey? }`
- 校验顺序：活动 → 销售窗口 → 单 tier → quantity ∈ [1, min(tier.maxBuyQuantity, event.maxBuyQuantity, availableStock)]（**移除 5 张硬上限**）→ viewers.length === quantity（否则 400020）→ 每位 viewer 字段校验（400021/400022/400023）
- 自动落库：对每个 viewer，若 `db.viewers` 中 `userId + idCardHash` 不存在 → 新建（autoBind）
- 订单对象：删除 `buyer`，新增 `viewers: Viewer[]`、`contactPhone`
- `idempotencyKey` 改为：`${concertId}|${ticketTierId}|${quantity}|${sorted viewers.idCardCipher}`

#### 文件：`packages/api/src/mock/router.ts`（改）

新增 6 条 viewer 路由（按"最长前缀优先"排在 `/api/v1/viewers/...` 顺序位置）。

#### 文件：`packages/api/src/modules/viewer.ts`（新建）

```ts
export const viewerApi = (client: AxiosInstance) => ({
  listViewers: (userId: string): Promise<Viewer[]> =>
    client.get('/viewers', { params: { userId } }).then(r => r.data as Viewer[]),
  getViewer: (id: string): Promise<Viewer> =>
    client.get(`/viewers/${id}`).then(r => r.data as Viewer),
  createViewer: (payload: ViewerInput): Promise<Viewer> =>
    client.post('/viewers', payload).then(r => r.data as Viewer),
  updateViewer: (id: string, payload: Partial<ViewerInput>): Promise<Viewer> =>
    client.put(`/viewers/${id}`, payload).then(r => r.data as Viewer),
  deleteViewer: (id: string): Promise<{ ok: true }> =>
    client.delete(`/viewers/${id}`).then(r => r.data as { ok: true }),
  batchGetViewers: (ids: string[]): Promise<Viewer[]> =>
    client.post('/viewers/batch', { ids }).then(r => r.data as Viewer[]),
})
```

#### 文件：`packages/api/src/modules/order.ts`（改）

`CreateOrderPayload` 改造为：
```ts
export interface CreateOrderPayload {
  concertId: string
  ticketTierId: string
  quantity: number
  viewers: ViewerInput[]
  contactPhone: string
  payMethod: PayMethod
  idempotencyKey?: string
}
```

#### 文件：`packages/api/src/index.ts`（改）

export `viewerApi`。

---

### H8-3 API 模块与前后台 ApiContext

#### 文件：`apps/h5/src/contexts/apiTypes.ts`（改）

```ts
viewer: ReturnType<typeof viewerApi>
```

#### 文件：`apps/h5/src/contexts/ApiContext.tsx`（改）

```ts
viewer: viewerApi(client),
```

#### 文件：`apps/admin/src/contexts/apiTypes.ts`（改）

```ts
viewer: ReturnType<typeof viewerApi>
```

#### 文件：`apps/admin/src/contexts/ApiContext.tsx`（改）

```ts
viewer: viewerApi(client),
```

---

### H8-4 C 端：TicketTier 单选票档

#### 文件：`apps/h5/src/pages/TicketTier/stores/ticketSelectionStore.ts`（重写）

- 数据结构 `items: Record<tierId, qty>` → `selection: { tierId: string | null; qty: number }`
- `setSelection(tierId, qty)`：切换 tier 时旧 tier qty 自动归零
- `selectionToQuery()`：输出 `tierId:qty` 单组
- `enter()` / `clear()` 沿用

#### 文件：`apps/h5/src/pages/TicketTier/components/TicketTierCard.tsx`（改）

- 选中态：`borderColor: #6366f1; background: #eef2ff`
- 互斥：选中 A 后切 B → A 自动 setQty(0)
- `maxQty = min(tier.maxBuyQuantity, event.maxBuyQuantity, tier.availableStock)`（去掉 Math.min(5,...)）
- Stepper min=1（已选中状态）
- `data-tier-selected="true|false"`

#### 文件：`apps/h5/src/pages/TicketTier/components/StickyNextBar.tsx`（改）

- 文案：「下一步：填写联系信息」
- 展示当前选中票档小计（无需多档聚合）

#### 文件：`apps/h5/src/pages/TicketTier/index.tsx`（改）

- 改用 `selection.tierId`/`selection.qty`
- goNext：`navigate(/orders/create?event=${id}&tier=${selection.tierId}&qty=${selection.qty})`

#### 文件：`apps/h5/src/pages/TicketTier/prd.md`（改）

v1.2：单选票档交互 + 文案改 + 去 hard-limit 5 + 新 query 格式。

---

### H8-5 C 端：OrderCreate 拆「联系信息 + 观演人」

#### 文件：`apps/h5/src/pages/OrderCreate/components/RealNameForm.tsx` → `ContactForm.tsx`（重命名 + 改）

- 标题：「联系信息」
- 只保留手机号 Field（必填，自动带入 `user.phone`）
- 校验：11 位手机号（用 shared/isPhone）
- `onValidityChange(valid)`：手机号合法 → true

#### 文件：`apps/h5/src/pages/OrderCreate/components/ViewersForm.tsx`（新建）

- 标题：「观演人」
- 渲染 N 张观演人卡（按 quantity）
- 每卡：姓名 / 身份证 / 手机号 三字段 + 「选择已有」按钮 + 「清除」按钮
- `onValidityChange(valid)`：全部合法 → true

#### 文件：`apps/h5/src/components/viewer/ViewerSelector.tsx`（新建，公共）

- Popup 弹层，列出当前用户的 viewers
- 每行：姓名 + 身份证脱敏 + 手机号脱敏
- 顶部「+ 新增观演人」→ 触发 ViewerEditorDialog
- 空态：「还没有观演人，请新增」

#### 文件：`apps/h5/src/components/viewer/ViewerEditorDialog.tsx`（新建，公共）

- Dialog/Popup 内嵌 Form
- 入参：`viewer?: Viewer`（编辑模式预填）
- onSubmit：
  - 新增：`viewerApi.createViewer(payload)` → 自动选中新 viewer
  - 编辑：`viewerApi.updateViewer(id, payload)`

#### 文件：`apps/h5/src/pages/OrderCreate/components/ViewerSelector.tsx`（可省略，复用公共）

如复用公共组件则无需新建。

#### 文件：`apps/h5/src/pages/OrderCreate/stores/buyerDraftStore.ts` → `contactDraftStore.ts`（重命名 + 改）

```ts
interface ContactDraft {
  contactPhone: string
  viewers: ViewerInput[]   // 按数量
}
// persist key: 'concert_contact_draft_v1'（旧 key 'concert_buyer_draft_v1' 自动丢弃）
// version: 2
```

#### 文件：`apps/h5/src/pages/OrderCreate/index.tsx`（改）

- query 解析：从 `?event=...&tier=...&qty=...` 替代 `?items=...`
- 用 `ContactForm` 替代 `RealNameForm`
- 新增 `<ViewersForm quantity={qty} onValidityChange={setViewersValid} />`
- payload 构造改为新结构（contactPhone + viewers + ticketTierId + quantity）
- 校验：contactPhone 合法 + viewers.length === qty + 每位 viewer 合法

#### 文件：`apps/h5/src/pages/OrderCreate/hooks/useCreateOrder.ts`（改）

- `submit(payload: CreateOrderPayload)` 签名透传新结构
- 移除 `parseItemsQuery`/`parseItemsMap`/`totalFromMap`（改为单档工具）

#### 文件：`apps/h5/src/pages/OrderCreate/components/ItemsList.tsx`（改）

单档展示：`{ tierName } × { qty }`。

#### 文件：`apps/h5/src/pages/OrderCreate/components/SubmitBar.tsx`（改）

disabled 条件：`!eventBuyable || count === 0 || !contactValid || !viewersValid`。

#### 文件：`apps/h5/src/pages/OrderCreate/prd.md`（改）

v1.3：拆「联系信息」+「观演人」+ ViewerSelector + ViewerEditorDialog。

---

### H8-6 C 端：OrderDetail 展示 viewers[]

#### 文件：`apps/h5/src/pages/OrderDetail/components/ViewersCard.tsx`（新建）

- 板块标题：「观演人」
- 每行：序号 + 姓名 + `maskIdCard(idCardCipher)` + `maskPhone(phone)`
- 空态：「— 无观演人信息 —」（兼容旧数据）

#### 文件：`apps/h5/src/pages/OrderDetail/components/EntryCodeBox.tsx`（改）

入场码区下方加一行：「入场核验需出示观演人本人身份证原件」。

#### 文件：`apps/h5/src/pages/OrderDetail/index.tsx`（改）

删除内联 BuyerCard，替换为 `<ViewersCard viewers={order.viewers ?? []} />`。

#### 文件：`apps/h5/src/pages/OrderDetail/prd.md`（改）

v1.3：BuyerCard → ViewersCard + maskIdCard 规则说明。

---

### H8-7 C 端：Profile + 新增观演人页

#### 文件：`apps/h5/src/pages/Profile/index.tsx`（改）

- 在「退出登录」按钮上方新增「观演人」入口 Cell + ChevronRight
- 点击跳 `/profile/viewers`
- 卡片显示「观演人 · 共 N 位」

#### 文件：`apps/h5/src/router/index.tsx`（改）

```tsx
{
  path: 'profile/viewers',
  element: <RequireAuth><Viewers /></RequireAuth>,
}
```

#### 文件：`apps/h5/src/pages/Profile/viewers/index.tsx`（新建）

- 顶部 NavBar「观演人」+ 左箭头返回 `/profile`
- 右上角「+ 新增观演人」按钮
- 列表（Cell.Group）：每行姓名 / 身份证脱敏 / 手机号脱敏 + 「编辑」「删除」图标
- 「编辑」→ ViewerEditorDialog
- 「删除」→ Dialog.confirm 二次确认 → 调 viewerApi.deleteViewer

#### 文件：`apps/h5/src/pages/Profile/viewers/hooks/useViewers.ts`（新建）

- 拉取 `viewerApi.listViewers(user.id)` + maintain `viewers / loading / error / mutate / create / update / remove`
- user.id 变化自动 refresh

#### 文件：`apps/h5/src/pages/Profile/index.tsx`（微调）

在加载时调用 `viewerApi.listViewers(user.id)` 拿 viewer 数量；或 useViewers 子集。

#### 文件：`apps/h5/src/pages/Profile/prd.md`（改）

v1.3：新增观演人入口卡（Cell 链向 `/profile/viewers`）。

#### 文件：`apps/h5/src/pages/Profile/viewers/prd.md`（新建）

完整 PRD：列表 + 新增 / 编辑 / 删除 + 字段约束 + 身份证脱敏 + 入参与回调。

#### 文件：`apps/h5/src/pages/Login/prd.md`（改）

修订记录加 H8 说明：自动带入改入 contactDraftStore（仅 contactPhone）。

---

### H8-8 Admin：OrderManage + ViewersManage + UserManage

#### 文件：`apps/admin/src/router/index.tsx`（改）

```tsx
{ path: 'users/viewers', element: <ViewersManage /> },
```

#### 文件：`apps/admin/src/layouts/BasicLayout.tsx`（改）

在「用户管理」分组下增加子菜单项 `{ key: ADMIN_ROUTES.adminViewersManage, icon: <TeamOutlined />, label: '观演人' }`。

#### 文件：`apps/admin/src/pages/ViewersManage/index.tsx`（新建）

- 顶部筛选：userId 输入 / 关键词（姓名 / 手机号）/ 时间范围 / 查询 / 重置
- Table 列：观演人 ID / 姓名 / 身份证脱敏 / 手机号脱敏 / 归属用户 ID / 更新时间
- 分页 pageSize=10
- 数据源：`viewerApi.listViewers(userId)` + 前端关键词过滤
- 顶部 `<PrdPanelHost pageKey="ViewersManage">`
- 只读：不显示编辑/删除按钮

#### 文件：`apps/admin/src/pages/ViewersManage/prd.md`（新建）

#### 文件：`apps/admin/src/pages/OrderManage/index.tsx`（改）

- 顶部筛选：订单号 / 用户 ID / 演出 / 状态 / 时间范围
- 表格列：订单号 / 用户 ID / 演出 / 票档（VIP × 2）/ 总金额 / 状态 / 观演人数 / 下单时间 / 操作
- 数据源：`orderApi.listOrders({ userId, page, pageSize })`
- 点击「详情」→ Drawer

#### 文件：`apps/admin/src/pages/OrderManage/components/OrderDetailDrawer.tsx`（新建）

抽屉内：
- 订单基本信息
- 票档明细表（items[]）
- **观演人表格**：序号 / 姓名 / 身份证脱敏 / 手机号脱敏
- 支付信息

#### 文件：`apps/admin/src/pages/OrderManage/hooks/useOrderList.ts`（新建）

封装列表 + 分页 + 筛选 + 调 orderApi.listOrders。

#### 文件：`apps/admin/src/pages/OrderManage/prd.md`（改）

v1.1：列表接 orderApi + 详情 Drawer 含 viewers 表 + 顶部 PRD 按钮。

#### 文件：`apps/admin/src/pages/UserManage/index.tsx`（改）

表格「操作」列加「观演人」按钮 → `navigate(/users/viewers?userId=<userId>)`。

#### 文件：`apps/admin/src/pages/UserManage/prd.md`（改）

v1.1：操作列加「观演人」按钮跳转。

---

## Assumptions & Decisions

| # | 决策 | 备选 | 理由 |
|---|---|---|---|
| D1 | 单票档 + 多张；按 `min(tier.maxBuy, event.maxBuy, stock)` 算上限 | 保留 5 张硬上限 | 用户已确认"按票档走"；去掉硬上限更灵活 |
| D2 | Order 顶层 `viewers[]` 数组（length === quantity） | 挂在 OrderItem.viewer | 顶层数组更易详情展示；与现有 items[] 并列 |
| D3 | 用户级 `db.viewers` + 6 个 mock 接口 | 复用 User 字段（单数） | 支持多人管理；与个人中心模块对齐 |
| D4 | 全部脱敏 `前4位****后4位` | 脱敏 + 后4位可见 | 与 PRD §31 第 16 条一致；C 端永不见完整号 |
| D5 | `contactPhone` 单独顶层字段（与 viewers 内 phone 分离） | 复用 viewer's phone | 联系信息（订单通知用）与观演人手机号是两条独立数据 |
| D6 | viewer 校验：name 必填 / idCard ≥15 / phone 11 位（regex `^1[3-9]\d{9}$`） | 仅 ≥15 位 | 与产品意图一致；复用 shared isPhone |
| D7 | viewer 自动落库：同 user 同 idCardHash 已存在则复用现有 viewer，不重复添加 | 每次下单都新增 | 避免个人中心产生重复记录 |
| D8 | 旧 `buyerDraftStore` 数据通过 version 1→2 自动丢弃 | 兼容旧结构 | 不增加迁移复杂度；旧数据无业务价值 |
| D9 | viewer 接口全部走 `Authorization` 头解析 userId，不强制 query | query 必传 userId | 与 admin ViewersManage 配合：admin 可查任意 user |
| D10 | 身份证「前4+10+后4」字符串作为 cipher（18 位）；maskIdCard 抽取前4/后4 加 `****` | 完整 18 位不脱敏 | 与现有 seed 写法一致；mock 不实现真实加密 |
| D11 | TicketTier 单选：卡片高亮 + Stepper min=1 | 卡片互斥 radio | 复用现有 Stepper；最少改动 |
| D12 | `/profile/viewers` 在 TabBarLayout 内但不出现在底部 Tab | 二级页面不进 Tab | 与现有 Profile 子页策略一致 |
| D13 | 公共 `ViewerEditorDialog` / `ViewerSelector` 抽到 `apps/h5/src/components/viewer/` | 各页内私有 | OrderCreate + Profile 共用，避免重复 |
| D14 | admin 「观演人」作为用户管理下的二级菜单 | 独立顶级菜单 | 与现有组织结构一致 |

---

## Verification

### V1. TypeScript / Lint / Build

| 项 | 命令 | 通过条件 |
|---|---|---|
| TS | `bash scripts/typecheck.sh` | 4 包 0 error |
| Lint | `bash scripts/lint.sh` | 0 warning |
| Build | `bash scripts/build.sh` | 4 包 dist 成功 |

### V2. Mock 契约（≥ 16 项断言，写到 `.trae/work/verify-h8-*.cjs`）

| 类别 | 用例 | 期望 |
|---|---|---|
| viewer list | listViewers(userId=40001) → 2 条 seed | 200 |
| viewer create | createViewer 合法 payload | 200，返回 id |
| viewer create 重 | 同 user 同 idCard 第二次创建 | 400024 |
| viewer create name 空 | 空 name | 400021 |
| viewer create idCard < 15 | 长度 10 | 400022 |
| viewer create phone 错 | 非 11 位 | 400023 |
| viewer get | getViewer(id=60001) | 200 |
| viewer update | updateViewer 改 name | 200 |
| viewer delete | deleteViewer | 200 ok |
| viewer batch | batchGetViewers([60001,60002]) | 200 length=2 |
| createOrder 单 tier | 新 payload 单 tier qty=2 viewers=2 | 200 |
| createOrder 旧 payload | `{ items: [{tierId,qty}] }` | 报错或忽略 |
| createOrder qty 超 tier.maxBuy | qty=10 tier.maxBuy=3 | 400010 |
| createOrder qty 超 stock | qty 大于 availableStock | 400008/400009 |
| createOrder qty=0 | quantity=0 | 400009 |
| createOrder viewers.length != qty | qty=2 viewers=1 | 400020 |
| createOrder viewer.name 空 | 第 1 个 name="" | 400021 |
| createOrder viewer.idCard < 15 | | 400022 |
| createOrder viewer.phone 错 | | 400023 |
| createOrder 自动落库 | 下单后 listViewers(userId) 多 1 条 | 200 |
| createOrder 5 张硬上限移除 | 单 tier qty=6（远超 maxBuy） | 400010（按 maxBuy 拦） |
| createOrder contactPhone 缺失 | | 400016/新增错误码 |

### V3. 浏览器 E2E（≥ 8 项）

| # | 场景 | 通过条件 |
|---|---|---|
| 1 | 未登录 → /orders/create → 跳 /login → 登录 user1/123456 → 回原页 → 联系信息自动带入手机号 | ✓ |
| 2 | 票档页：选 A → 切 B → A 数量自动清零 | ✓ |
| 3 | 下单页：填联系手机 + 2 张观演人卡（先选已有 + 后新增）→ 提交 → 跳详情 → 看到 viewers 列表 | ✓ |
| 4 | 详情页：身份证全部以 `1101****1234` 展示 | ✓ |
| 5 | /profile/viewers 看到 seed 2 条 + 本次新增 1 条 | ✓ |
| 6 | /profile/viewers 编辑某观演人姓名 → 列表更新 | ✓ |
| 7 | /profile/viewers 删除某观演人 → 二次确认 → 列表移除 | ✓ |
| 8 | admin /users/viewers?userId=40001 → 表格展示 3 条观演人（脱敏） | ✓ |
| 9 | admin OrderManage 列表 → 详情 Drawer 含 viewers 表 | ✓ |

### V4. PRD 同步（8 份 markdown）

| 文件 | 版本 | 关键改动 |
|---|---|---|
| `apps/h5/src/pages/TicketTier/prd.md` | v1.2 | 单选 + 文案 + query 格式 + 去 hard-limit |
| `apps/h5/src/pages/OrderCreate/prd.md` | v1.3 | 拆联系信息 + 观演人 + ViewerSelector/Dialog |
| `apps/h5/src/pages/OrderDetail/prd.md` | v1.3 | BuyerCard → ViewersCard + maskIdCard 规则 |
| `apps/h5/src/pages/Profile/prd.md` | v1.3 | 新增观演人入口 |
| `apps/h5/src/pages/Profile/viewers/prd.md` | 新建 | 完整 PRD |
| `apps/h5/src/pages/Login/prd.md` | v1.2 | 修订记录 + H8 联动 |
| `apps/admin/src/pages/OrderManage/prd.md` | v1.1 | 列表 + Drawer 含 viewers 表 |
| `apps/admin/src/pages/UserManage/prd.md` | v1.1 | 操作列加观演人按钮 |
| `apps/admin/src/pages/ViewersManage/prd.md` | 新建 | 完整 PRD |

### V5. 不破坏既有

- Home / ConcertDetail / Login / Dashboard / TicketManage / ConcertEdit / ConcertList：0 变更或仅 PRD 修订记录
- package.json：无新依赖

---

## 模块交付节奏

每个 H 阶段严格按：

1. 修改代码
2. 跑 V1 + V2 全部检查项
3. 同步 `prd.md`
4. 停下等用户确认

**H8-1 → H8-9 串行交付**。H8-2 完成后即可独立 mock 联调，H8-3 完成后前端可联调，H8-4 ~ H8-7 前台各页独立可验，H8-8 后台独立可验，H8-9 收尾。

执行建议顺序：
1. H8-1（数据层，1 文件类型 + 1 文件错误码 + 1 文件路由 + 1 文件脱敏）
2. H8-2（Mock：6 个 viewer handler + createOrder 重写 + seed）
3. H8-3（API 模块 + 前后台 ApiContext 注册）
4. H8-4（TicketTier 单选交互）
5. H8-5（OrderCreate 联系信息 + 观演人 + 公共组件）
6. H8-6（OrderDetail 展示 viewers[]）
7. H8-7（Profile 入口 + 新页）
8. H8-8（Admin：OrderManage + ViewersManage + UserManage）
9. H8-9（验证 + 8 份 PRD 同步）

---

**计划完。** 等用户确认进入 H8-1。
