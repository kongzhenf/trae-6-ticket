# 订单详情 PRD（H5）— C05 v1.3

> 修订记录：
> - v1.1（2026-08）— H5 实现落地
> - v1.2（2026-08）— H6 实装模拟支付 + entryCode
> - v1.3（2026-08）— H8 改造：`buyer` → `viewers[]`；身份证统一走 `maskIdCard`（前4位****后4位）；入场需「入场码 + 观演人本人身份证原件」；PayInfo 增加联系手机号

## 概述
展示订单完整信息（演出 / 票档 / 观演人 / 支付 / 倒计时 / 状态机操作）。
H8 起：购票人字段改为 `viewers[]` 数组，每张票对应一行；身份证全场景走 `maskIdCard` 统一规则。

## 用户场景
- 用户从 H8 下单成功跳转 → `/orders/:id`
- 用户从个人中心点某条订单 → `/orders/:id`
- 待支付订单显示倒计时；过期 → 「立即支付」disabled，「重新下单」可见
- 已支付订单显示入场码 + 入场核验提示
- 申请退款（mock 弹窗占位）

## 路由
- 路径：`/orders/:id`
- 入参：`id`（订单 ID）
- 出参：渲染详情 / Loading / NotFound / ErrorState

## 页面结构（自上而下）

| 区段 | 组件 | 说明 |
|---|---|---|
| 顶部导航 | `NavBar` | 左箭头返回（H2 同坑：不传 boolean `leftArrow`）|
| 状态横幅 | `StatusBanner` | 彩色背景 + 状态 Tag + 提示文案（按 status 映射） |
| 倒计时 | `CountdownText` | pending + 未过期时显示 mm:ss 倒计时 |
| 入场码 | `EntryCodeBox` | paid 状态显示入场码（H6 由 pay 写入；H5 占位 `MOCK-{orderNo.slice(-8)}`）+ 「入场时请出示此码 + 观演人本人身份证原件」 |
| 演出信息 | 内联 `ConcertBlock` | 标题 + 开演时间 + 场馆 + 合计 |
| 票档明细 | `ItemsTable` | items[].categoryNameSnapshot × qty + 小计 |
| **观演人**（H8 改造） | `ViewersCard` | viewers[] 数组渲染；每行：序号 + 姓名 + `maskIdCard(idCardCipher)` + `maskPhone(phone)` |
| 订单信息 | `PayInfo` | 订单号 / 创建时间 / **联系手机号（maskPhone）** / 支付方式 / 支付时间 / 取消时间 |
| 底部操作 | `ActionBar` | 按状态显示主操作 + 次操作；终态隐藏 |

## 状态机

| status | expired | 横幅 | 主操作 | 次操作 |
|---|---|---|---|---|
| `pending` | false | 待支付 + 「请尽快完成支付」 | 「立即支付」 | 「取消订单」 |
| `pending` | true | 待支付 + 「订单已失效，请重新下单」 | 「重新下单」 → `/concerts/:id/tickets` | — |
| `paid` | — | 已支付 + 「演出当天请出示入场码」 | 「查看入场码」 | 「申请退款」（H6 mock） |
| `cancelled` | — | 已取消 + 「订单已关闭」 | — | — |
| `refunded` | — | 已退款 + 「退款已处理」 | — | — |
| `finished` | — | 已完成 + 「演出已结束」 | — | — |

## 身份证脱敏规则（H8 统一）
- 全场景统一通过 `maskIdCard(cipher)`：`前4位****后4位`（如 `1101**********1000`）
- mock 中 cipher 是脱敏字符串（18 位）；C 端永不见完整号
- 真实生产从 cipher 解密后也走此规则

## 操作实现
- **立即支付**：H8 接入 `MockPayDialog` + `mockPaySdk.payOrder`
- **取消订单**：react-vant `Dialog.confirm` 二次确认 → `orderApi.cancelOrder(id)` → refresh
- **重新下单**：`navigate(/concerts/:id/tickets)`
- **申请退款**：仅 `Dialog.alert` 占位
- **查看入场码**：Toast 提示

## Hook / Util

| 文件 | 职责 |
|---|---|
| `hooks/useOrderDetail.ts` | 拉取订单详情；1s 心跳 + `expired` |
| `utils/orderStatus.ts` | `resolveActions` 主/次操作 |
| `components/ViewersCard.tsx` | 观演人列表（H8 新增） |

## 接口
- `GET /api/v1/orders/:id`（返回 Order 含 `viewers[]` + `contactPhone`）
- `POST /api/v1/orders/:id/cancel`
- `POST /api/v1/orders/:id/pay`

## 状态（H8 当前进度）
- v1.3 — H8 完成
  - ViewersCard 替代 BuyerCard；空态显示「— 无观演人信息 —」（旧数据兼容）
  - 身份证全场景走 maskIdCard（`前4位****后4位`）
  - 入场码区追加「+ 观演人本人身份证原件」提示
  - PayInfo 增加「联系手机号」行（maskPhone）
  - 已通过：tsc 0 错；lint 0 错；build 成功；mock 契约 21/21 ✅
