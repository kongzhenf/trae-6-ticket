import type { TicketTier, TicketTierStatus, StockAdjustment } from '@trae/shared'
import { canTicketTransition } from '@trae/shared'
import { getDB, nextId, persist } from '../store'
import { MockError } from '../types'
import type { MockRequestContext } from '../types'

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export function listTickets(ctx: MockRequestContext): TicketTier[] {
  const eventId = (ctx.url.match(/\/admin\/v1\/events\/([^/]+)\/tickets/) ?? [])[1]
  const db = getDB()
  return db.ticketTiers
    .filter(t => t.eventId === eventId)
    .sort((a, b) => a.sort - b.sort)
}

export function createTicket(ctx: MockRequestContext): TicketTier {
  const eventId = (ctx.url.match(/\/admin\/v1\/events\/([^/]+)\/tickets/) ?? [])[1]
  const db = getDB()
  if (!db.events.find(e => e.id === eventId)) {
    throw new MockError(400003, '活动不存在')
  }
  const body = (ctx.body ?? {}) as Partial<TicketTier>
  if (!body.categoryName) throw new MockError(500001, '票档名称必填')
  if (!body.price || body.price < 0) throw new MockError(500001, '价格必须 ≥ 0')
  if (!body.totalStock || body.totalStock < 0) throw new MockError(500001, '总库存必须 ≥ 0')
  const id = nextId('ticketId')
  const now = nowIso()
  const ticket: TicketTier = {
    id,
    eventId,
    categoryName: body.categoryName!,
    price: body.price!,
    totalStock: body.totalStock!,
    availableStock: body.totalStock!,
    lockedStock: 0,
    soldStock: 0,
    maxBuyQuantity: body.maxBuyQuantity ?? 4,
    saleStartTime: body.saleStartTime ?? '',
    saleEndTime: body.saleEndTime ?? '',
    status: 'available',
    sort: body.sort ?? db.ticketTiers.filter(t => t.eventId === eventId).length,
    description: body.description,
    createdAt: now,
    updatedAt: now,
  }
  db.ticketTiers.push(ticket)
  persist()
  return ticket
}

export function update(ctx: MockRequestContext): TicketTier {
  const id = (ctx.url.match(/\/admin\/v1\/tickets\/([^/]+)/) ?? [])[1]
  const db = getDB()
  const idx = db.ticketTiers.findIndex(t => t.id === id)
  if (idx < 0) throw new MockError(400007, '票档不存在')
  const old = db.ticketTiers[idx]
  const body = (ctx.body ?? {}) as Partial<TicketTier>
  // PRD §31 第 2 条：不信任前端传来的库存与销售统计
  // 这些字段只能由 adjustStock / 订单流程改动
  const updated: TicketTier = {
    ...old,
    categoryName: body.categoryName ?? old.categoryName,
    price: body.price ?? old.price,
    totalStock: body.totalStock ?? old.totalStock,
    maxBuyQuantity: body.maxBuyQuantity ?? old.maxBuyQuantity,
    saleStartTime: body.saleStartTime ?? old.saleStartTime,
    saleEndTime: body.saleEndTime ?? old.saleEndTime,
    sort: body.sort ?? old.sort,
    description: body.description ?? old.description,
    updatedAt: nowIso(),
  }
  db.ticketTiers[idx] = updated
  persist()
  return updated
}

function transition(ctx: MockRequestContext, to: TicketTierStatus, label: string): TicketTier {
  const id = (ctx.url.match(/\/admin\/v1\/tickets\/([^/]+)/) ?? [])[1]
  const db = getDB()
  const idx = db.ticketTiers.findIndex(t => t.id === id)
  if (idx < 0) throw new MockError(400007, '票档不存在')
  const t = db.ticketTiers[idx]
  if (!canTicketTransition(t.status, to)) {
    throw new MockError(500001, `当前状态「${t.status}」不能${label}`)
  }
  db.ticketTiers[idx] = { ...t, status: to, updatedAt: nowIso() }
  persist()
  return db.ticketTiers[idx]
}

export const enable = (ctx: MockRequestContext) => transition(ctx, 'available', '启用')
export const disable = (ctx: MockRequestContext) => transition(ctx, 'stopped', '停售')

/** 库存调整：必填 reason、不可超负、必须写日志（PRD §8） */
export function adjustStock(ctx: MockRequestContext): TicketTier {
  const id = (ctx.url.match(/\/admin\/v1\/tickets\/([^/]+)/) ?? [])[1]
  const body = (ctx.body ?? {}) as { delta?: number; reason?: string }
  const delta = Number(body.delta ?? 0)
  const reason = String(body.reason ?? '').trim()
  if (!reason || reason.length < 4) {
    throw new MockError(500001, '库存调整原因必填且不少于 4 字')
  }
  if (!Number.isFinite(delta) || delta === 0) {
    throw new MockError(500001, '调整量必须为非零整数')
  }
  const db = getDB()
  const idx = db.ticketTiers.findIndex(t => t.id === id)
  if (idx < 0) throw new MockError(400007, '票档不存在')
  const t = db.ticketTiers[idx]
  const before = t.availableStock
  const after = before + delta
  if (after < 0) throw new MockError(400009, '可售库存不能小于 0')
  const newTotal = Math.max(t.totalStock, after)
  const updated: TicketTier = {
    ...t,
    availableStock: after,
    totalStock: newTotal,
    updatedAt: nowIso(),
  }
  db.ticketTiers[idx] = updated
  const adj: StockAdjustment = {
    id: nextId('adjustmentId'),
    ticketTierId: t.id,
    delta,
    beforeAvailable: before,
    afterAvailable: after,
    reason,
    operatorId: 'admin-1',
    createdAt: nowIso(),
  }
  db.stockAdjustments.push(adj)
  persist()
  return updated
}