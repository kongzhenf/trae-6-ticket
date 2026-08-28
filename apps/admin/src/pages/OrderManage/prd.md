# 订单管理 PRD（Admin）— v1.3

> 修订记录：
> - v1.0 — 占位
> - v1.1（2026-08）— H8 实装：列表接 `orderApi.listOrders`；详情 Drawer 含 `viewers[]` 表格；顶部 PRD 按钮
> - v1.2（2026-08-27）— H9 B05 升级：
>   - 对齐 C 端 `plan-order-viewers` 的下单结构（单票档 + `viewers[]` + `contactPhone`）
>   - 状态机拆为「订单状态（5 态）」+「支付状态（7 态）」双轴
>   - 列表 10 项筛选 + 10 列 + 操作列新增「退款」按钮（仅 UI 占位）
>   - 详情 Drawer 5 区块：基本信息 / 活动信息 / 票档明细 / 观演人 / 支付信息
>   - 新增 `RefundMockDialog` 占位弹窗（写 `localStorage.concert_admin_refund_log`）
> - v1.3（2026-08-27）— S 系列强化：
>   - 对齐 `plan-order-viewers` 完整语义：单订单只允许 1 个票档，`viewers.length === items[0].quantity`（一票一观演人）
>   - seed 调整：qty 均匀覆盖 1-3；占位观演人多姓名/多身份证号；items[0].quantity === viewers.length
>   - 详情 Drawer「观演人」表新增「票号 / 对应票档」两列；票数 ≠ 观演人数时显示红色「数据不一致」警告
>   - 列表「票档」列加 `InfoCircleOutlined` 图标 + Tooltip 描述「一票一观演人」

## 概述
管理后台订单查询与处理页面，承担订单检索、状态管理、退款处理（本期仅 UI 占位）。
H9 起接管理端专用 `adminOrderApi`（mock `/admin/v1/orders*`），与 C 端 `/api/v1/orders*` 并存，详情含 `viewers[]` 观演人表 + 完整 `contactPhone`（列表层脱敏）。

## 下单结构语义（与 C 端 plan-order-viewers 对齐）
- **单票档**：一个订单只允许 1 个票档（OrderItem 数量 = 1），其 `quantity` 决定本单总票数
- **一票一观演人**：`viewers.length === sum(items[].quantity)`，每张票对应一位实名观演人
- **联系手机号独立**：`contactPhone` 与 `viewers[].phone` 是两条独立数据；前者用于订单通知，后者用于入场核验
- **数量上限**：`quantity <= min(tier.maxBuyQuantity, event.maxBuyQuantity, tier.availableStock)`，本期不设硬上限 5
- **seed 演示**：qty 均匀覆盖 1-3；占位观演人多姓名 / 多身份证号；详情页可见「第 N 张 / 票档 X」映射

## 用户场景
- 运营查询订单（订单号 / 活动 / 票档 / 手机号 / 观演人姓名 / 身份证 / 订单状态 / 支付状态 / 创建时间 / 支付时间）
- 跟进待支付订单（超时关闭 → 支付状态自动派生出 `failed`）
- 查看订单详情（基本信息 + 活动 + 票档 + 观演人 + 支付信息）
- 申请退款（**本期 UI 占位**；未对接真实支付流）

## 状态机

### 订单状态（OrderStatus，5 态）
`pending` / `paid` / `cancelled` / `refunded` / `finished`

### 支付状态（PaymentStatus，7 态）
`unpaid` / `paying` / `paid` / `partial_refund`（预留）/ `refunding` / `refunded` / `failed`

派生规则（与 `derivePaymentStatus` 对齐）：
- `refunded` → `refunded`
- `paid` / `finished` → `paid`
- `cancelled` → `unpaid`
- `pending` + 有 `paidAt` → `paying`
- `pending` + `expireTime` 已过 → `failed`
- 其它 → `unpaid`

### 退款状态机白名单
`paid` / `finished` → `refunded`（写 `refundedAt`）
`pending` / `cancelled` / `refunded` → **400025**「订单已退款或已取消，无法再次退款」
`reason` 长度 < 4 → **400026**「退款原因至少 4 个字」

## 页面结构

### 顶部筛选条（10 项）
| # | 控件 | 字段 | 备注 |
|---|---|---|---|
| 1 | Input | orderNo | 精确 |
| 2 | Select（远端搜索） | eventId | 关键字搜 `adminEventApi.listEvents` |
| 3 | Select（联动） | ticketTierId | 选中活动后 `adminTicketApi.listTickets` |
| 4 | Input | userMobile | 精确匹配 `contactPhone` / `viewers[].phone` / `user.mobile` |
| 5 | Input | viewerName | 模糊匹配 `viewers[].name` |
| 6 | Input | viewerIdCard | 精确匹配 `viewers[].idCardCipher` |
| 7 | Select 多选 | orderStatus | `ORDER_STATUS_LIST` |
| 8 | Select 多选 | paymentStatus | `PAYMENT_STATUS_LIST` |
| 9 | RangePicker | createdAtRange | 转 ISO 后传入 |
| 10 | RangePicker | paidAtRange | 转 ISO 后传入 |

右侧：「查询 / 重置」。

### 主体（数据表格，10 列 + 操作）
| 列 | 数据源 | 备注 |
|---|---|---|
| 订单号 | `orderNo` | 链接样式，点击 / 操作「详情」打开 Drawer |
| 活动 | `eventName` (handler join) | 链向 `ADMIN_ROUTES.concertEdit(eventId)` |
| 用户手机 | `userMobile` (handler join) | `maskPhone()` 脱敏 |
| 票档 | `ticketTierSummary` | `"VIP × 2"` 或 `"VIP × 1 / 看台 × 1"` |
| 数量 | `items[].quantity` 求和 | — |
| 金额 | `payAmount` | `formatMoney` |
| 支付状态 | `derivePaymentStatus(o)` | Tag，按 `PAYMENT_STATUS` |
| 订单状态 | `status` | Tag，按 `ORDER_STATUS_META` |
| 创建时间 | `createdAt` | `formatDate` |
| 支付时间 | `paidAt` | 空 → 「—」 |
| 操作 | — | 「详情 / 退款」（按状态条件） |

### 操作按钮可见性
- `paid` / `finished` → 「退款」可点
- `refunded` / `cancelled` → 「退款」disabled + tooltip「订单已退款/已取消」
- `pending` → 「退款」disabled + tooltip「订单待支付，无需退款」

### 详情 Drawer（5 区块，宽 720）
1. **基本信息**：订单号（可复制）、用户 ID、联系手机号（脱敏）、下单时间、订单状态 Tag、支付状态 Tag
2. **活动信息**：活动名（链向编辑页）+ 活动 ID
3. **票档明细**：Table 行 = 票档 / 单价 / 数量 / 小计；底部「合计」行
4. **观演人**（含 H8 + S 系列强化）：Table 列 = 票号（Tag「第 N 张」）/ 对应票档 / 姓名 / `maskIdCard(idCardCipher)` / `maskPhone(phone)`；标题旁显示「共 N 位」+「票档 × 数量」紫色 Tag；如 `viewers.length !== items[].quantity` 红色 Tag 警告「数据不一致：票数 X ≠ 观演人 Y」；右上角说明「一票一观演人 · 身份证 / 手机号已脱敏」；空态「— 无观演人信息（旧数据兼容）」
5. **支付信息**：支付方式 / 支付时间 / 取消时间 / 退款时间 / 过期时间 / 入场码（可复制）

Drawer 底部 Footer：左下「关闭」、右下「申请退款」（按状态条件显示）。

### 退款 UI 占位弹窗（RefundMockDialog）
- 顶部红色 NoticeBar：「本期退款为 UI 占位演示，未对接真实退款流；如需启用请联系开发。」
- 表单：订单号（只读）/ 退款金额（只读）/ 退款原因（`Input.TextArea`，≥ 4 字）
- 底部：取消 / 确认（点击后写 `localStorage.concert_admin_refund_log` + `console.info('[admin refund mock]')` + toast「已记录退款申请（演示）」）
- **设计留 hook**：`submitRefund` 函数可一行替换为 `adminOrder.refundOrder(id, reason)`，O-6 之后启用

## 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 订单 ID |
| `orderNo` | string | CON + 年月 + 8 位数字 |
| `userId` | string | 用户 ID |
| `eventId` | string | 活动 ID |
| `items` | OrderItem[] | 票档明细 |
| `viewers` | Viewer[] | 观演人数组（与 items 数量一一对应） |
| `contactPhone` | string | 联系手机号（C 端 plan-order-viewers 字段） |
| `totalAmount` / `payAmount` / `discountAmount` | number(分) | 金额 |
| `status` | OrderStatus | 5 态 |
| `paidAt` / `cancelledAt` / `refundedAt` | string(ISO)? | 时间 |
| `expireTime` | string(ISO) | 待支付过期 |
| `entryCode` | string? | 入场码 |

`OrderAdminView` 扩展字段（仅 mock handler 填，前端不写）：
- `eventName`
- `ticketTierSummary`
- `viewerCount`
- `userMobile`（= `contactPhone` ?? `viewers[0].phone` ?? `user.mobile`）

## 接口（H9）
- `GET /admin/v1/orders?orderNo=&eventId=&ticketTierId=&userMobile=&viewerName=&viewerIdCard=&orderStatus=paid,finished&paymentStatus=paid&createdAtRange=&paidAtRange=&page=&pageSize=&keyword=`
- `GET /admin/v1/orders/:id`
- `POST /admin/v1/orders/:id/refund` body `{ reason: string }`

> 旧 C 端 `/api/v1/orders*` 仍保留（管理后台 `ApiContext.order` 兼容），H5 调用方零改动。

## 隐私
- 列表层 `userMobile` / `contactPhone` / `viewers[].phone` / `viewers[].idCardCipher` **一律脱敏**
- 详情 Drawer 展示 `maskPhone(contactPhone)` / `maskIdCard(idCardCipher)`（H8 统一规则）
- 退款原因写本地 storage 不上后端

## 操作日志
本期仅 `console.info` 占位；Phase 7 接 audit 模块。

## 错误码
| 码 | 文案 | 触发 |
|---|---|---|
| 400012 | 订单不存在 | GET 详情 / 退款 id 找不到 |
| 400025 | 订单已退款或已取消，无法再次退款 | 退款状态机校验 |
| 400026 | 退款原因至少 4 个字 | 退款表单校验 |

## 验证
- tsc 0 错；lint 0 错；4 包 build 成功
- mock 列表 ≥ 100 条；任意筛 → 列表刷新 ≤ 500ms
- 详情 Drawer 5 区块完整；观演人身份证 / 手机号脱敏
- 退款 UI：paid 订单点「退款」→ 弹窗 → 填理由（≥ 4 字）→ 确认 → toast 演示 + localStorage 写入
- 退款 disabled：refunded / cancelled / pending 订单点按钮 → disabled + tooltip
- PRD 侧栏：右上角「PRD」按钮 → 滑出 markdown 面板，渲染 v1.2
- C 端 H5 下单 → admin 列表立即多 1 条（含 viewers / contactPhone / 状态正确）
