# Dashboard PRD（Admin）

## 概述
管理后台首页，展示核心运营指标的实时快照，作为管理员日常工作的入口。

## 用户场景
- 管理员登录后第一眼看到的页面
- 快速判断当日销售、库存、用户活跃情况
- 一键跳转至演出管理模块

## 页面结构

### 顶部操作条
- **页面标题**：「运营数据概览」 + 副标题「实时反映系统销售与库存情况」
- **刷新按钮**：调用 `GET /admin/v1/dashboard/overview` 和 `/admin/v1/dashboard/top-concerts` 重新拉取数据，loading 状态由 `refreshing` 控制
- **进入演出管理按钮**：跳转 `ADMIN_ROUTES.concertList`

### 顶部指标卡（8 个，PRD B01 两排 4×4）
- **第一排（highlight=淡靛底）**：活动总数 / 销售中活动 / 订单总数 / 支付订单数
- **第二排（默认白底）**：售出票数 / 销售金额 / 今日订单 / 今日销售额
- 金额（销售金额 / 今日销售额）通过 `isMoney=true` 自动 `/100 + ¥ 前缀` 渲染
- 非金额指标（单/场/人/张）直接 `value + suffix`
- 响应式断点：`<sm>=24` / `<md>=12` / `≥lg=6`，窄屏自适应堆叠

### 中部占位区
- **销售趋势（最近 30 天）**：宽屏占 16/24，斜纹底 + 「后续阶段接入图表库（M7+）」提示
- **订单状态分布**：宽屏占 8/24，斜纹底 + 「待支付 / 已支付 / 已退款 / 已取消」提示
- 两个卡片当前不接 API，列为 M3+ 阶段任务

### 热门演出 TOP 10
- **数据源**：`GET /admin/v1/dashboard/top-concerts`
- **表格列**：排名 / 演出名称 / 已售票数 / 销售金额 / 操作
- **排序**：默认按已售票数降序；列头支持 `ticketsSold` 与 `salesAmount` 切换升降序
- **奖牌样式**：TOP3 分别给 `#facc15 / #cbd5e1 / #fb923c` 配色 + 加粗 + 16px
- **空态**：使用 antd `Empty`，文案「暂无演出销售数据，请先在【演出管理】中创建并发布演出」
- **加载态**：表格区显示 6 行 Skeleton
- **详情按钮**：当前阶段仅弹 `message.info`，M3 接入后跳转 `/concerts/:id/edit`

### 底部实时动态（占位）
- 最新 20 条订单流水（首期占位）
- 最新 10 条用户注册（首期占位）
- 与中部占位区共用 `PlaceholderCard` 斜纹底

## 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalEvents` | number | 活动总数 |
| `onSaleEvents` | number | 销售中活动数（status = on_sale） |
| `totalOrders` | number | 订单总数 |
| `paidOrders` | number | 支付订单数（status = paid） |
| `totalTicketsSold` | number | 全部票档 soldStock 之和 |
| `totalSalesAmount` | number(分) | 全部已支付订单 payAmount 之和 |
| `todayOrders` | number | createdAt 在今日 00:00 之后的订单数 |
| `todaySalesAmount` | number(分) | paidAt 在今日 00:00 之后的订单 payAmount 之和 |
| `topConcerts[].concertId` | string | 演出 ID |
| `topConcerts[].eventName` | string | 演出名称 |
| `topConcerts[].ticketsSold` | number | 已售票数（来自该演出全部票档 soldStock 之和） |
| `topConcerts[].salesAmount` | number(分) | 该演出所有已支付订单 payAmount 之和 |

## 接口
- `GET /admin/v1/dashboard/overview` 顶部 8 个指标
- `GET /admin/v1/dashboard/top-concerts` 热门演出 TOP 10
- 销售趋势 / 订单分布 / 最新订单 / 最新用户：首期不接 API，留 Card 占位

## 数据 hook
- `useDashboard()`：`apps/admin/src/hooks/useDashboard.ts`
  - 首次进入触发 `loading=true`，数据 ready 后切换 `loading=false`
  - `reload()`：用于顶部刷新按钮，`refreshing=true`，不显示全屏骨架
  - `error`：若 overview 一直未拿到（非空错误）→ 渲染 `Result status="error"` 全屏错误页
  - 重新加载成功会清空 `error`

## 状态
- M1（2026-08-25）：已对接 mock 数据层，本地 30 场演出 / 56 票档 / 120 订单 / 50 用户种子；接口路径统一 `/admin/v1/*`。
- M2（2026-08-25）：
  - 完成 8 个指标卡 + 热门演出 TOP 10 表格，5 个占位卡（销售趋势 / 订单分布 / 订单流水 / 用户注册）
  - `useDashboard` hook + `MetricCard` 组件 + 顶部刷新 / 进入演出管理操作条
  - 金额统一按分渲染为 `¥xx.xx`，非金额按 suffix 拼接
  - 加载 / 空 / 错误三态完整
