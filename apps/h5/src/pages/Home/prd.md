# 首页 PRD（H5）

## 概述
演唱会售票平台 H5 首页。用户打开应用第一眼看到的页面，承担「发现演出」的核心入口职责。

## 用户场景
- 用户打开应用 → 浏览推荐演出列表
- 用户通过搜索 / 分类切换筛选 → 列表实时更新
- 用户下拉刷新列表；上拉 / 触底加载更多
- 点卡片 → 跳 `/concerts/:id`（H2 详情）

## 页面结构

### 顶部 NavBar
- 标题「演唱会票务」（react-vant `NavBar` fixed）
- 右上「PRD 文档」按钮由 `<PrdPanelHost>` 自动注入

### 搜索栏
- 占位文案「搜索演出 / 艺人 / 场馆」
- 输入 → `onChange` 更新内部 keyword state
- 回车提交 → `refresh()` 重查第一页

### 分类 Tabs
- 推荐（默认）：`status ∈ ['on_sale', 'sold_out', 'pending']`
- 即将开售：`status = 'pending'`
- 售票中：`status = 'on_sale'`
- 切换分类 → 重置 keyword 不变；查询参数变化触发首页重新拉取

### 顶部提示条
- 当前分类的简介文案 + 共 N 场

### 列表
- 卡片：左海报 + 右标题 / 副标题 / 场馆 / 开演时间 / 价格区间 / 状态 Tag
- 状态 Tag 颜色映射（H5 react-vant 适配）：
  - 售票中 / 已支付 → `success`
  - 已停售 / 已暂停 → `warning`
  - 已售罄 → `danger`
  - 即将开售 / 已发布 → `primary`
  - 草稿 / 已下架 / 已结束 / 已取消 → `default`
- 价格区间：「¥380 起 ~ ¥1980」由 mock handler 聚合返回，**前端不计算**
- 加载更多 + 下拉刷新（react-vant `List` + `PullRefresh`）
- 空态文案：「没有找到包含「xxx」的演出」或「当前分类下暂无演出」

## 数据契约

```
GET /api/v1/concerts?page=1&pageSize=20&keyword=&status=on_sale,sold_out,pending
  → ApiResponse<PageResult<ConcertListItem>>

ConcertListItem extends Concert {
  priceRange: [number, number] | null  // 单位：分
  ticketCount: number
}
```

## 字段映射

| 卡片字段 | 数据来源 |
|---|---|
| 海报 | `Concert.coverUrl` |
| 标题 | `Concert.eventName` |
| 副标题 | `Concert.subtitle` |
| 场馆 | `Concert.venueName` |
| 开演时间 | `Concert.startTime`（formatDate） |
| 价格区间 | `ConcertListItem.priceRange`（mock 端聚合） |
| 状态 Tag | `Concert.status` + EVENT_STATUS label/color |

## 错误码

- 400003 活动不存在：本期不会触发（列表不展示 deleted 状态）
- 500001 系统异常：触发时由 ErrorState 显示 + 「重试」按钮

## 组件清单

- `CategoryTabs`：3 个分类切换，受控
- `ConcertCard`：单卡渲染
- `useHomeFeed`：hook（keyword / category / loading / refreshing / loadingMore / list / total / loadMore / refresh / setKeyword / setCategory）
- `LoadingSkeleton` / `ErrorState` / `EmptyState`：通用三件套
- `ErrorBoundary`（main.tsx 顶层）：页面崩溃兜底

## 状态

- M0 / M2：占位「演唱会票务 - 首页」一句话描述
- H1（2026-08-26）：
  - 实装 H5 `ApiProvider` / `useApi`
  - 实装 `concert.listConcerts` mock handler + priceRange 聚合
  - 首页 8 列表格 → 卡片式列表（react-vant）
  - 关键字搜索 / 分类切换 / 下拉刷新 / 上拉加载更多
  - Loading / Error / Empty 三态通用组件
  - ErrorBoundary 顶层兜底
  - TabBarLayout 改用 `useMatch` 替代 fragile 的 `pathname.startsWith`
