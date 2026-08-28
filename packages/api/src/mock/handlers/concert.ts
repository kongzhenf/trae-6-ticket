import type { Concert, ConcertListItem, PageResult, TicketTier } from '@trae/shared'
import type { MockRequestContext } from '../types'
import { getDB } from '../store'
import { MockError } from '../types'

/** C 端可见状态白名单（H1 起固定） */
const C_VISIBLE_STATUSES = ['on_sale', 'sold_out', 'pending'] as const

/** 计算 priceRange 与 ticketCount：排除 hidden 票档 */
function aggregatePricing(eventId: string): {
  priceRange: [number, number] | null
  ticketCount: number
} {
  const db = getDB()
  const tiers = db.ticketTiers.filter(
    t => t.eventId === eventId && t.status !== 'hidden',
  )
  if (tiers.length === 0) return { priceRange: null, ticketCount: 0 }
  const prices = tiers.map(t => t.price)
  return {
    priceRange: [Math.min(...prices), Math.max(...prices)],
    ticketCount: tiers.length,
  }
}

function attachPricing(e: Concert): ConcertListItem {
  const agg = aggregatePricing(e.id)
  return { ...e, ...agg }
}

export function listConcerts(ctx: MockRequestContext): PageResult<ConcertListItem> {
  const db = getDB()
  let list = [...db.events]

  const keyword = (ctx.params?.keyword as string | undefined)?.trim()
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter(e => e.eventName.toLowerCase().includes(kw))
  }

  // 状态过滤：默认仅展示对 C 端可见的状态
  let statuses: string[] | null = null
  const rawStatus = ctx.params?.status as string | undefined
  if (rawStatus && String(rawStatus).trim()) {
    statuses = String(rawStatus)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }
  const allowed = statuses && statuses.length > 0 ? statuses : [...C_VISIBLE_STATUSES]
  list = list.filter(e => allowed.includes(e.status))

  // 开演时间范围
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
  const pageSize = Number(ctx.params?.pageSize ?? 20)
  const sorted = list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const sliced = sorted.slice((page - 1) * pageSize, page * pageSize)

  return {
    list: sliced.map(attachPricing),
    total: sorted.length,
    page,
    pageSize,
  }
}

export function getConcert(ctx: MockRequestContext): ConcertListItem {
  const id = (ctx.url.match(/\/api\/v1\/concerts\/([^/]+)/) ?? [])[1]
  const db = getDB()
  const ev = db.events.find(e => e.id === id)
  if (!ev) throw new MockError(400003, '活动不存在')
  return attachPricing(ev)
}

/** C 端票档列表：仅返回非 hidden 票档 */
export function listTickets(ctx: MockRequestContext): TicketTier[] {
  const eventId = (ctx.url.match(/\/api\/v1\/concerts\/([^/]+)\/tickets/) ?? [])[1]
  const db = getDB()
  return db.ticketTiers
    .filter(t => t.eventId === eventId && t.status !== 'hidden')
    .sort((a, b) => a.sort - b.sort)
}
