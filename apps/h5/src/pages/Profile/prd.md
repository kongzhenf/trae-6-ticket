# 个人中心 PRD（H5）— H8 v1.3

> 修订记录：
> - v1.1 — 初始
> - v1.2（2026-08）— H7 接 useUser，移除自带 user 拉取；新增退出登录
> - v1.3（2026-08）— H8 新增「观演人」入口卡（→ `/profile/viewers`）+ 数量展示

## 概述
个人中心：用户卡 + 4 宫格订单统计 + 我的订单列表（按状态过滤）+ 观演人入口 + 退出登录。
H8 新增观演人模块入口；「实名自动带入」机制已被「观演人选择」替代（H8 起登录自动带 contactPhone）。

## 用户场景
- 用户从 H5 TabBar「我的」进入个人中心（已登录态）
- 未登录访问 `/profile` → `<RequireAuth>` 自动跳 `/login?redirect=/profile`
- 用户查看实名状态 + 订单统计
- 点击订单项 → `/orders/:id` 详情
- 点击 4 宫格 → 过滤订单列表
- 点击「观演人」入口 → `/profile/viewers`（H8 新增）
- 点击「退出登录」→ 清 token + 跳 `/`

## 路由
- 路径：`/profile`（TabBarLayout 内；H7 起被 `<RequireAuth>` 包裹）
- 路径：`/profile/viewers`（H8 新增；同样被 `<RequireAuth>` 包裹）

## 页面结构

| 区段 | 组件 | 说明 |
|---|---|---|
| 用户卡 | `UserCard` | 头像首字母 + 昵称 + 手机（maskPhone）+ 实名状态 Tag |
| 4 宫格统计 | `OrderStats` | 全部 / 待支付 / 已支付 / 已完成 |
| 我的订单列表 | `OrderList` | 按状态过滤 |
| **观演人入口卡**（H8） | 内联 Cell | 显示「观演人 · 共 N 位」，点击跳 `/profile/viewers` |
| 退出登录 | 自定义按钮 | `useUser().logout()` 后 navigate('/') |

## 数据来源

| 字段 | 来源 |
|---|---|
| `user` | `useUser()` |
| `orders` | `GET /api/v1/orders?userId=<userId>&status=...` |
| `viewerCount` | `useViewerCount(user.id)` 拉 `viewerApi.listViewers(user.id).length`（H8） |
| `stats counts` | 由 `orders.reduce` 实时聚合 |

## Hook / Context

| 文件 | 职责 |
|---|---|
| `hooks/useMyOrders.ts` | 调 orderApi.listOrders + 分页 |
| `hooks/useViewerCount.ts` | 拉当前用户观演人数量（H8） |
| `contexts/UserContext.tsx` | 维护 user/token |

## 状态（H8 当前进度）
- v1.3 — H8 完成
  - 新增「观演人」入口卡 + viewerCount
  - 未登录访问 `/profile/viewers` 跳 `/login?redirect=/profile/viewers`
  - 已通过：tsc 0 错；lint 0 错；build 成功
  - 浏览器 E2E：登录 user1 → Profile 显示「观演人 · 共 1-3 位」（seed 数据）
