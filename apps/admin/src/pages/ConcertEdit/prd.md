# 演出编辑 PRD（Admin）

## 概述
单场演出的完整编辑页，采用 7 步分步表单 + 顶部操作栏，承担新建与编辑两种入口。
新建时 URL `/concerts/new/edit`，编辑时 URL `/concerts/:id/edit`。保存草稿与发布均通过 mock 端接口完成，无后端依赖。

## 用户场景
- 新建一场演出：按 7 步填完基础信息 / 详情 / 销售规则 / 购票字段 / 票档 / 须知，预览后保存为草稿或直接发布。
- 编辑已存在演出：调整任一步骤字段，点「保存草稿」落地或「发布」推进状态。
- 草稿状态可被反复修改；草稿和未发布数据保存在 `localStorage.concert_draft_<scopeId>` 中，刷新不丢。

## 页面结构

### 顶部条
- 返回列表按钮 / 页面标题「新建演出 / 编辑演出 #ID」/ 服务端状态 Tag / 「● 有未保存改动」提示
- 右上角：「保存草稿」+「发布」+「上一步 / 下一步 / 确认发布」

### 步骤条（antd `Steps` 横向，7 步）

| Step | 标题 | 主要字段 | 校验 |
|---|---|---|---|
| 1 | 基础信息 | eventName, subtitle, coverUrl, bannerUrl, startTime, endTime, venueName, venueAddress, longitude, latitude | eventName 必填 ≤200；startTime 必填；venueName 必填 ≤200；endTime > startTime |
| 2 | 活动详情 | detailContent | 无（富文本占位 Input.TextArea 10 行） |
| 3 | 销售规则 | saleStartTime, saleEndTime, orderTimeoutMinutes, maxBuyQuantity, refundEnabled, showStock | saleStart < saleEnd < startTime；orderTimeout 1-1440；maxBuy 1-10 |
| 4 | 购票字段 | buyerNameRequired, idCardRequired, mobileRequired(永远 true) | 至少保留 1 个必填（除手机号） |
| 5 | 票档配置 | items: [{ categoryName, price(元), totalStock, maxBuyQuantity, saleStartTime, saleEndTime, sort, description }] | 至少 1 个；价 ≥ 0；总库存 > 0 |
| 6 | 购票须知 | noticeContent | 无（Input.TextArea 10 行） |
| 7 | 发布预览 | 只读汇总卡 | — |

### 底部操作
- 上一步（首步禁用）/ 保存草稿（任意步都可点）/ 下一步 / 确认发布（仅 Step 7 显示）

## 字段说明

### Step 1 基础信息
| 字段 | 类型 | 说明 |
|---|---|---|
| `eventName` | string | 演出名称（必填，≤200） |
| `subtitle` | string? | 副标题（≤300） |
| `coverUrl` / `bannerUrl` | string? | 图片 URL（M4 仅文本框，M5+ 接入上传） |
| `startTime` | ISO string | 开演时间 |
| `endTime` | ISO string? | 结束时间 |
| `venueName` | string | 场馆名（必填） |
| `venueAddress` | string? | 详细地址 |
| `longitude` / `latitude` | number? | 经纬度（M4 手动输入，后续接入地图） |

### Step 3 销售规则
| 字段 | 类型 | 说明 |
|---|---|---|
| `saleStartTime` / `saleEndTime` | ISO string | 开售起止 |
| `orderTimeoutMinutes` | number | 1-1440，默认 15 |
| `maxBuyQuantity` | number | 1-10，默认 4 |
| `refundEnabled` | boolean | 是否允许退票 |
| `showStock` | boolean | 是否显示库存 |

### Step 4 购票字段
| 字段 | 类型 | 说明 |
|---|---|---|
| `buyerNameRequired` | boolean | 姓名必填/选填 |
| `idCardRequired` | boolean | 身份证必填/选填 |
| `mobileRequired` | true | 手机号永远必填，PRD §5 实名要求 |

### Step 5 票档
| 字段 | 类型 | 说明 |
|---|---|---|
| `categoryName` | string | 票档名称（≤100） |
| `price` | number | **元**（内部 *100 转分传给 mock） |
| `totalStock` | number | 总库存（≥0） |
| `maxBuyQuantity` | number | 单人限购（1-10） |
| `saleStartTime` / `saleEndTime` | ISO string | 票档销售期（默认取活动级） |
| `sort` | number | 排序（默认 0） |
| `description` | string? | 说明 |

### Step 6 须知
| `noticeContent` | string | 购票须知 |

## 数据存储

### 客户端草稿（持久化）
- `zustand persist` → `localStorage.concert_draft_<scopeId>`
- scopeId 为 'new' 时存储于 `concert_draft_new`；保存成功后自动切换为真实 id 对应的 key
- 仅持久化 `draft / dirty / currentStep` 三个字段；`scopeId` 不进 localStorage（由工厂入参决定）

### 服务端数据
- 接口：`/admin/v1/events`（新建 / 更新）
- M4 范围**不保存票档**：服务端只接受活动基础字段；票档仅保存到本地草稿
- M5 进入后扩展：保存草稿时同步 POST `/admin/v1/events/:id/tickets`

## 接口

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/admin/v1/events/:id`  | 编辑模式下拉取详情 |
| POST | `/admin/v1/events` | 新建活动 |
| PUT | `/admin/v1/events/:id` | 更新活动（保存草稿） |
| POST | `/admin/v1/events/:id/publish` | 发布 |

## 状态机 & 发布护栏

发布按钮触发：
1. 全量 7 步校验（任一错误 → 弹 `Modal.error` 列出全部错误，按 OK 留在当前步）
2. `EVENT_TRANSITIONS[serverStatus].includes('published')` —— 不在白名单 → 弹错误并禁用发布按钮（在顶部条上方 Alert 提示）
3. `save()` → 成功后调 `publishEvent(id)` → 跳回列表

状态推进：`draft → published`（publish 一次到位），后续 `published → on_sale` 走列表「开始售票」按钮。

## 错误码（PRD §11）

| code | 触发 | 列表行为 |
|---|---|---|
| 400003 | 活动不存在 | 编辑模式下 Result 错误页，引导回列表 |
| 400004 | 状态机非法转移 | publish 失败时 message 提示 |
| 500001 | 系统异常（mock 兜底） | message 提示 |

## 组件 / Hook

- `useConcertEdit(scopeId)`：`apps/admin/src/hooks/useConcertEdit.ts`
  - 维护 draft / dirty / currentStep
  - 封装 `save()` / `publish()`
  - 输出 `ActionResult { ok, id?, message?, code? }`
- `concertDraftStore`：`apps/admin/src/stores/concertDraftStore.ts`
  - zustand store，每个 scopeId 一个实例
  - persist 到 localStorage
- 7 个 Step 组件：`steps/Step{1..7}.tsx`
- `EventStatusTag`（M3）继续复用
- `PrdPanelHost` 全局默认，PRD 侧边面板接入

## 不在 M4 范围

- 富文本编辑器（Step 2 / Step 6 用 `Input.TextArea` 占位 + TODO 注释）
- 真实图片上传（封面 / Banner 用 URL 输入框）
- 真实地图选址（经纬度用 `InputNumber` 手动输入）
- M4 阶段**不保存票档到 mock 端** —— 票档仅本地草稿，M5 接管
- React Router `useBlocker` 离开拦截（M4 范围内只保留 store 持久化与 dirty 提示）

## 状态

- M4（2026-08-25）：
  - 完成 7 步分步表单 + 顶部操作 + 底部导航
  - 接入 mock：`GET /admin/v1/events/:id` 拉取详情，`POST/PUT` 保存草稿，`POST /:id/publish` 发布
  - 发布护栏：全量 7 步校验 + 状态机白名单 + Modal 二次确认
  - 草稿 zustand persist 到 localStorage，刷新不丢
  - PRD 按钮 + 错误码映射完整
  - 票档暂为本地草稿，M5 接管后端落库
