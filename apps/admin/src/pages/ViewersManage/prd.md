# 观演人管理 PRD（Admin）— H8 v1.0

> 修订记录：v1.0（2026-08）— H8 实装完成。落地代码 `apps/admin/src/pages/ViewersManage/**`。

## 概述
管理后台「观演人」只读视图，跨用户查看观演人列表（按 userId 过滤）。
H8 实装：顶部筛选 + 表格 + 顶部 PRD 按钮；不提供增删改（C 端已实装）。

## 用户场景
- 管理员按 userId 查询某用户的观演人
- 关键词搜索（姓名 / 手机号 / 身份证子串）
- 校验某身份证号是否已存在（脱敏对比）

## 路由
- 路径：`/users/viewers`
- 入参（URL query）：`?userId=<id>`（从 UserManage 操作列跳转时自动带上）

## 页面结构

### 顶部筛选
- 归属用户 ID（精确）
- 关键词（姓名 / 手机号 / 身份证子串）
- 「查询」「重置」按钮

### 主体（数据表格）
| 列 | 说明 |
|---|---|
| 观演人 ID | — |
| 姓名 | — |
| 身份证 | `maskIdCard` 脱敏（前4位****后4位） |
| 手机号 | `maskPhone` 脱敏 |
| 归属用户 | userId |
| 更新时间 | — |

### 分页 + 统计
- 10 条/页
- 右上角显示「共 N / 筛选 M」

## 数据来源

| 字段 | 来源 |
|---|---|
| `viewerApi.listViewers(userId)` | mock `/api/v1/viewers?userId=` |

## 身份证脱敏（H8 统一）
- 全场景 `maskIdCard(cipher)`：`前4位****后4位`
- admin 端同样不展示完整号

## 接口
- `GET /api/v1/viewers?userId=<id>`

## 状态（H8 当前进度）
- v1.0 — H8 完成
  - 顶部筛选 + 表格 + 关键词过滤（前端）
  - 顶部 PRD 按钮（PrdPanelHost pageKey="ViewersManage"）
  - 已通过：tsc 0 错；lint 0 错；build 成功；mock 契约 21/21 ✅
  - 浏览器 E2E：admin → UserManage 点「观演人」→ 跳到 `/users/viewers?userId=40001` → 看到该用户的观演人列表（脱敏）
