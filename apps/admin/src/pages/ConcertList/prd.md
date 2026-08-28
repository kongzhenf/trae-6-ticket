# 演出管理 - 列表 PRD（Admin）

## 概述
管理后台的演出列表页，承担演出的查询、筛选、分页、状态机变更、删除草稿等日常运维动作。编辑 / 创建跳转 M4 详情页（M3 仅做入口跳转与按钮 disabled 占位）。

## 用户场景
- 管理员按名称关键字 / 状态 / 开演时间快速定位演出
- 一键刷新或清空筛选
- 按状态机对单条演出执行：发布 / 开始售票 / 暂停销售 / 恢复销售 / 下架 / 取消 / 重新发布 / 删除草稿
- 跳转到编辑页（M4）

## 页面结构

### 顶部标题栏
- 标题「演出管理」+ 副标题「查询、筛选、状态变更、删除草稿」
- 右上操作：刷新 / 新建演出（跳转 `/concerts/new/edit`）

### 筛选条（Card 容器）
- **关键字输入框**：模糊匹配 `eventName`，回车 / 点击搜索按钮触发
- **状态下拉多选**：选项 = `EVENT_STATUS_LIST`，多选后拼逗号传给 API
- **开演时间范围**：antd `RangePicker`（含时分），传 ISO 字符串数组给 API
- **重置按钮**：清空所有筛选并回到第 1 页
- 响应式：`<md` 自动换行

### 数据表格（Card 容器，padding=0）

| 列 | 宽度 | 内容 |
|---|---|---|
| 演出名称 | 280 | 主标题 + subtitle 灰色小字 |
| 开演时间 | 200 | 开始日期 + 副行「至 HH:mm」 |
| 场馆 | 200 | 城市 + 场馆名，hover 显示完整地址 |
| 开售时间 | 160 | `formatDate()` |
| 票档 | 120 | 「N 档 / X 座」（聚合 M5 接口，本期逐条调用 `listTickets`） |
| 状态 | 110 | `EventStatusTag` |
| 更新时间 | 170 | `formatDate()` + 悬浮显示绝对时间 |
| 操作 | 操作 | 240 fixed-right | `EventActionBar` + 「票档」按钮 |

- 任何状态下都显示「编辑」（finished/cancelled 显示「查看」） + 「票档」按钮
- 「票档」跳转 `/concerts/:id/tickets`（M5+M6 页面），与状态机操作解耦

- 分页：默认 10 / 页，可选 [10, 20, 50]，含 `showTotal / showQuickJumper / showSizeChanger`
- 空态文案根据筛选是否激活切换：未筛选→「暂无演出，先点击右上角「新建演出」创建第一场吧」；已筛选→「没有符合条件的演出，试试调整筛选条件」

### 操作矩阵（PRD §9.1 状态机）

| 当前状态 | 可用操作 |
|---|---|
| `draft` | 编辑 / 发布 / 删除 |
| `pending` | 编辑 / 发布 / 取消 |
| `published` | 编辑 / 开始售票 / 下架 |
| `on_sale` | 编辑 / 暂停销售 / 下架 |
| `off_sale` | 编辑 / 恢复销售 / 下架 |
| `stopped` | 编辑 / 恢复销售 / 下架 |
| `sold_out` | 编辑 / 下架 |
| `offline` | 编辑 / 重新发布 |
| `finished` | 仅查看 |
| `cancelled` | 仅查看 |

- 危险操作（下架 / 暂停 / 删除 / 取消）走行内 `Popconfirm` 二次确认；删除额外加 `Modal.confirm` 强调「不可恢复」
- 单行变更时该行所有按钮 loading；其他行按钮 disabled（防并发）

## 字段说明（与 `Concert` 类型对齐）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 演出 ID |
| `eventName` | string | 演出名称 |
| `subtitle` | string? | 副标题 |
| `startTime` / `endTime` | string | 开演起止时间 |
| `venueName` / `venueAddress` | string | 场馆名 / 详细地址 |
| `saleStartTime` / `saleEndTime` | string | 开售起止时间 |
| `status` | `ConcertStatus` | 当前状态机值 |
| `updatedAt` | string | 最近一次更新时间 |

## 接口

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/admin/v1/events?keyword=&status=&startTimeRange=&page=&pageSize=` | 列表查询 |
| POST | `/admin/v1/events/:id/publish` | 发布 |
| POST | `/admin/v1/events/:id/offline` | 下架 |
| POST | `/admin/v1/events/:id/stop-sale` | 暂停销售 |
| POST | `/admin/v1/events/:id/resume-sale` | 恢复销售 |
| DELETE | `/admin/v1/events/:id` | 删除（仅 draft / pending） |
| GET | `/admin/v1/events/:id/tickets` | 票档聚合（M3 客户端逐条调用，M5 切换为聚合接口） |

## 错误码（PRD §11）

| code | 触发条件 | 列表行为 |
|---|---|---|
| 400018 | 活动存在订单 / 票档 / 非草稿 | 删除弹错误提示，不动表格 |
| 400004 | 状态机非法转移 | 操作失败提示，保留原状态 |
| 400003 | 活动不存在 | 触发 reload 一次 |

## 数据 Hook

- `useEvents(initialPageSize = 10)`：`apps/admin/src/hooks/useEvents.ts`
  - 内部维护 `filter / page / pageSize` 三态
  - 修改筛选 → 自动回到第 1 页
  - 修改 pageSize → 自动回到第 1 页
  - `publish / offline / stopSale / resumeSale / remove` 返回 `ActionResult { ok, message?, code? }`
  - 单一 `actionLoadingId` 防并发（同时只允许一行变更）
  - 任一变更完成后自动 `reload()` 一次

## 组件清单

- `EventStatusTag`：基于 `EVENT_STATUS` 常量渲染 Tag
- `EventActionBar`：按状态机白名单渲染操作按钮组
- `EventFilterBar`：关键字 + 状态下拉多选 + 时间范围 + 重置
- `MetricCard`（M2）继续复用

## 状态

- M3（2026-08-25）：
  - 完成列表查询（关键字 / 状态 / 时间范围 / 分页）
  - 完成状态机白名单操作（发布 / 开始售票 / 暂停 / 恢复 / 下架 / 取消 / 重新发布 / 删除草稿）
  - 完成 8 列表格 + 行级 loading + 全局 disabled 防并发
  - 完成空态 / 错误态 / 加载态三态
  - 票档聚合暂用客户端逐条调用，M5 接入聚合接口后替换
  - 编辑 / 创建跳转 `/concerts/:id/edit`，待 M4 实装
- M5+M6（2026-08-25）：
  - 编辑跳转 `/concerts/:id/edit` 已实装（M4）
  - 操作列新增「票档」按钮跳转 `/concerts/:id/tickets`（M5+M6 票档与库存管理）
  - 票档聚合暂保留客户端逐条调用（M6 阶段统一聚合接口时移除）
