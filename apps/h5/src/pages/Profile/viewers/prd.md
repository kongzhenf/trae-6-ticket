# 个人中心 → 观演人 PRD（H5）— H8 v1.0

> 修订记录：v1.0（2026-08）— H8 实装完成。落地代码 `apps/h5/src/pages/Profile/viewers/**`。

## 概述
个人中心「观演人」模块：维护当前用户的观演人库。观演人在下单时被引用（每张票对应一人），新增的观演人会自动落库（也可在「我的订单 → 下单页 → 观演人表单」直接新增）。

## 用户场景
- 用户从 Profile 页点击「观演人」入口 → `/profile/viewers`
- 用户查看自己的所有观演人列表
- 用户新增观演人
- 用户编辑观演人
- 用户删除观演人（二次确认）

## 路由
- 路径：`/profile/viewers`（H8 起被 `<RequireAuth>` 包裹）
- 未登录访问 → `/login?redirect=/profile/viewers`

## 页面结构

| 区段 | 组件 | 说明 |
|---|---|---|
| 顶部导航 | `NavBar` | 左箭头返回 `/profile` |
| 右上角 | 内联 | 「+ 新增」按钮（react-vant NavBar right area） |
| 列表 | Cell.Group | 每行：姓名 + `maskIdCard(idCardCipher)` + `maskPhone(phone)` + 编辑 / 删除 |
| 底部 | Button | 「+ 新增观演人」（大块，方便空态用户直接进入新增） |
| 弹层 | `ViewerEditorDialog`（公共） | 新增 / 编辑通用 |

## 数据来源

| 字段 | 来源 |
|---|---|
| `viewerApi.listViewers(user.id)` | 当前用户观演人列表（按 updatedAt 倒序） |
| `viewerApi.createViewer(input)` | 新增 |
| `viewerApi.updateViewer(id, partial)` | 编辑 |
| `viewerApi.deleteViewer(id)` | 删除 |

## 字段校验（H8 与下单一致）
- 姓名：`trim` 后非空
- 身份证号：长度 ≥ 15（mock 演示）
- 手机号：11 位 `^1[3-9]\d{9}$`

## 身份证脱敏
- 全场景 `maskIdCard(cipher)`：`前4位****后4位`
- C 端永不见完整号

## Hook

| 文件 | 职责 |
|---|---|
| `hooks/useViewers.ts` | 维护 viewers / loading / error / create / update / remove |

## 操作实现
- 新增：右上角「+ 新增」或底部按钮 → 弹 `ViewerEditorDialog` → 调 `viewerApi.createViewer`
- 编辑：列表行「编辑」→ 弹 `ViewerEditorDialog`（编辑模式预填）→ 调 `viewerApi.updateViewer`
- 删除：列表行「删除」→ `Dialog.confirm` 二次确认 → 调 `viewerApi.deleteViewer` → Toast

## 状态（H8 当前进度）
- v1.0 — H8 完成
  - 列表 / 新增 / 编辑 / 删除 全部接入 viewerApi
  - 编辑 / 删除复用公共 `ViewerEditorDialog` 组件（OrderCreate + Profile 共用）
  - 已通过：tsc 0 错；lint 0 错；build 成功
  - 浏览器 E2E：seed 1-3 条 → 新增 → 编辑 → 删除 → 列表更新
