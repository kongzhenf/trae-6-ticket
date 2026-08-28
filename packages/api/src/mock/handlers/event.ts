import type { Concert, ConcertStatus, PageResult } from '@trae/shared'
import { canTransition } from '@trae/shared'
import { getDB, nextId, persist } from '../store'
import { MockError } from '../types'
import type { MockRequestContext } from '../types'

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export function list(ctx: MockRequestContext): PageResult<Concert> {
  const db = getDB()
  let list = [...db.events]
  const keyword = (ctx.params?.keyword as string | undefined)?.trim()
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter(e => e.eventName.toLowerCase().includes(kw))
  }
  const status = ctx.params?.status as string | undefined
  if (status) {
    const arr = String(status).split(',').map(s => s.trim()).filter(Boolean)
    if (arr.length > 0) {
      list = list.filter(e => arr.includes(e.status))
    }
  }
  // 时间范围（demo 简化）：startTimeRange=[from,to] ISO 字符串
  const startRange = ctx.params?.startTimeRange as string | undefined
  if (startRange) {
    const [from, to] = String(startRange).split(',').map(s => s.trim())
    list = list.filter(e => {
      const t = e.startTime
      if (from && t < from) return false
      if (to && t > to) return false
      return true
    })
  }
  const page = Number(ctx.params?.page ?? 1)
  const pageSize = Number(ctx.params?.pageSize ?? 10)
  const sorted = list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return {
    list: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageSize,
  }
}

export function get(ctx: MockRequestContext): Concert {
  const id = (ctx.url.match(/\/admin\/v1\/events\/([^/]+)/) ?? [])[1]
  const db = getDB()
  const ev = db.events.find(e => e.id === id)
  if (!ev) throw new MockError(400003, '活动不存在')
  return ev
}

export function create(ctx: MockRequestContext): Concert {
  const db = getDB()
  const body = (ctx.body ?? {}) as Partial<Concert>
  if (!body.eventName) throw new MockError(500001, '活动名称必填')
  const id = nextId('eventId')
  const now = nowIso()
  // 默认 15 分钟订单超时 / 限购 4 张
  const ev: Concert = {
    id,
    eventName: body.eventName!,
    subtitle: body.subtitle,
    coverUrl: body.coverUrl,
    bannerUrl: body.bannerUrl,
    detailContent: body.detailContent,
    startTime: body.startTime ?? '',
    endTime: body.endTime,
    venueName: body.venueName ?? '',
    venueAddress: body.venueAddress,
    longitude: body.longitude,
    latitude: body.latitude,
    saleStartTime: body.saleStartTime ?? '',
    saleEndTime: body.saleEndTime ?? '',
    orderTimeoutMinutes: body.orderTimeoutMinutes ?? 15,
    maxBuyQuantity: body.maxBuyQuantity ?? 4,
    showStock: body.showStock ?? true,
    refundEnabled: body.refundEnabled ?? true,
    status: 'draft',
    publishStatus: 'draft',
    creatorId: 'admin-1',
    createdAt: now,
    updatedAt: now,
  }
  db.events.push(ev)
  persist()
  return ev
}

export function update(ctx: MockRequestContext): Concert {
  const id = (ctx.url.match(/\/admin\/v1\/events\/([^/]+)/) ?? [])[1]
  const db = getDB()
  const idx = db.events.findIndex(e => e.id === id)
  if (idx < 0) throw new MockError(400003, '活动不存在')
  const old = db.events[idx]
  const body = (ctx.body ?? {}) as Partial<Concert>
  // PRD §31 第 1 条：不信任前端传入的字段（status / publishStatus / creatorId / createdAt / updatedAt / sold 统计字段）
  // 这些字段由 mock 服务端控制
  const updated: Concert = {
    ...old,
    eventName: body.eventName ?? old.eventName,
    subtitle: body.subtitle ?? old.subtitle,
    coverUrl: body.coverUrl ?? old.coverUrl,
    bannerUrl: body.bannerUrl ?? old.bannerUrl,
    detailContent: body.detailContent ?? old.detailContent,
    startTime: body.startTime ?? old.startTime,
    endTime: body.endTime ?? old.endTime,
    venueName: body.venueName ?? old.venueName,
    venueAddress: body.venueAddress ?? old.venueAddress,
    longitude: body.longitude ?? old.longitude,
    latitude: body.latitude ?? old.latitude,
    saleStartTime: body.saleStartTime ?? old.saleStartTime,
    saleEndTime: body.saleEndTime ?? old.saleEndTime,
    orderTimeoutMinutes: body.orderTimeoutMinutes ?? old.orderTimeoutMinutes,
    maxBuyQuantity: body.maxBuyQuantity ?? old.maxBuyQuantity,
    showStock: body.showStock ?? old.showStock,
    refundEnabled: body.refundEnabled ?? old.refundEnabled,
    updatedAt: nowIso(),
  }
  db.events[idx] = updated
  persist()
  return updated
}

export function remove(ctx: MockRequestContext): { ok: true } {
  const id = (ctx.url.match(/\/admin\/v1\/events\/([^/]+)/) ?? [])[1]
  const db = getDB()
  const idx = db.events.findIndex(e => e.id === id)
  if (idx < 0) throw new MockError(400003, '活动不存在')
  const ev = db.events[idx]
  // PRD §31 第 8 条：含订单数据的活动不得物理删除（只能下架）
  if (db.orders.some(o => o.eventId === id)) {
    throw new MockError(400018, '活动存在订单数据，不能物理删除，请下架')
  }
  if (db.ticketTiers.some(t => t.eventId === id)) {
    throw new MockError(400018, '活动存在票档数据，不能物理删除，请下架')
  }
  // 草稿 / 待开售 允许删除
  if (ev.status !== 'draft' && ev.status !== 'pending') {
    throw new MockError(400018, `当前状态「${ev.status}」不允许删除`)
  }
  db.events.splice(idx, 1)
  persist()
  return { ok: true }
}

/** 状态机：draft/pending → published */
function transition(ctx: MockRequestContext, to: ConcertStatus, label: string): Concert {
  const id = (ctx.url.match(/\/admin\/v1\/events\/([^/]+)/) ?? [])[1]
  const db = getDB()
  const idx = db.events.findIndex(e => e.id === id)
  if (idx < 0) throw new MockError(400003, '活动不存在')
  const ev = db.events[idx]
  if (!canTransition(ev.status, to)) {
    throw new MockError(400004, `当前状态「${ev.status}」不能${label}（非法转移）`)
  }
  db.events[idx] = { ...ev, status: to, updatedAt: nowIso() }
  persist()
  return db.events[idx]
}

export const publish  = (ctx: MockRequestContext) => transition(ctx, 'published', '发布')
export const offline  = (ctx: MockRequestContext) => transition(ctx, 'offline',   '下架')
export const stopSale = (ctx: MockRequestContext) => transition(ctx, 'stopped',   '暂停销售')
export const resumeSale = (ctx: MockRequestContext) => transition(ctx, 'on_sale', '恢复销售')