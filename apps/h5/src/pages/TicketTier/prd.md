# 票档选择 PRD（H5）— H3 v1.2

> 修订记录：
> - v1.1（2026-08）— H3 实现落地。落地代码 `apps/h5/src/pages/TicketTier/**`。
> - v1.2（2026-08）— H8 改造：单票档单选（移除「多票档」叠加）；文案改「填写联系信息」；移除「5 张硬上限」。

## 概述
展示单场演出下所有可购票档，允许用户选择 **一个票档 + 该票档多张**并跳转到下单页。
H8 起：一个订单只允许选一个票档（不支持跨票档），但单档可购多张。

## 用户场景
- 用户从演出详情点击「立即购票」→ 进入 `/concerts/:id/tickets`
- 用户选择某一个票档 + 数量
- 点击「下一步：填写联系信息」→ `/orders/create?event=:id&tier=:tierId&qty=:n`（H8 新 query）

## 路由
- 路径：`/concerts/:id/tickets`
- 入参：`id`（演出 ID）
- 出参：渲染票档列表 / 加载骨架 / NotFound / ErrorState

## 页面结构（自上而下）

| 区段 | 组件 | 说明 |
|---|---|---|
| 顶部导航 | `NavBar` | 左箭头返回（H2 同坑：不要传 boolean `leftArrow`）|
| 演出摘要 | `ConcertHeader` | 标题 + 副标题 + 状态 Tag + 时间 / 场馆 + 销售期文案（售票中 / 即将开售 / 已结束销售） |
| 实名提示 | `RealNameHint` | react-vant `NoticeBar` 蓝底提示「需实名购票，一证一票」 |
| 不可购横幅 | 内联 div | 活动非 `on_sale` / `published` 时显示「本场当前状态不可购买，仅供浏览」 |
| 票档列表 | `TicketTierCard × N` | 单卡：名称 + 状态 Tag + 描述 + 价格 + 剩余/总库存 + 限购 + `Stepper`；选中卡显示高亮（#6366f1 描边 + #eef2ff 背景 + 已选 Tag） |
| 吸底 | `StickyNextBar` | 「下一步：填写联系信息」+ 实时总价 + 数量汇总 |

## 数据来源

| 字段 | 来源 | 说明 |
|---|---|---|
| `concert` | `api.getConcertDetail(id)` | H1 已实装 |
| `tiers` | `api.listTickets(eventId)` | H1 已实装；过滤 hidden；按 `sort` 升序 |
| `selection` | 本地 zustand store（无持久化） | `{ tierId: string \| null; qty: number }`；H8 单档单选 |

## 限购算法（PRD §31 第 6/8/10 条；H8 移除全场 5 张硬上限）

```
maxQty(tier) = min(
  tier.maxBuyQuantity,        // 单票档限购
  event.maxBuyQuantity,        // 活动全场限购（H8 起不再叠加 5）
  tier.availableStock,         // 实际库存
)
```

- `maxQty = 0`（售罄）→ Stepper 整体禁用
- `tier.status != 'available'` → Stepper 整体禁用
- 活动 `status != 'on_sale' && != 'published'` → 全部 Stepper 禁用 + 顶部提示横幅

## 互斥逻辑（H8 新增）
- 选中 tier A 并设置数量 → 切到 tier B → A 的 qty 自动归零
- 由 store 的 `setSelection(tierId, qty)` 内部实现（qty > 0 才生效）

## Stepper 行为

| 按钮 | 启用条件 |
|---|---|
| `+` | `value < maxQty` 且 `tier.status === 'available'` |
| `-` | `value > 0` 且 `tier.status === 'available'` |
| `input` | 同上；整数；范围 `[0, maxQty]` |

- 数量受 `clamp(value, 0, maxQty)` 约束，超出自动截断

## 交互细节
- 已选中 tier 显示 `data-tier-selected="true"`；切换 tier 时旧 tier 自动归零（store 内部）
- 未选时吸底按钮禁用，文案「下一步：填写联系信息」
- 已选时实时展示当前选中 tier 的小计 + 数量

## Hook & 子组件清单（H8 调整）

| 文件 | 职责 |
|---|---|
| `hooks/useTicketTiers.ts` | 拉取演出 + 票档；`400003` → `notFound`；`AbortController` 防过期响应 |
| `stores/ticketSelectionStore.ts` | zustand 单档单选 store（H8 改：`{ tierId, qty }`） |
| `components/ConcertHeader.tsx` | 演出摘要 |
| `components/RealNameHint.tsx` | 实名购票提示 |
| `components/TicketTierCard.tsx` | 单票档卡（H8 加：选中高亮态） |
| `components/StickyNextBar.tsx` | 吸底按钮（H8 文案改） |

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `tier.id` | string | 是 | 票档 ID（H8 唯一选中） |
| `tier.maxBuyQuantity` | number | 是 | 单档限购 |
| `tier.availableStock` | number | 是 | 剩余库存 |
| `event.maxBuyQuantity` | number | 是 | 活动全场限购（H8 起单凭它，没有 5 张硬上限） |

## 接口
- `api.getConcertDetail(id)` — 详情
- `api.listTickets(eventId)` — 票档列表

## 状态（H8 当前进度）
- v1.2 — 单票档单选改造完成
  - Store 改为 `{ tierId, qty }` 单组结构
  - 卡片选中态高亮
  - 移除「全场 5 张硬上限」叠加
  - 文案改「下一步：填写联系信息」
  - 已通过：tsc 0 错；lint 0 错；build 成功；mock 契约 ≥ 21 项 ✅
  - 浏览器 E2E：单选切换自动归零（已通过）
