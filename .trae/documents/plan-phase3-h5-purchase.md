# Phase 3「C 端购票 + 订单 + 支付」实施计划

> 文档定位：Phase 1（M0–M6 已交付：基础工程 / Mock 数据层 / Dashboard / 演出列表 / 演出创建编辑 / 票档与库存管理）的下游。覆盖 PRD 第三十节中的 Phase 3「C 端购票」+ Phase 4「订单」中订单用户态部分 + Phase 5「支付」最小集（mock SDK）。
>
> 工作目录：`/Users/kzf/Documents/trae-6`
> 适用人员：实现 Agent、Code Reviewer、QA
> 文档约束：每完成一个 H 阶段停下等用户确认；交付时同步更新对应 `prd.md`；金额单位统一「分」；状态机集中在 `@trae/shared/constants`；不可变历史由 mock handler 强制（PRD §31 第 7 条）

---

## Summary

| 阶段 | 范围 | 状态 |
|---|---|---|
| H1 | 移动端基础设施 + 首页列表（C01） | 待开发 |
| H2 | 演出详情页（C02）+ 海报 / 票价预览 / 吸底 | 待开发 |
| H3 | 票档选择页（C03）+ 数量选择 / 限购 / 状态机 | 待开发 |
| H4 | 下单页（C04）+ 实名表单 / 倒计时 / 提交订单（createOrder mock 实现） | 待开发 |
| H5 | 订单详情（C05）+ 个人中心 + 我的订单列表（C07） | 待开发 |
| H6 | 模拟支付 + 状态推进（orderApi 全部 mock handler + mockPaySdk） | 待开发 |
| H7 | 登录态打通（mock 登录 / token / useUser / RequireAuth） | 待开发 |

> H1 → H7 串行交付，每阶段交付后停下等用户确认；不并发。
> H5 / H6 / H7 之间存在依赖：H5 详情页依赖 H6 的 `pay` 接口；H7 是横向能力但建议放在最后（避免 H1–H4 反复重构未登录态分支）。

---

## Current State Analysis

### 已具备的资产（直接复用）

| 资产 | 路径 | 用途 |
|---|---|---|
| Mock 数据层 | `packages/api/src/mock/` | 30 场 / 56 票档 / 120 订单 / 50 用户 |
| Mock router 占位 | `packages/api/src/mock/router.ts` | `GET /api/v1/events`、`POST /api/v1/orders` 已注册但返回占位 |
| Mock adapter | `packages/api/src/mock/adapter.ts` | axios adapter 已实现 50–300ms 延迟 + MockError → AxiosError |
| 共享类型 | `packages/shared/src/types/{concert,ticket,order,user,common}.ts` | `Concert` / `TicketTier` / `Order` / `OrderItem` / `User`（含 `idCardCipher` 脱敏）已就绪 |
| 共享常量 | `packages/shared/src/constants/` | `EVENT_STATUS` / `EVENT_TRANSITIONS` / `TICKET_STATUS` / `ORDER_STATUS` / `ERROR_CODE`（400001–500001） |
| 共享工具 | `packages/shared/src/utils/` | `formatMoney(cents)` / `formatDate` / `maskPhone` / `getStorageItem` |
| 共享路由 | `packages/shared/src/constants/routes.ts` | `H5_ROUTES`（home / login / concertDetail / ticketTier / orderCreate / orderDetail / profile） |
| API 模块占位 | `packages/api/src/modules/{concert,order,user}.ts` | 签名已定型；URL 前缀暂为 `/concerts` / `/orders` / `/auth` |
| H5 占位页 | `apps/h5/src/pages/{Home,Login,ConcertDetail,TicketTier,OrderCreate,OrderDetail,Profile}/index.tsx` | 已挂 `<PrdPanelHost pageKey="Xxx">` |
| H5 路由 | `apps/h5/src/router/index.tsx` | 7 个路径已注册 |
| H5 Layout | `apps/h5/src/layouts/{RootLayout,TabBarLayout}.tsx` | TabBar 双 tab（首页 / 我的） |
| H5 工具 | `apps/h5/src/utils/cn.ts`、`components/{PrdButton,PrdSidePanel,PrdPanelHost,Placeholder}.tsx`、`hooks/usePrdPanel.ts` | 全部可复用 |
| UI 库 | `react-vant 3.3.5`（NavBar / Tabbar / Card / Button / Tag / Toast / Skeleton / PullRefresh / InfiniteScroll / Empty / Field / Form / Picker / ActionSheet / Collapse / Swipe / CountDown / Dialog / Radio / NoticeBar / Badge / List 等）+ `Tailwind v4` + `postcss-px-to-viewport` | 移动端组件齐全 |

### 需要补的资产

1. **H5 端 ApiContext 缺失**：`apps/h5/src/contexts/` 目录为空；main.tsx 直接渲染 `<App />`，没有 `createApiClient({ baseURL: '/api/v1' })` + `installMock(client)` + `<ApiProvider>`。**H1 必须补上**。
2. **H5 端无 `useUser`**：登录、个人中心、订单归属都要 userId；**H7 落地**。
3. **没有加载 / 错误 / 空态组件**：`Placeholder` 仅开发占位，**H1 引入** `LoadingSkeleton` / `ErrorState` / `EmptyState` 三件套。
4. **没有全局 ErrorBoundary**：H1 加 React class 组件兜底。
5. **TabBar `active` 计算脆弱**：H1 重构成 `useMatch('/profile/*')`。
6. **API URL 与 mock router 不一致**：`concertApi` 调 `/concerts` 但 mock router 占位是 `/api/v1/events`；orderApi 调 `/orders` 但 mock router 是 `/api/v1/orders`。**H1 / H6** 统一 URL 前缀 `/api/v1/...`。
7. **`Order` 缺 `items / payMethod / entryCode`**：H4 实装 createOrder 时必须扩字段。
8. **`createOrder` payload 缺实名信息**：H4 扩为 `{concertId, items, buyer:{name,idCardCipher,phone}, payMethod}`。
9. **`concertApi.listConcerts` 缺状态 / saleState 筛选**：H1 扩 query。

### 不在 Phase 3 范围（明确不做）

- 真实登录 / 短信 / OAuth（仅 mock 验证码 `1234`）
- 真实支付（无微信 / 支付宝 SDK；用 `mockPaySdk` 占位）
- 票档座位图 / 选座（按数量整体购买）
- 入场二维码真生成（仅占位文字）
- 优惠券 / 积分 / 余额（`Order.discountAmount` 始终 0）
- 物流 / 收货地址
- 真实地图选址（详情页「查看地图」按钮 toast 占位）
- 富文本编辑器（详情 markdown 渲染用 react-markdown 即可）
- 任何后端实现
- 后台侧增量（M3 / M4 / M5+M6 已交付，Phase 3 admin 端不动）
- 性能 / 埋点 / 监控
- 单元测试覆盖率门槛

---

## Proposed Changes

### H1：移动端基础设施 + 首页列表（C01）

**目标**：把 H5 的客户端、Context、加载 / 错误 / 空态、首页列表搜索筛选 + 分类筛选打通。

#### 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 修改 | `apps/h5/src/main.tsx` | 注入 `createApiClient({ baseURL: '/api/v1' })` + `installMock(client)` + `<ApiProvider>` + `<ErrorBoundary>` |
| 新增 | `apps/h5/src/contexts/ApiContext.tsx` | 复用 admin 结构，导出 `useApi()`（仅含 `concert / order`；`user` 在 H7 接入） |
| 新增 | `apps/h5/src/components/ErrorBoundary.tsx` | React class 组件；`componentDidCatch` + 「页面出错了，点此重试」 |
| 新增 | `apps/h5/src/components/LoadingSkeleton.tsx` | react-vant `Skeleton` 封装，3 行卡片骨架 |
| 新增 | `apps/h5/src/components/ErrorState.tsx` | 错误提示 + 重试按钮 |
| 新增 | `apps/h5/src/components/EmptyState.tsx` | react-vant `Empty` 封装 + 自定义 description |
| 修改 | `apps/h5/src/layouts/TabBarLayout.tsx` | 用 `useMatch('/profile/*')` 替代 `pathname.startsWith` |
| 新增 | `apps/h5/src/pages/Home/components/ConcertCard.tsx` | 单卡：海报 / 标题 / 副标题 / 场馆 / 时间 / 价格区间 / 状态 Tag |
| 新增 | `apps/h5/src/pages/Home/components/CategoryTabs.tsx` | 「推荐 / 即将开售 / 售票中」分类 Tabs |
| 新增 | `apps/h5/src/pages/Home/components/FilterSheet.tsx` | 城市 / 时间范围筛选（react-vant `ActionSheet` + `Picker`） |
| 新增 | `apps/h5/src/pages/Home/hooks/useHomeFeed.ts` | 调 `concertApi.listConcerts({ status, keyword, page })` + 防抖 300ms + 分页 |
| 重写 | `apps/h5/src/pages/Home/index.tsx` | 真实业务流 |
| 修改 | `apps/h5/src/pages/Home/prd.md` | 同步：接口路径、分类枚举、筛选字段 |
| 修改 | `packages/api/src/mock/handlers/concert.ts` | 实装 `listConcerts(ctx)`：支持 status 多选 / keyword 模糊 / 时间范围；返回 `priceRange` 字段（mock 端聚合，PRD §31 第 1 条） |
| 修改 | `packages/api/src/mock/router.ts` | 替换 `GET /api/v1/events` → `GET /api/v1/concerts` / `GET /api/v1/concerts/:id`（最长前缀优先） |
| 修改 | `packages/api/src/modules/concert.ts` | URL 改为 `/concerts` / `/concerts/:id`（baseURL `/api/v1`） |
| 修改 | `packages/shared/src/types/concert.ts` | `Concert` 临时扩展 `priceRange?: [number, number]`（可选字段，H1 落地） |

#### 接口契约

```
GET /api/v1/concerts?page=1&pageSize=20&keyword=&status=on_sale,sold_out,pending
  → ApiResponse<PageResult<Concert & { priceRange: [number, number] }>>

GET /api/v1/concerts/:id
  → ApiResponse<Concert>
```

#### 关键业务规则

- C 端列表**默认过滤** `status ∈ ['on_sale', 'sold_out', 'pending']`，`draft / offline / cancelled` 一律不出现。
- `priceRange` 由 mock handler 聚合 `db.ticketTiers[eventId].price` → `[min, max]`；前端不计算。
- 价格区间渲染 `formatMoney(min) ~ formatMoney(max)`。

#### 验证

- dev: `bash scripts/dev.sh h5`，iPhone 17 Pro 视口（402×874）+ 普通视口（375×812）
- 列表 ≥ 12 条可见
- 搜索「周杰伦」→ 列表过滤
- PRD 按钮可点，markdown 渲染正常

---

### H2：演出详情页（C02）

**目标**：替换占位为海报 + 简介 + 票价预览 + 吸底「立即购票」。

#### 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 重写 | `apps/h5/src/pages/ConcertDetail/index.tsx` | 顶部 NavBar 返回 + 海报轮播（react-vant `Swipe`）+ 标题 / 副标题 / 场馆地址 / 销售期 / 票价预览 / 详情 markdown 渲染（react-markdown + remark-gfm）+ 折叠面板（购票须知 / 退改规则）+ 吸底「立即购票」状态机 |
| 新增 | `apps/h5/src/pages/ConcertDetail/components/PosterSwipe.tsx` | 海报轮播 |
| 新增 | `apps/h5/src/pages/ConcertDetail/components/PricePreview.tsx` | 最低 / 最高 / 起止销售期 |
| 新增 | `apps/h5/src/pages/ConcertDetail/components/NoticeCollapse.tsx` | react-vant `Collapse` |
| 新增 | `apps/h5/src/pages/ConcertDetail/components/StickyBuyBar.tsx` | 吸底按钮，按 `Concert.status` 显示不同文案 |
| 新增 | `apps/h5/src/pages/ConcertDetail/components/NotFound.tsx` | 404 兜底 |
| 新增 | `apps/h5/src/pages/ConcertDetail/hooks/useConcertDetail.ts` | 调 `concertApi.getConcertDetail(id)` |
| 修改 | `apps/h5/src/pages/ConcertDetail/prd.md` | 同步：接口路径、状态文案表、富文本渲染方式 |

#### 吸底按钮状态机（PRD §31 第 3 条）

| status | 按钮文案 | 跳转 |
|---|---|---|
| `draft` / `pending` | 「即将开售」disabled | — |
| `published` / `on_sale` | 「立即购票」 | `/concerts/:id/tickets` |
| `off_sale` / `stopped` | 「暂停售票」disabled | — |
| `sold_out` | 「已售罄」disabled | — |
| `finished` | 「演出已结束」disabled | — |
| `offline` / `cancelled` | 整页「活动不可购买」兜底 | — |

#### 验证

- 海报可滑动
- 票价预览显示「¥380 起 ~ ¥1980 封顶」
- 「立即购票」跳 `/concerts/:id/tickets`（H3 占位 OK）
- status=off_sale 时按钮 disabled + 「暂停售票」

---

### H3：票档选择页（C03）

**目标**：列表票档 + 数量 + - + 限购 + 实名必填提示 + 确认下单跳转。

#### 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 重写 | `apps/h5/src/pages/TicketTier/index.tsx` | 顶部 NavBar 返回 + 演出摘要 + 票档列表 + 数量选择器 + 吸底「下一步：填写购票人」 |
| 新增 | `apps/h5/src/pages/TicketTier/components/TicketTierCard.tsx` | 单票档：名称 / 价格 / 库存提示（仅 `showStock`）/ 限购 / 数量 + - / 状态 Tag |
| 新增 | `apps/h5/src/pages/TicketTier/components/RealNameHint.tsx` | 顶部 NoticeBar：「本演出需实名购票，一证一票」 |
| 新增 | `apps/h5/src/pages/TicketTier/components/StickyNextBar.tsx` | 吸底：「下一步：填写购票人」 + 总价；未选 disabled |
| 新增 | `apps/h5/src/pages/TicketTier/hooks/useTicketTiers.ts` | 调 `concertApi.listTickets(eventId)` |
| 新增 | `apps/h5/src/pages/TicketTier/stores/ticketSelectionStore.ts` | zustand store：`{ items: [{ tierId, quantity }], setQty, clear }` |
| 修改 | `apps/h5/src/pages/TicketTier/prd.md` | 同步：接口、限购规则、跳转 query |
| 修改 | `packages/api/src/mock/handlers/concert.ts` | 实装 `listTickets(ctx)`：eventId 过滤 + sort 升序；status='hidden' 不返回 |
| 修改 | `packages/api/src/mock/router.ts` | 新增 `GET /api/v1/concerts/:id/tickets`（最长前缀优先） |
| 修改 | `packages/api/src/modules/concert.ts` | 新增 `concertApi.listTickets(eventId)` |

#### 接口契约

```
GET /api/v1/concerts/:id/tickets
  → ApiResponse<TicketTier[]>
  // 过滤：status != 'hidden'
```

#### 关键业务规则（PRD §31 第 6/8/10 条）

- **限购**：`min(tier.maxBuyQuantity, event.maxBuyQuantity, 5)`（PRD §31 第 8 条「每人每场限购 5 张」为活动级硬上限）
- **数量上限**：`min(tier.maxBuyQuantity, availableStock)`；售罄时 `+` 禁用
- **不传价格**（PRD §31 第 1 条）：跳转 query 仅 `items=tier1:2,tier2:1`，由 mock createOrder 重新聚合
- **活动 status 校验**：`off_sale` 等不可购买状态 → 整页 disabled + 「暂停售票」横幅

#### 跳转 URL 格式

```
/orders/create?event=:id&items=tier1:2,tier2:1
```

#### 验证

- 选 2 张 VIP → 总价 `¥760`
- 数量超出限购 → `+` 禁用
- 售罄票档 → `+` 永远禁用
- 跳 `/orders/create?event=10001&items=20001:2`

---

### H4：下单页（C04）

**目标**：实名信息表单 + 默认值 + 倒计时 + 提交订单（`createOrder` mock handler 完整实现）。

#### 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 重写 | `apps/h5/src/pages/OrderCreate/index.tsx` | 顶部 NavBar 返回 + 演出摘要 + 票档明细 + 实名表单（姓名 / 身份证 / 手机）+ 支付方式选择 + 倒计时 + 吸底「提交订单」 |
| 新增 | `apps/h5/src/pages/OrderCreate/components/ConcertSummary.tsx` | 复用 H2 卡片 |
| 新增 | `apps/h5/src/pages/OrderCreate/components/ItemsList.tsx` | 票档 × 数量列表 |
| 新增 | `apps/h5/src/pages/OrderCreate/components/RealNameForm.tsx` | 姓名 / 身份证 / 手机 输入 + 校验 |
| 新增 | `apps/h5/src/pages/OrderCreate/components/PayMethodPicker.tsx` | react-vant `Radio`（wechat / alipay / mock） |
| 新增 | `apps/h5/src/pages/OrderCreate/components/CountdownBadge.tsx` | react-vant `CountDown` 展示订单未过期时间 |
| 新增 | `apps/h5/src/pages/OrderCreate/hooks/useCreateOrder.ts` | 调 `orderApi.createOrder(payload)` → 跳 `/orders/:id` |
| 新增 | `apps/h5/src/pages/OrderCreate/stores/buyerDraftStore.ts` | zustand + persist；localStorage key `concert_buyer_draft_<userId>`（H7 后才生效 namespace） |
| 修改 | `apps/h5/src/pages/OrderCreate/prd.md` | 同步：接口、实名字段、倒计时规则 |
| 修改 | `packages/shared/src/types/order.ts` | 扩 `Order`：`items: OrderItem[]` / `payMethod?` / `entryCode?` |
| 修改 | `packages/shared/src/types/order.ts` | 扩 `CreateOrderPayload`：增加 `buyer: { name, idCardCipher, phone? }` 与 `payMethod` |
| 修改 | `packages/api/src/modules/order.ts` | URL 同步 `/orders` / `/orders/:id` / `/orders/:id/cancel` / `/orders/:id/pay` |
| 修改 | `packages/api/src/mock/handlers/order.ts` | 实装 `createOrder(ctx)`（详见下文规则） |
| 修改 | `packages/api/src/mock/router.ts` | `POST /api/v1/orders` 替换占位 |

#### `createOrder` mock handler 规则（PRD §31 第 1/2/6/7/8/10/11/16 条）

按顺序校验：

1. **活动状态**：`status !== 'on_sale' && 'published'` → `400005 / 400006 / 400018`
2. **销售时间窗口**：`now < saleStartTime || now > saleEndTime` → `400005`
3. **活动 `maxBuyQuantity` 全场限购**：按 `idCardHash`（mock = `idCardCipher.slice(-6) + 'BD'`）查已存在的 `paid + finished` 订单总票数 + 新订单数量 > `event.maxBuyQuantity` → `400010`
4. **票档存在**：`400007`
5. **库存校验**：`availableStock < quantity` → `400008 / 400009`
6. **数量校验**：`<=0` → `400009`；`> tier.maxBuyQuantity` → `400010`
7. **实名必填**：姓名空、idCardCipher 非 ≥15 位 → `400016`
8. **价格服务端计算**（PRD §31 第 1 条）：忽略请求体里任何 `unitPrice` 字段，用 `db.ticketTiers` 真实 `price`
9. **幂等（PRD §31 第 5 条）**：基于 `{userId-or-buyer.idCardHash, concertId, items[]}` 5 秒去重 → 命中返回原订单，覆盖 `expireTime` 与 `items`（`400011` 占位，新建为主路径）
10. **订单超时**：`expireTime = now + event.orderTimeoutMinutes` 分钟
11. **锁定库存（PRD §31 第 2 条）**：`tier.availableStock -= quantity`、`tier.lockedStock += quantity`、`tier.updatedAt = now`
12. **写入 OrderItem 快照**（PRD §31 第 7 条）：`categoryNameSnapshot / unitPrice / quantity / subtotal`
13. **返回 Order（含 items）**

#### 验证

- 提交时故意身份证长度 < 15 → `400016`
- 故意买超出 `maxBuyQuantity` → `400010`
- 故意把 `availableStock=0` 的票档塞进 items → `400008`
- 成功提交 → 跳订单详情（H5 占位），admin OrderManage 多 1 条
- 倒计时按 `orderTimeoutMinutes` 显示；刷新页面后继续倒计时

---

### H5：订单详情（C05）+ 个人中心（C07）

**目标**：C05 状态机 + 倒计时 + 取消；C07 用户卡 + 我的订单列表。

#### C05 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 重写 | `apps/h5/src/pages/OrderDetail/index.tsx` | 状态横幅 + 倒计时 + 演出信息 + 票档明细 + 购票人（脱敏） + 支付信息 + 底部操作 |
| 新增 | `apps/h5/src/pages/OrderDetail/components/StatusBanner.tsx` | 按 status 渲染彩色横幅 |
| 新增 | `apps/h5/src/pages/OrderDetail/components/CountdownText.tsx` | 距 `expireTime` 倒计时文案 |
| 新增 | `apps/h5/src/pages/OrderDetail/components/ItemsTable.tsx` | 票档明细表 |
| 新增 | `apps/h5/src/pages/OrderDetail/components/PayInfo.tsx` | 支付方式 / 支付时间 / 订单号 |
| 新增 | `apps/h5/src/pages/OrderDetail/components/EntryCodeBox.tsx` | 入场码占位（已支付才显示） |
| 新增 | `apps/h5/src/pages/OrderDetail/components/ActionBar.tsx` | 按状态显示按钮 |
| 新增 | `apps/h5/src/pages/OrderDetail/hooks/useOrderDetail.ts` | 调 `orderApi.getOrderDetail(id)` |
| 修改 | `apps/h5/src/pages/OrderDetail/prd.md` | 同步：状态机、倒计时、操作按钮 |

#### 订单状态机（前端按钮可见性 + 后端白名单）

```ts
const ORDER_TRANSITIONS = {
  pending:   ['paid', 'cancelled'],
  paid:      ['refunded', 'finished'],
  cancelled: [],
  refunded:  ['finished'],
  finished:  [],
}
```

| status | 横幅 | 主操作 | 次操作 |
|---|---|---|---|
| `pending`（未过期） | 「待支付」+ 倒计时 | 「立即支付」→ H6 `pay` | 「取消订单」→ `cancelOrder` |
| `pending`（已过期） | 「订单已失效」 | 「重新下单」→ 跳回 `/concerts/:id/tickets` | — |
| `paid` | 「已支付」 | 「查看入场码」 | 「申请退款」（mock 仅展示确认弹窗） |
| `cancelled` / `refunded` / `finished` | 终态 | — | — |

#### C07 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 重写 | `apps/h5/src/pages/Profile/index.tsx` | 顶部用户卡 + 4 宫格订单统计 + 「我的订单」Tab 列表 + 设置入口 |
| 新增 | `apps/h5/src/pages/Profile/components/UserCard.tsx` | 当前用户卡（头像 / 昵称 / 手机脱敏 / 实名状态） |
| 新增 | `apps/h5/src/pages/Profile/components/OrderStats.tsx` | 全部 / 待支付 / 已支付 / 已完成 |
| 新增 | `apps/h5/src/pages/Profile/components/OrderList.tsx` | 按状态 Tab 过滤（react-vant `Tabs` + `List`） |
| 新增 | `apps/h5/src/pages/Profile/hooks/useMyOrders.ts` | 调 `orderApi.listOrders({ userId, status? })` + 分页 |
| 修改 | `apps/h5/src/pages/Profile/prd.md` | 同步：Tab 状态、统计字段、退出登录 |

#### 接口契约

```
GET /api/v1/orders?userId=40001&status=pending,paid&page=1&pageSize=10
  → ApiResponse<PageResult<Order & { items: OrderItem[] }>>
```

#### 关键业务规则（C07）

- 未登录时点击「我的订单」 → `/login?redirect=/profile`
- 身份证永远展示 `前4位****后4位`；手机号 `maskPhone`（PRD §31 第 16 条）
- 退出登录（先 H7 落地）：清 `localStorage['concert_auth_v1']` + 跳 `/login`

#### 验证

- 在 H5 下单 → 个人中心看到订单（pending）→ 详情 → 取消 → 列表变 cancelled，admin OrderManage 同步
- 倒计时到 0 → 「立即支付」disabled + 「订单已失效」

---

### H6：模拟支付 + 状态推进（orderApi 完整 mock handler）

**目标**：`createOrder / listOrders / getOrderDetail / cancelOrder / pay` 完整实现；引入 `mockPaySdk.ts`；seed 回填 `Order.items` 与 `idCardHash`。

#### 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 修改 | `packages/api/src/mock/handlers/order.ts` | 实装 5 个 handler：见下文 |
| 修改 | `packages/api/src/mock/router.ts` | 新增 `POST /api/v1/orders/:id/pay` / `:id/cancel` / `GET /:id` / `GET /`；调整顺序 |
| 修改 | `packages/api/src/mock/seed.ts` | 给 seed users 补 `idCardHash`；新建 mock current user（id=`user-current` = `40001`）；seed orders 补 `items[]`；启动时 `expireOrders()` 一次（把过期 pending → cancelled + 归库存） |
| 修改 | `packages/api/src/mock/store.ts` | 新增 `expireOrders()` 工具函数 |
| 新增 | `apps/h5/src/utils/mockPaySdk.ts` | `pay({ orderId, method, amount }) → Promise<{ success: true, paidAt }>`；调 `orderApi.pay(orderId)`；模拟 1500ms 通道耗时 |
| 新增 | `apps/h5/src/pages/OrderDetail/components/MockPayDialog.tsx` | react-vant `Dialog`：订单号 + 金额 + 「立即支付」+ loading；点击 → `mockPaySdk.pay` → 自动 close + refresh |
| 新增 | `apps/h5/src/pages/OrderCreate/components/SuccessToast.tsx` | 下单成功 toast + 2s 自动跳详情 |

#### 接口契约

```
POST /api/v1/orders
GET  /api/v1/orders/:id
GET  /api/v1/orders
POST /api/v1/orders/:id/cancel
POST /api/v1/orders/:id/pay
```

#### Handler 规则

**`pay(ctx)`**（PRD §31 第 1/2/5/7/9/11 条）：
- 仅 `pending` 可支付 → 其他状态 `400013`
- 已 `paid` 再次 pay → 200 OK 返回原订单（幂等，PRD §31 第 5 条）
- `setTimeout(resolve, 1500)` 模拟通道耗时
- 成功：`order.status='paid'`、`paidAt = now`、`entryCode = 'MOCK-' + orderNo.slice(-8)`、归 `tier.lockedStock -= qty`、`tier.soldStock += qty`、`availableStock` 不变
- 价格快照不变（PRD §31 第 7 条）

**`cancelOrder(ctx)`**：
- 仅 `pending` 可取消 → 其他状态 `400013`
- 已过期 pending 允许直接取消（PRD §31 第 11 条）
- 归 `tier.lockedStock -= qty`、`tier.availableStock += qty`、`lockedStock` 清零、`cancelledAt = now`

**`getOrderDetail(ctx)` / `listOrders(ctx)`**：
- 按 id / userId / status / 时间范围 / page 分页查 `db.orders`；每条挂 `items[]`

**`expireOrders()`（启动时调用一次）**：
- `status === 'pending' && now > expireTime` → 转 `cancelled`，归库存

#### 验证

- 完整购票链路：列表 → 详情 → 票档 → 下单 → 支付弹窗 → 详情显示「已支付」+ 入场码占位
- 取消链路：创建订单 → 不支付 → 取消 → 库存复原
- 同一身份证买第 6 张（活动限购 4）→ `400010`
- admin `OrderManage` 立即可见新订单；admin 票档 `availableStock / soldStock` 同步

---

### H7：登录态打通（mock 登录 / token / useUser / RequireAuth）

**目标**：mock 登录 + localStorage token + `useUser` hook + 个人中心鉴权 + ApiProvider 接入 `userApi`。

#### 文件清单

| 操作 | 路径 | 改动 |
|---|---|---|
| 新增 | `apps/h5/src/contexts/UserContext.tsx` | React Context：`{ user, token, login(payload), logout(), refresh() }` |
| 新增 | `apps/h5/src/components/RequireAuth.tsx` | 高阶组件 / `Outlet` 包装，未登录跳 `/login?redirect=...` |
| 修改 | `apps/h5/src/main.tsx` | `<UserProvider>` 包 `<ApiProvider>`；初始化时从 `localStorage['concert_auth_v1']` 恢复 token + user |
| 修改 | `apps/h5/src/contexts/ApiContext.tsx` | 增加 `user` API（userApi） |
| 重写 | `apps/h5/src/pages/Login/index.tsx` | 账号密码表单 + 「发送验证码」按钮（mock 永远发 `1234`）+ 「我已阅读」复选框；登录成功 → 写 localStorage + `navigate(redirect ?? '/')` |
| 新增 | `apps/h5/src/pages/Login/components/PwdLoginForm.tsx` | 账号密码表单 |
| 新增 | `apps/h5/src/pages/Login/components/SmsLoginForm.tsx` | 短信验证码表单（Tab 切换） |
| 修改 | `apps/h5/src/pages/Login/prd.md` | 同步：mock 验证码 = `1234`、localStorage key、redirect 处理 |
| 修改 | `apps/h5/src/pages/Profile/index.tsx` | 未登录跳 `/login?redirect=/profile`；已登录展示真实 `user.nickname` / `user.phone` |
| 修改 | `apps/h5/src/pages/OrderCreate/index.tsx` | 实名表单默认值改为 `user.realName` / `user.idCardCipher` / `user.phone` |
| 修改 | `apps/h5/src/router/index.tsx` | `/orders/create`、`/orders/:id`、`/profile` 用 `<RequireAuth>` 包裹 |
| 新增 | `packages/api/src/mock/handlers/user.ts` | `login(ctx)`：账号密码校验（mock 固定 `user1 / 123456`）+ 返回 `{ token: 'mock-token-<userId>', user }`；`getCurrentUser(ctx)`：从 `Authorization: Bearer <token>` 取 token → 查 db.users；`logout(ctx)`：noop + 200 |
| 修改 | `packages/api/src/mock/router.ts` | 新增 `POST /api/v1/auth/login`、`GET /api/v1/auth/me`、`POST /api/v1/auth/logout` |
| 修改 | `packages/api/src/modules/user.ts` | URL 改为 `/auth/login` / `/auth/me` / `/auth/logout` |
| 修改 | `packages/api/src/mock/seed.ts` | 给种子用户 `user-1` / `user-2` 补 `realName` / `idCardCipher` / `idCardHash` |

#### 接口契约

```
POST /api/v1/auth/login
  Body: { account: string, password: string, code?: string }
  Resp: ApiResponse<{ token: string; user: User }>

GET /api/v1/auth/me
  Header: Authorization: Bearer <token>
  Resp: ApiResponse<User>

POST /api/v1/auth/logout
  Resp: ApiResponse<{ ok: true }>
```

#### 关键业务规则（PRD §31 第 14/16/17 条）

- **单点登录（PRD §31 第 17 条）**：mock 简化，不实现 token 过期 / 互踢；只验 token 格式 `mock-token-<userId>`
- **token 注入**：main.tsx 注入 `getToken` hook，axios interceptor 自动加 `Authorization: Bearer <token>` 头
- **实名 namespace**：buyerDraftStore localStorage key = `concert_buyer_draft_<userId>`
- **未登录守卫**：H7 不引入路由级 401 自动跳，仅在「需要登录」页面用 `<RequireAuth>` 包裹

#### 验证

- 首次打开 → 个人中心 → 自动跳 `/login?redirect=/profile`
- 输入 `user1 / 123456` → 跳回 profile，展示昵称「用户001」
- 刷新页面 → 仍保持登录态（localStorage 恢复 token）
- 退出登录 → 再次跳登录页
- 下单页实名表单自动带入 `user.realName`

---

## Assumptions & Decisions

### 已锁设计决策

| # | 决策 | 备选 | 理由 |
|---|---|---|---|
| D1 | H5 端引入 `useApi` + `useUser` 双 Context | 全局单例 / zustand 全局 store | 与 admin 端一致；未来切真实后端零改动 |
| D2 | C 端列表的「价格区间」由 mock handler 聚合返回 | 前端聚合 | PRD §31 第 1 条「不信任前端价格」 |
| D3 | 模拟支付用 `setTimeout(1500ms)` 模拟通道耗时 | 直接同步 | 真实支付均有耗时，前端 loading 体验需对齐 |
| D4 | 实名信息写入 localStorage `concert_buyer_draft_<userId>` | 不缓存 | 用户多次下单免重复输入；H7 namespace 生效 |
| D5 | iPhone 17 Pro 视口（402×874）在 Phase 3 全程验证 | 仅 375 | postcss-px-to-viewport 默认 375；402 在 dev 临时改 viewportWidth，构建复原 |
| D6 | 票档选择走 zustand 单 store | Context | 跨页传参更稳；后续 Phase 4「购物车」可扩展 |
| D7 | H5 不引入 zustand persist 给登录态以外的其他 store | persist | 仅 buyerDraftStore 持久化 |
| D8 | 倒计时**前端实现**（基于 `expireTime`）；H6 启动时 mock handler `expireOrders()` 清理过期 pending | 服务端推送 | 简化；Phase 4 再评估 |
| D9 | 订单幂等 mock 内做 5 秒去重（基于 buyer + items hash） | 客户端 idempotency-key | PRD §31 第 5 条原则 |
| D10 | 身份证 hash mock 算法 = `idCardCipher.slice(-6) + 'BD'` | 真 SHA256 | mock 简化；不影响 Phase 3 演示 |
| D11 | H5 不引入 react-query | react-query | 与 admin 一致；Phase 4 引入轮询再评估 |
| D12 | 模拟支付不引入「SDK」概念，仅一个 `mockPaySdk.ts` 函数 | 真实 SDK | 防止依赖蔓延 |
| D13 | H5 `TabBar` 双 tab（首页 / 我的），订单 Tab 放在个人中心 | 三 Tab | PRD §4.5 H5 原型图明确双 Tab |
| D14 | H5 不接入 PWA / Service Worker | PWA | 不在 Phase 3 范围 |
| D15 | 详细页富文本直接用 react-markdown | 自研 | 已有依赖 + seed 中 `detailContent` 是 markdown |

### 后续阶段需重新评估

- **Phase 4**：是否引入 react-query；订单 WebSocket 推送；服务端真身份证 hash 校验
- **Phase 5**：替换 `mockPaySdk` 为真实微信 / 支付宝 SDK；异步回调处理；`entryCode` 真生成
- **Phase 7**：401 自动跳登录；token 过期 / 刷新；多端互踢；HTTPS 强制

### 风险点

| 风险 | 影响 | 缓解 |
|---|---|---|
| H3 跳 `/concerts/:id/tickets`，mock 端尚未实装 | 用户卡住 | H1 提前补 `GET /api/v1/concerts/:id/tickets` 占位（返回空数组） |
| iPhone 17 Pro 视口（402 宽）与 postcss 默认 375 不一致 | 真实机展示错位 | dev 阶段改 `viewportWidth: 402`，构建复原；CI 跑 375 |
| mock handler 5 秒幂等窗口内的并发下单同票档 | 偶发库存溢出 | handler 内 `availableStock -= quantity` 在幂等窗口外重入保护；测试用 `q=10` 但库存=5 演示 |
| localStorage 5MB 上限 | 演示失败 | seed 120 订单 < 100KB |
| react-vant 3.3.5 `Swipe` 在 iOS Safari 滑动卡顿 | 体验 | H2 用横向滚动 `<img>` 列表兜底 |
| `useUser` + `useApi` 同时挂载循环引用 | 启动失败 | ApiContext 不引用 UserContext；UserContext 内部 useApi 拿 userApi |
| 倒计时后台被节流 | 体验 | `setInterval` 每秒 + 切回前台时 refresh |
| Admin + H5 同源 localStorage | 改一边数据另一边看到 | 预期行为；dev 用不同 Vite port 启动 |
| postcss-px-to-viewport 对 `react-vant` 样式转换 | 库样式被改坏 | `exclude: /node_modules\/(react-vant)/` 已守门 |
| `Order.items` 字段在 seed 里缺失 | seed 完整性 | H6 同步 patch seed.ts；启动一次 `resetDB` 即可 |

---

## Verification

### V1. 每个 H 阶段的通用验证

| 项 | 操作 | 通过标准 |
|---|---|---|
| TypeScript | `bash scripts/typecheck.sh` | 0 错误 |
| Lint | `bash scripts/lint.sh` | 0 错误 |
| Build | `bash scripts/build.sh` | 4 包都出 dist |
| H5 dev 启动 | `bash scripts/dev.sh h5` | `http://localhost:5173/` 打开正常 |
| Mock 持久化 | 首次访问 H5 | `localStorage.concert_mock_db_v1` 已写入；列表 ≥ 6 条数据可见 |
| iPhone 17 Pro 视口（高级） | DevTools Responsive 切 402×874 | 列表 / 详情 / 票档 / 下单 / 详情 全部正常排版；按钮不溢出 |
| 普通视口（375×812） | 默认 | 全部正常 |
| PRD 同步 | `git diff apps/h5/src/pages/<Page>/prd.md` | 与代码行为一致 |

### V2. 按 H 阶段的业务验证

**H1**：
- 首页列表 ≥ 12 条可见
- 搜索「周杰伦」→ 列表过滤
- 「重置 mock」（admin DevMockToolbar）触发后，H5 列表刷新反映新数据

**H2**：
- 海报轮播可滑动
- 票价预览显示「¥380 起 ~ ¥1980 封顶」
- 「立即购票」跳 `/concerts/:id/tickets`
- status=off_sale 时按钮 disabled

**H3**：
- 票档列表 ≥ 1 个；选 2 张 VIP → 总价 `¥760`
- 数量超出限购 → `+` 禁用
- 售罄票档 → `+` 永远禁用
- 跳 `/orders/create?event=10001&items=20001:2`

**H4**：
- 实名表单提交：姓名空 / 身份证长度不够 → 弹 `400016`
- 提交成功 → 跳订单详情，admin OrderManage 多 1 条
- 倒计时正常；刷新页面后继续倒计时

**H5**：
- 订单详情显示状态 + 票档明细 + 购票人（脱敏）
- 「立即支付」→ H6 模拟支付弹窗
- 「取消订单」→ 状态变 cancelled，admin 端票档 `availableStock` 复原
- 个人中心「我的订单」按 Tab 过滤

**H6**：
- 完整购票链路顺畅
- 同一身份证买第 6 张（活动限购 4）→ `400010`
- 关闭支付弹窗前点击「取消」→ 不调 pay 接口，订单保持 pending

**H7**：
- 首次打开 H5 → 点 TabBar「我的」→ 自动跳 `/login?redirect=/profile`
- 输入 `user1 / 123456` → 跳回 profile，看到昵称「用户001」
- 刷新页面 → 仍保持登录态
- 退出登录 → 再次跳登录页
- 下单页实名表单自动带入 `user.realName`

### V3. Phase 3 整体验收（在 H7 完成后跑一次）

| 项 | 操作 | 通过标准 |
|---|---|---|
| 完整购票闭环 | 登录 → 首页 → 详情 → 票档 → 下单 → 支付 → 详情「已支付」 | 全链路顺畅；admin 后台同步反映 |
| 取消闭环 | 跳过支付 → 详情取消 → 列表状态变 cancelled | 库存复原 |
| 超时闭环 | seed 改 `orderTimeoutMinutes=1` → 下单 → 等 1 分钟 → 详情「已失效」 | mock `expireOrders()` 启动时执行 |
| 状态机护栏 | 手动 mock 端 pay 一个已 cancelled 订单 → 报 `400013` | 状态机白名单生效 |
| 数据隔离 | admin 端「重置 mock」→ H5 列表立刻反映 | 同源 localStorage 共享 |
| iPhone 17 Pro 视口 | 7 个核心页 + 登录页在 402×874 下截图 | 无横向滚动条；按钮不溢出 |
| PRD 一致性 | 人工读 7 个 `prd.md` 与代码比对 | 字段名、接口、状态枚举完全一致 |

### V4. 不在 Phase 3 验收

- 真实登录 / 短信 / OAuth
- 真实支付集成
- 票档座位图 / 选座
- 入场二维码真生成
- 票券核销
- 优惠券 / 积分
- 实名认证调第三方
- 物流 / 快递
- 性能 / 埋点
- 单元测试覆盖率门槛
- 后端实现

---

## 模块交付节奏

每个 H 阶段严格按：

1. 修改代码
2. 跑 V1 + V2 全部检查项
3. 同步 `prd.md`
4. 停下等用户确认
5. 用户确认后再启动下一个 H 阶段

**H1 → H7 串行**，每阶段独立交付。H5 / H6 / H7 之间存在依赖（H5 详情页依赖 H6 的 `pay`，H7 是横向能力建议最后）。

---

**Phase 3 计划完。** 等用户确认进入 H1 实现。
