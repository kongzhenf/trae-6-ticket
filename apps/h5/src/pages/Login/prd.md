# 登录页 PRD（H5）— H8 v1.2

> 修订记录：
> - v1.1（2026-08）— H7 实装完成
> - v1.2（2026-08）— H8 改造：「实名自动带入 buyerDraftStore」机制被「观演人选择」替代；登录后自动带入改入 `contactDraftStore.contactPhone`（仅手机号）

## 概述
H5 用户登录入口，承担 C 端「已登录态」网关。
H8 起：登录后不再把 user.realName / idCardCipher 带入（因为买家信息改为观演人数组，由用户自行维护），仅带入 `user.phone` 作为联系信息默认值。

## 用户场景
- 未登录访问 `/profile` / `/orders/create` / `/orders/:id` / `/profile/viewers`（H8）→ 自动跳 `/login?redirect=<currentPath>`
- 登录成功 → 跳回 redirect（默认 `/`）
- 退出登录 → 清 token + 跳 `/`

## 路由
- 路径：`/login`
- 入参（URL query）：
  - `redirect`（可选）：登录成功后跳的路径（encodeURIComponent）
- 出参：登录表单 / 提示

## 页面结构

| 区段 | 组件 | 说明 |
|---|---|---|
| 顶部 | 自定义 Header | 返回按钮 + 标题「登录」 |
| 欢迎语 | 内联 | 「欢迎回来」+ mock 账号提示 |
| Tab 切换 | `Tabs`（react-vant） | 「账号密码」 / 「验证码登录」 |
| 账号密码 | `PwdLoginForm` | Field × 2 + 登录按钮 |
| 验证码 | `SmsLoginForm` | Field × 2 + 「获取验证码」按钮（mock 永远发 1234）|

## 数据来源

| 字段 | 来源 |
|---|---|
| `user` / `token` | `useUser().login(payload)` → axios POST `/auth/login` 返回；持久化到 `localStorage['concert_auth_v1']` |
| 联系手机号自动带入 | `useUser().user.phone` 写入 `useContactDraftStore.draft.contactPhone`（仅首次；OrderCreate 入口） |

## 校验规则（mock）
- 账号：`user<N>` 形式 → userId = `40000 + N`
- 密码：`123456`
- 验证码：`1234`（mock 永远固定）

## 关键业务规则
- token 格式：`mock-token-<userId>`
- `Authorization: Bearer <token>` 由 axios 拦截器自动注入
- 启动时 `UserProvider` 自动从 localStorage 恢复 token
- 未登录守卫：`<RequireAuth>` 包裹 `/profile` / `/orders/create` / `/orders/:id` / `/profile/viewers`

## Hook / Context

| 文件 | 职责 |
|---|---|
| `contexts/UserContext.tsx` | user + token 状态 + login/logout/refresh + localStorage 持久化 |
| `contexts/userToken.ts` | 模块级 token 缓存 + `__peekToken()` 给 axios 注入 |
| `components/RequireAuth.tsx` | 路由守卫：未登录跳 `/login?redirect=` |

## 接口
```
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

## 状态（H8 当前进度）
- v1.2 — H8 完成
  - 修订说明：「实名自动带入 OrderCreate」改为「联系手机号自动带入 contactDraftStore.contactPhone」
  - 「观演人」由用户在下单页自行新增 / 选择，登录态不再自动填实名三件套
  - 未登录守卫新增 `/profile/viewers`
  - 已通过：tsc 0 错；lint 0 错；build 成功；mock 契约 11/11 + 21/21 ✅
