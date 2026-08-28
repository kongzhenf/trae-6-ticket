# 导出中心 PRD（Admin）— v1.2

> 修订记录：
> - v1.0（2026-08-27）— H10 B10 初版：创建导出（演出 + 状态 + 时间）→ 异步生成任务 → 真实下载 Excel（CSV-U8 + BOM + .xls）
> - v1.1（2026-08-27）— 需求扩展：
>   1) Excel 在「观演人身份证号」后增加「观演人手机号」字段
>   2) 任务列表预置 5 条 mock 任务，覆盖 "一票一观演人" 演示场景 + 4 种状态
>   3) 修复历史 LocalStorage 中 orders 缺失 `viewers` / `contactPhone` 的问题：getDB() 启动时自动补足
> - v1.2（2026-08-27）— 修复：导出 Excel 中「观演人身份证号」改为**明文**（运营 / 财务对账用）；共享层 Viewer 新增 `idCardFull` 字段，C 端永不读不展示

## 概述
管理后台新增的「导出中心」独立模块，承担订单数据的离线导出。
所有任务以 mock 方式实现（DB 走 localStorage），不依赖真实后端 cron / 对象存储。

## 用户场景
- 运营需要把"某场演出 + 某段时间 + 某状态"的订单导出成 Excel 做对账 / 财务
- 运营在列表看到自己的导出历史
- 运营在链接过期前下载历史导出

## 创建导出
- 必填：演出名称（远端搜索、单选）、创建时间区间
- 选填：订单状态多选（空 = 全部）、支付状态多选（空 = 全部）
- 校验：
  - 必选演出 → 400032
  - 时间区间 end < start → 400033
  - 时间区间跨度 > 92 天 → 400034
- 点击「导出」→ 立即返回 processing 状态任务，toast「已创建导出任务，预计 2-3 秒完成」

## 任务状态机（4 态）
| 状态 | 文案 | Tag 颜色 | 进入条件 |
|---|---|---|---|
| processing | 生成中 | processing | createTask 立即进入 |
| completed | 已完成 | success | setTimeout(2.5s) 成功生成 |
| failed | 失败 | error | mock 5% 失败注入 / 异常 |
| expired | 已过期 | default | 7 天后访问 / 下载时自动转 |

## 字段
| # | 列 | 数据源 | 备注 |
|---|---|---|---|
| 1 | 任务编号 | taskNo | `EXP + YYYYMMDD + 4 位自增`，可复制 |
| 2 | 导出类型 | type | `ORDER` Tag（本期仅订单） |
| 3 | 演出名称 | eventName | 链向 `concertEdit(eventId)` |
| 4 | 订单数量 | orderCount | 千分位；processing 时显示 0 |
| 5 | 订单状态 | orderStatuses | 多个 Tag 拼接；空 = 「全部」 |
| 6 | 支付状态 | paymentStatuses | 多个 Tag 拼接；空 = 「全部」 |
| 7 | 创建人 | createdBy | mock 端默认 `admin-1` |
| 8 | 创建时间 | createdAt | `formatDate` |
| 9 | 状态 | status | 见状态机 |
| 10 | 下载 | — | 主按钮 / 禁用 + Tooltip |

## 自动轮询
- 列表中只要存在 `processing` 任务，hook 自动 1.5s 一次 refetch
- 直到所有任务不再是 `processing` 停止

## 下载协议
- 点击「下载」→ `GET /admin/v1/exports/:id/download`
- 响应：`{ base64: string; filename: string; mime: string }`
- 客户端：
  ```ts
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
  ```
- 错误码：
  - 400030 任务不存在
  - 400031 任务未完成 / 已失败 / 已过期

## 链接有效期
- 创建时 `expireAt = createdAt + 7 天`
- 客户端展示时：若 `status === 'completed' && expireAt < now` → 自动改 `status = 'expired'` 并清空 payload
- 下载时：再次检查（防止过期时间在两次 list 中间）

## Excel 文件格式
- **CSV-UTF8 + BOM + `.xls` 后缀**（零新依赖；Excel 可直接双击打开）
- BOM `\ufeff` 头避免中文乱码
- 字段顺序严格按需求 16 字段（详见下表）
- 含 `,` `"` 换行 的字段按 RFC 4180 加引号转义

### 字段定义（与 C 端 plan-order-viewers 对齐）
| 序 | 字段 | 来源 |
|---:|---|---|
| 1 | 演出名称 | `Concert.eventName` |
| 2 | 演出时间 | `Concert.startTime`（formatDate） |
| 3 | 场馆 | `Concert.venueName` |
| 4 | 订单号 | `Order.orderNo` |
| 5 | 用户ID | `Order.userId` |
| 6 | 联系手机号 | `Order.contactPhone`（明文） |
| 7 | 观演人姓名 | `Viewer.name`（行级覆盖） |
| 8 | 观演人身份证号 | `Viewer.idCardFull`（**明文** 18 位；v1.2 起；运营/财务对账用）|
| 9 | 观演人手机号 | `Viewer.phone`（明文）— v1.1 新增 |
| 10 | 票档 | `OrderItem[0].categoryNameSnapshot`（单票档） |
| 11 | 单价 | `OrderItem[0].unitPrice / 100` 元 |
| 12 | 数量 | `OrderItem[0].quantity` |
| 13 | 订单金额 | `Order.payAmount / 100` 元 |
| 14 | 支付状态 | `PAYMENT_STATUS[derivePaymentStatus(o)].label` |
| 15 | 订单状态 | `ORDER_STATUS_META[o.status].label` |
| 16 | 下单时间 | `Order.createdAt`（formatDate） |
| 17 | 支付时间 | `Order.paidAt`（formatDate），空时为 `—` |

### 行展开策略
- 一个订单含 N 位观演人 → 输出 N 行
- 每行重复订单公共字段（订单号 / 金额 / 状态 / 时间等）
- 第 7-8 列每行写对应观演人的 `name` / `idCardCipher`
- 旧数据兼容：`viewers=[]` 时输出 1 行，姓名/身份证为空

## 文件命名
`订单导出_{eventName}_{taskNo}.xls`
非法字符 `\ / : * ? " < > |` 替换为 `_`

## 隐私
- 导出文件**不做脱敏**（运营 / 财务对账用）
- 顶部红色提示：「导出内容包含订单与观演人完整实名信息（手机号 / 身份证号），属于内部数据，请勿外发。」

## 接口（H10）
- `GET /admin/v1/exports?eventId=&status=&page=&pageSize=`
- `POST /admin/v1/exports` body `CreateExportPayload`
- `GET /admin/v1/exports/:id`
- `GET /admin/v1/exports/:id/download`

## 错误码
| 码 | 文案 |
|---|---|
| 400030 | 导出任务不存在 |
| 400031 | 导出任务未完成 / 已失败 / 已过期，无法下载 |
| 400032 | 请先选择一个演出 |
| 400033 | 时间区间不合法：结束时间不能早于开始时间 |
| 400034 | 导出时间区间超过 92 天上限，请缩小范围 |

## 演示数据（v1.1 新增）
任务列表预置 5 条 mock 任务，覆盖 "一票一观演人" 演示场景与 4 种状态：

| 编号 | 状态 | 说明 |
|---|---|---|
| EXP...0001 | completed | on_sale 场次近 30 天已支付订单（多票档多观演人，下载可得 .xls） |
| EXP...0002 | completed | finished 场次近 7 天全部订单 |
| EXP...0003 | processing | published 场次跨 60 天（演示 1.5s 自动轮询） |
| EXP...0004 | failed | off_sale 场次（演示失败态 UI） |
| EXP...0005 | expired | sold_out 场次（演示 7 天过期） |

`payloadBase64` 故意留空；`adminExport.listTasks` 在首次 list 时对 `status==='completed' && !payloadBase64` 的任务做"懒生成"（用相同的 `buildOrderCsv`），并 persist 一次。

## 历史数据兼容（v1.1 修复）
H9 之前写入 LocalStorage 的 orders 缺少 `viewers` / `contactPhone`（C 端 plan-order-viewers 之前）。`store.ts` 在 `getDB()` 启动时调用 `ensureOrderViewers`：
- 按 `sum(items.quantity)` 算出"应到观演人数"
- 已有 viewers 保留；不足部分按"该 user 的观演人库 + 占位姓名 / 身份证 / 手机号"补足
- 同时回填 `contactPhone = viewers[0].phone`

无需用户手动重置 mock；刷新页面即生效。

## 验证
- typecheck / lint / build 全 0 错
- 浏览器手测：
  1. 侧栏出现「导出中心」→ 路由 `/exports` 渲染
  2. 选一场演出 + 时间区间 → 导出 → 列表立刻多 1 条「生成中」→ 约 2.5 秒变「已完成」
  3. 点击「下载」→ 浏览器下载 `.xls` 文件 → Excel 双击打开 → 16 列齐全
  4. 含 3 位观演人的订单 → 该订单号占 3 行，姓名 / 身份证号不同
  5. 把某任务的 `expireAt` 改为昨天 → 列表自动变「已过期」→ 下载按钮 disabled
- 顶部 PRD 侧栏：右上角「PRD」按钮 → 滑出 markdown 面板，渲染 v1.0

## Out of Scope
- 多类型导出（活动 / 票档 / 用户）—— 本期只做 `order`
- 真实对象存储 —— mock 端用 base64 存 localStorage
- 任务取消 / 重试 / 删除
- 邮件通知 / Webhook / 定时任务
