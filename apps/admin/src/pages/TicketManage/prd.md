# 票档管理 PRD（Admin）

## 概述
单场演出下的票档与库存管理页，承担票档 CRUD、启用/停售、库存调整（含审计日志）三个职责。入口：演出列表行的「票档」按钮或路由 `/concerts/:id/tickets`。

## 用户场景
- 管理员查看某场演出下全部票档、当前可售 / 已售情况
- 临时加开 / 减少库存，填写调整原因后写入审计日志
- 启停 / 删除某票档，状态机遵循 `TICKET_TRANSITIONS`
- 查看某票档的库存调整历史，定位异常变更

## 页面结构

### 顶部条
- 返回列表 / 标题「票档管理 · 演出名」/ 活动状态 Tag
- 右上：刷新 / 新增票档

### 活动信息卡（只读）
- 演出名称 / 开演起止 / 场馆 / 状态 / 开售起止
- 写死只读，不能在票档管理页修改活动

### 票档统计条
- 共 N 个 · 总座位 · 可售
- 右侧「查看调整记录」按钮 → 打开第一张票档的 StockLogDrawer

### 票档表格
| 列 | 宽度 | 内容 |
|---|---|---|
| 排序 | 70 | sort |
| 票档名称 | 160 | categoryName |
| 价格 | 130 | formatMoney(cents) |
| 总 / 可售 / 锁定 / 已售 | 200 | 4 段拼接；可售 ≤ 0 时红色 |
| 限购 | 80 | maxBuyQuantity |
| 销售期 | 260 | saleStartTime ~ saleEndTime |
| 状态 | 100 | TicketStatusTag |
| 操作 | 220 fixed | 编辑 / 调库 / 启用·停售 |

操作按钮按 `TICKET_TRANSITIONS` 渲染：
- `available`：编辑 / 调库 / 停售（Popconfirm）
- `sold_out` / `stopped`：编辑 / 调库 / 启用
- `hidden`：编辑 / 调库（hidden 是 mock 种子的隐藏态，业务一般不直接编辑）

### 状态机白名单

| 当前状态 | 可转移到 |
|---|---|
| `available` | sold_out / hidden / stopped |
| `sold_out` | available / stopped |
| `hidden` | available |
| `stopped` | available / sold_out |

## 业务规则（PRD §31 + §8）

- 价是 **元**（前端展示）→ mock 端 *100 转 **分**
- 总库存 ≥ 0，单人限购 1-10
- 库存调整：
  - reason 必填，≥ 4 字
  - delta ≠ 0
  - `availableStock + delta ≥ 0` → 否则 `400009`
  - 调整后写一条 `StockAdjustment` 日志
- 编辑票档时 PRD §31 第 1/2 条：前端传 `availableStock` 等销售统计字段无效，mock handler 强制忽略

## 组件清单

- `TicketTable` —— 表格 + 行操作
- `TicketEditModal` —— 新建 / 编辑共用，含基础校验 + 错误提示
- `StockAdjustModal` —— 增减切换 + 数量 + 原因 + 实时预览
- `StockLogDrawer` —— 历史记录（时间 / 调整量 / 前→后 / 操作人 / 原因）

## 数据 Hook

- `useTicketManage(eventId)`：`apps/admin/src/hooks/useTicketManage.ts`
  - 装载活动 + 该活动下全部票档
  - 单一 `actionLoadingId` 防并发
  - `create / update / enable / disable / adjustStock` 返回 `ActionResult`
  - `loadStockAdjustments(ticketId)`：直接读 mock store 的 `stockAdjustments` 数组（mock 端未单独提供日志接口）

## 接口

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/admin/v1/events/:id` | 拉活动详情 |
| GET | `/admin/v1/events/:id/tickets` | 票档列表 |
| POST | `/admin/v1/events/:id/tickets` | 新建票档 |
| PUT | `/admin/v1/tickets/:id` | 编辑票档（忽略销售统计字段） |
| POST | `/admin/v1/tickets/:id/enable` | 启用 |
| POST | `/admin/v1/tickets/:id/disable` | 停售 |
| POST | `/admin/v1/tickets/:id/adjust-stock` | 库存调整（body: `{ delta, reason }`） |

## 错误码（PRD §11）

| code | 触发 | 表现 |
|---|---|---|
| 400007 | 票档不存在 | message.error 提示 |
| 400009 | 库存不足（调整后 < 0） | message.error 提示 |
| 500001 | reason 太短 / delta = 0 | message.error 提示 |
| 500001 | 状态机非法转移 | message.error 提示 |

## 状态

- M5+M6（2026-08-25）：
  - 票档 CRUD 完整闭环：新增 / 编辑 / 启停 / 调库
  - 库存调整写入 stockAdjustments 日志
  - TicketManage 页：只读活动信息卡 + 票档表 + 4 个子组件
  - 列表行加「票档」按钮跳转本页面
  - PRD 按钮 + 错误码映射完整
