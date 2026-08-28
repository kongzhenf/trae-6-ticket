# 演出详情 PRD（H5）— H2

> 修订记录：v1.1（2026-08）— H2 实现落地，落地代码 `apps/h5/src/pages/ConcertDetail/**`。
> 旧 v1.0 中提到的「艺人列表 / 多场次 / 座位图」字段在本阶段暂未对接，移除以避免误导；后续阶段补齐。

## 概述
展示单场演出的核心信息，引导用户进入购票流程。H2 范围聚焦"详情呈现 + 购票入口状态机"，票档选择页属 H3。

## 用户场景
- 用户从首页列表点击某场演出 → 进入详情页 `/concerts/:id`
- 用户查看海报、标题、场馆、销售期、票价区间与详情介绍
- 用户阅读购票须知 / 退改规则
- 用户点击「立即购票」进入票档选择 `/concerts/:id/tickets`

## 路由
- 路径：`/concerts/:id`
- 入参：`id`（演出 ID，必填）
- 出参：渲染详情页 / `NotFound` / `ErrorState`

## 页面结构（自上而下）

| 区段 | 组件 | 说明 |
|---|---|---|
| 顶部导航 | `NavBar` | 左箭头返回；`title="演出详情"`；`fixed + placeholder` 保证不抖动 |
| 海报 | `PosterSwipe` | 手写横向滚动（CSS transform + 触摸拖拽 + 自动轮播）；图源为 `coverUrl` 与 `bannerUrl`；图加载失败自动降级为标题占位 |
| 标题区 | `Header` | 标题 + 副标题（两行截断）+ 状态 `Tag` |
| 元信息卡 | `MetaCard` | 场馆（城市/名称/地址）/ 销售期（startTime ~ endTime）/ 开演时间 |
| 票价预览 | `PricePreview` | `priceRange`（mock 聚合）最低价 + 最高价 + "共 N 档票面" |
| 详情正文 | `DetailBody` | `react-markdown + remark-gfm` 渲染 `detailContent`，开启 `skipHtml` 防 XSS |
| 须知折叠 | `NoticeCollapse` | 手风琴模式；`notice` / `refundPolicy` 任一为空则整块不渲染 |
| 辅助信息 | — | "订单金额 N 档票面可选" |
| 吸底 | `StickyBuyBar` | 状态机驱动的 CTA（见下表） |

## 数据来源

| 字段 | 来源 | 说明 |
|---|---|---|
| `detail` | `api.getConcertDetail(id)`（axios GET `/concerts/:id`）| H1 已实现，含 `priceRange` / `ticketCount` |
| `posters` | `coverUrl` + `bannerUrl` | 过滤空值后传给 `PosterSwipe` |
| `notice` / `refundPolicy` | 详情接口字段 | 当前 mock 未提供，传空时折叠区整体不渲染 |
| `tickets` | `api.listTickets(eventId)`（axios GET `/concerts/:id/tickets`）| 仅用于 H3，本阶段不消费 |

> 注：mock 中目前没有 `notice` / `refundPolicy` 字段；将来后台补字段后此页会自动启用折叠面板。

## 状态机（StickyBuyBar CTA）

| `status` | 文案 | 禁用 | 是否可购买 |
|---|---|---|---|
| `on_sale` / `published` | 立即购票 | 否（无票档时禁用） | true（需 `ticketCount > 0`） |
| `pending` / `draft` | 即将开售 | 是 | false |
| `sold_out` | 已售罄 | 是 | false |
| `off_sale` / `stopped` | 暂停售票 | 是 | false |
| `finished` | 演出已结束 | 是 | false |
| `offline` / `cancelled` / 其它 | 活动不可购买 | 是 | false |

- 仅 `buyable=true` 时按钮点击才会触发 `navigate('/concerts/:id/tickets')`。
- 始终渲染底部栏以保持页面布局稳定，避免内容跳动。

## 加载 / 异常态

| 场景 | 渲染 | 操作 |
|---|---|---|
| 首次加载 | `LoadingSkeleton`（2 行卡片骨架，无顶部占位） | 自动请求 |
| 业务码 400003（活动不存在） | `NotFound` 占位 + 「返回首页」 | 点击按钮 → `/` |
| 其它网络 / 业务错误 | `ErrorState`（标题 + 描述 + 重试） | 「重试」 → `refresh()` |
| 加载完成但字段全空 | `Placeholder`（兜底） | — |

## 交互细节
- 返回：使用 NavBar 默认 `leftArrow`（`<ArrowLeft />`，**不要传 boolean shorthand `leftArrow`**，react-vant 3.3.5 的 `React.cloneElement(true, ...)` 会抛 `Element type is invalid`）。点击触发 `navigate(-1)`；若无历史则 `replace '/'`。
- 海报轮播：单图不显示页码；多图显示「N/M」+ 点击指示器跳转 + 触摸拖拽翻页（>40px 触发）；图片 `onError` 自动从列表剔除；每 5 秒自动切下一张。
- 详情区：`react-markdown` 配 `remark-gfm`；`skipHtml` 防止后台误传 HTML 触发 XSS。

## Hook & 子组件清单（新增）

| 文件 | 职责 |
|---|---|
| `hooks/useConcertDetail.ts` | 拉取详情；`400003` → `notFound`；`AbortController` 防过期响应 |
| `components/PosterSwipe.tsx` | 顶部海报轮播（手写实现）；图源过滤 + 失败降级 + 自动/触摸切换 |
| `components/PricePreview.tsx` | 票价区间 + 票档数展示 |
| `components/NoticeCollapse.tsx` | 购票须知 / 退改规则折叠面板（手风琴） |
| `components/StickyBuyBar.tsx` | 状态机 CTA，吸底 |
| `components/NotFound.tsx` | 404 占位 + 返回首页 |

## 字段说明（与 H1 ConcertListItem 对齐）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 演出 ID |
| `eventName` | string | 是 | 标题 |
| `subtitle` | string? | 否 | 副标题（两行截断） |
| `status` | ConcertStatus | 是 | 10 种状态（见 §状态机） |
| `coverUrl` | string? | 否 | 主海报 |
| `bannerUrl` | string? | 否 | 横幅海报（详情页用作第二张轮播图） |
| `detailContent` | string? | 否 | 富文本（markdown） |
| `startTime` | string (ISO) | 是 | 开演时间 |
| `saleStartTime` / `saleEndTime` | string (ISO) | 是 | 销售期 |
| `venueName` / `venueNameCity` / `venueAddress` | string? | 否 | 场馆 |
| `priceRange` | `[number, number] \| null` | 是 | 服务端聚合 |
| `ticketCount` | number | 是 | 可见票档数 |

## 接口
- `GET /api/v1/concerts/:id` — 详情（C 端 + 后台共用，H1 已实现）

## 状态（H2 当前进度）
- v1.1 — 实现完成
  - 路由：`/concerts/:id` 已接入；状态机 + 跳转票档页已实现。
  - mock：后台未提供 `notice` / `refundPolicy`，折叠面板暂不显示（属预期）。
  - 已通过：`tsc --noEmit` 0 错误 + `vite build` 成功。
  - 待办：用户手动浏览器验证；后续 H3 提供票档选择页消费 `ticketCount` / `tickets`。