# 下单页 PRD（H5）— H8 v1.3

> 修订记录：
> - v1.1 — H4 实装 createOrder + 实名表单
> - v1.2（2026-08）— H7 接 useUser，自动从 user.realName / idCardCipher / phone 带入 buyerDraftStore；H7 起被 `<RequireAuth>` 包裹
> - v1.3（2026-08）— H8 改造：拆「联系信息（手机号）」+「观演人（每张票对应一人）」；删除 buyer 字段；下单 query 改 `?event=&tier=&qty=`；自动落库到 db.viewers

## 概述
用户确认订单（票档 + 数量 + 联系手机号 + 观演人 + 支付方式）并提交，提交成功后跳转到订单详情页。
H8 起下单页由「实名信息」改造为「联系信息 + 观演人」两段式：联系信息只填手机号；观演人每张票对应一人（姓名 / 身份证 / 手机号）。

## 用户场景（H8 改动）

- 未登录访问 `/orders/create?...` → `<RequireAuth>` 跳 `/login?redirect=/orders/create?...`
- 登录 user1/123456 → 跳回原 URL + contactDraftStore.contactPhone 自动带入
- 用户选择/新增 N 位观演人（H8 起 N === quantity）
- 选择支付方式 → 提交
- 提交成功后跳 `/orders/:id` 详情

## 路由（H8 改动）
- 路径：`/orders/create`（已被 `<RequireAuth>` 包裹）
- Query：`?event=:id&tier=:tierId&qty=:n`（H8 单档单选）
- 未登录访问 → `/login?redirect=<currentUrl>`（保留完整 query）

## 数据来源（H8 改动）

| 字段 | 来源 |
|---|---|
| `user` | `useUser()`（H8 起驱动 contactDraftStore.contactPhone 自动带入） |
| `concert` | `useConcertDetail(concertId)` |
| `tiers` | `useApi().concert.listTickets(concertId)` |
| `draft.contactPhone` | `useContactDraftStore`（H8 起首次访问自动写入 `user.phone`） |
| `viewers` | `useContactDraftStore.viewers`（H8 起按数量，每张票对应一人） |
| 提交订单 | `api.createOrder({ concertId, ticketTierId, quantity, viewers, contactPhone, payMethod })`（axios POST `/orders`），返回 `expireTime` 用于倒计时 |

## 联系信息表单（H8 新增）
- 板块标题：「联系信息」
- 字段：仅手机号（必填，11 位 1[3-9]xxxxxxxxx）
- 自动带入：登录后 useUser().phone 写入一次
- 校验：`isPhone(value)`

## 观演人表单（H8 新增）
- 板块标题：「观演人」
- 按 `quantity` 渲染 N 张观演人卡（卡 1..N）
- 每张卡：姓名 / 身份证号 / 手机号（三个字段必填）
- 「选择已有」按钮 → ViewerSelector 弹层（从个人中心观演人库选）
- 「+ 新增观演人」按钮 → ViewerEditorDialog（保存后回填）
- 「清除」按钮 → 重置该卡为空白新增态
- 校验：name 必填 / idCardCipher ≥15 / phone 11 位

## 观演人自动落库（H8 新增）
- 下单时若 viewer 的 `idCardHash` 在当前用户 db.viewers 中不存在 → 新建
- 已存在则复用并刷新姓名 / 手机号
- 由 mock handler `createOrder` 内部完成

## 支付方式 + 倒计时
- 支付方式：微信 / 支付宝 / 模拟（H8 不变）
- 倒计时：基于 `expireTime`（服务端计算 `now + orderTimeoutMinutes` 分钟）

## 提交校验（H8）
- 联系手机号合法
- viewers.length === quantity
- 每位 viewer 三字段均合法

## 路由
- 路径：`/orders/create`
- 入口：TicketTier 页「下一步」跳转到此页（H8 新 query 格式）

## 状态（H8 当前进度）
- v1.3 — H8 完成
  - 联系信息板块（仅手机号）
  - 观演人板块（N 张卡 + 选择已有 / 新增 / 清除）
  - submit payload 改新结构（单档 + viewers[] + contactPhone）
  - 自动落库到 db.viewers
  - 提交后跳详情，详情展示 viewers[]（脱敏）
  - 已通过：tsc 0 错；lint 0 错；build 成功；mock 契约 21/21 ✅
  - 浏览器 E2E：未登录跳登录 → 跳回 → 实名自动填入 + 观演人填写 + 提交 → 详情展示
