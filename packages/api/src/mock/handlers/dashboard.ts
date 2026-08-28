import type { DashboardOverview, DashboardTopConcert } from '@trae/shared'
import { getDB } from '../store'

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function overview(): DashboardOverview {
  const db = getDB()
  const todayStart = startOfToday()
  const paidOrders = db.orders.filter(o => o.status === 'paid')
  const todayOrdersAll = db.orders.filter(o => new Date(o.createdAt.replace(' ', 'T')).getTime() >= todayStart.getTime())
  const todayPaidOrders = paidOrders.filter(
    o => o.paidAt && new Date(o.paidAt.replace(' ', 'T')).getTime() >= todayStart.getTime(),
  )
  const totalTicketsSold = db.ticketTiers.reduce((s, t) => s + t.soldStock, 0)
  return {
    totalEvents: db.events.length,
    onSaleEvents: db.events.filter(e => e.status === 'on_sale').length,
    totalOrders: db.orders.length,
    paidOrders: paidOrders.length,
    totalTicketsSold,
    totalSalesAmount: paidOrders.reduce((s, o) => s + o.payAmount, 0),
    todayOrders: todayOrdersAll.length,
    todaySalesAmount: todayPaidOrders.reduce((s, o) => s + o.payAmount, 0),
  }
}

export function topConcerts(): DashboardTopConcert[] {
  const db = getDB()
  return db.events
    .map(e => ({
      concertId: e.id,
      eventName: e.eventName,
      ticketsSold: db.ticketTiers
        .filter(t => t.eventId === e.id)
        .reduce((s, t) => s + t.soldStock, 0),
      salesAmount: db.orders
        .filter(o => o.eventId === e.id && o.status === 'paid')
        .reduce((s, o) => s + o.payAmount, 0),
    }))
    .sort((a, b) => b.ticketsSold - a.ticketsSold)
    .slice(0, 10)
}