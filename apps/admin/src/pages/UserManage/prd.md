# 用户管理 PRD（Admin）— v1.1

> 修订记录：
> - v1.0 — 占位
> - v1.1（2026-08）— H8 实装：表格操作列加「观演人」按钮跳 `/users/viewers?userId=`；直接读 mock localStorage 渲染用户列表

## 概述
管理后台用户查询与管理页面。
H8 起：操作列加「观演人」按钮，跳到 `/users/viewers`（只读 viewer 列表）筛选该用户的观演人。

## 用户场景
- 管理员查询特定用户（按 ID 模糊）
- 查看用户订单历史、观演记录
- 从用户列表直接跳到「观演人」管理页

## 页面结构

### 主体（数据表格）
| 列 | 说明 |
|---|---|
| 用户 ID | mock token 中的 userId |
| 昵称 | — |
| 手机号 | 脱敏（maskPhone） |
| 实名 | realName |
| 角色 | Tag（admin / user） |
| 注册时间 | — |
| 操作 | 「观演人」按钮（跳到 `/users/viewers?userId=...`） |

## 数据来源
- 直接读 `localStorage['concert_mock_db_v1'].users`（mock 暂无 list users 接口；侧路方案）
- 后续接入真实后端时改为 `userApi.listUsers` 即可

## 接口
- 当前阶段：admin 用户列表通过 mock localStorage 侧路读取
- 未来：`GET /api/admin/users?...`

## 状态（H8 当前进度）
- v1.1 — H8 完成
  - 列表从 mock localStorage 读取
  - 操作列「观演人」按钮跳 `/users/viewers?userId=<userId>`
  - 已通过：tsc 0 错；lint 0 错；build 成功
  - 浏览器 E2E：admin UserManage 显示用户列表 + 「观演人」按钮可跳到 viewer 表
