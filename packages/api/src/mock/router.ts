import type { MockHandler, MockRequestContext } from './types'

interface Route {
  method: string
  pattern: RegExp
  handler: MockHandler
}

/** 把 method + path 编译成正则的工厂 */
const re = (p: string) => new RegExp(`^${p}$`)

/** 所有 mock 路由表（按「最长前缀优先」顺序排列，避免 events/:id/tickets 抢到 tickets/:id） */
const routes: Route[] = [
  // ===== Dashboard =====
  { method: 'GET', pattern: re('/admin/v1/dashboard/overview'),    handler: () => import('./handlers/dashboard').then(m => m.overview()) },
  { method: 'GET', pattern: re('/admin/v1/dashboard/top-concerts'), handler: () => import('./handlers/dashboard').then(m => m.topConcerts()) },

  // ===== Event Tickets（必须在 /admin/v1/tickets/:id 之前）） =====
  { method: 'GET',  pattern: re('/admin/v1/events/([^/]+)/tickets'), handler: (ctx) => import('./handlers/ticket').then(m => m.listTickets(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/events/([^/]+)/tickets'), handler: (ctx) => import('./handlers/ticket').then(m => m.createTicket(ctx)) },

  // ===== Event status operations =====
  { method: 'POST', pattern: re('/admin/v1/events/([^/]+)/publish'),     handler: (ctx) => import('./handlers/event').then(m => m.publish(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/events/([^/]+)/offline'),     handler: (ctx) => import('./handlers/event').then(m => m.offline(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/events/([^/]+)/stop-sale'),   handler: (ctx) => import('./handlers/event').then(m => m.stopSale(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/events/([^/]+)/resume-sale'), handler: (ctx) => import('./handlers/event').then(m => m.resumeSale(ctx)) },

  // ===== H9 管理后台订单 =====
  { method: 'POST', pattern: re('/admin/v1/orders/([^/]+)/refund'), handler: (ctx) => import('./handlers/adminOrder').then(m => m.refundOrder(ctx)) },
  { method: 'GET',  pattern: re('/admin/v1/orders/([^/]+)'),       handler: (ctx) => import('./handlers/adminOrder').then(m => m.getOrderDetail(ctx)) },
  { method: 'GET',  pattern: re('/admin/v1/orders'),                handler: (ctx) => import('./handlers/adminOrder').then(m => m.listOrders(ctx)) },

  // ===== H10 管理后台导出中心（注意：/exports/:id/download 必须在 /exports/:id 之前） =====
  { method: 'GET',  pattern: re('/admin/v1/exports/([^/]+)/download'), handler: (ctx) => import('./handlers/adminExport').then(m => m.downloadTask(ctx)) },
  { method: 'GET',  pattern: re('/admin/v1/exports/([^/]+)'),          handler: (ctx) => import('./handlers/adminExport').then(m => m.getTask(ctx)) },
  { method: 'GET',  pattern: re('/admin/v1/exports'),                  handler: (ctx) => import('./handlers/adminExport').then(m => m.listTasks(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/exports'),                  handler: (ctx) => import('./handlers/adminExport').then(m => m.createTask(ctx)) },

  // ===== Event CRUD =====
  { method: 'GET',    pattern: re('/admin/v1/events'),         handler: (ctx) => import('./handlers/event').then(m => m.list(ctx)) },
  { method: 'POST',   pattern: re('/admin/v1/events'),         handler: (ctx) => import('./handlers/event').then(m => m.create(ctx)) },
  { method: 'GET',    pattern: re('/admin/v1/events/([^/]+)'), handler: (ctx) => import('./handlers/event').then(m => m.get(ctx)) },
  { method: 'PUT',    pattern: re('/admin/v1/events/([^/]+)'), handler: (ctx) => import('./handlers/event').then(m => m.update(ctx)) },
  { method: 'DELETE', pattern: re('/admin/v1/events/([^/]+)'), handler: (ctx) => import('./handlers/event').then(m => m.remove(ctx)) },

  // ===== Ticket CRUD & ops =====
  { method: 'PUT',  pattern: re('/admin/v1/tickets/([^/]+)'),         handler: (ctx) => import('./handlers/ticket').then(m => m.update(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/tickets/([^/]+)/enable'),    handler: (ctx) => import('./handlers/ticket').then(m => m.enable(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/tickets/([^/]+)/disable'),   handler: (ctx) => import('./handlers/ticket').then(m => m.disable(ctx)) },
  { method: 'POST', pattern: re('/admin/v1/tickets/([^/]+)/adjust-stock'), handler: (ctx) => import('./handlers/ticket').then(m => m.adjustStock(ctx)) },

  // ===== C 端预留（暂时不实现，返回空） =====
  { method: 'GET',  pattern: re('/api/v1/concerts'),         handler: (ctx) => import('./handlers/concert').then(m => m.listConcerts(ctx)) },
  { method: 'GET',  pattern: re('/api/v1/concerts/([^/]+)'), handler: (ctx) => import('./handlers/concert').then(m => m.getConcert(ctx)) },
  { method: 'GET',  pattern: re('/api/v1/concerts/([^/]+)/tickets'), handler: (ctx) => import('./handlers/concert').then(m => m.listTickets(ctx)) },
  // ===== C 端订单 =====
  { method: 'POST', pattern: re('/api/v1/orders/([^/]+)/pay'),    handler: (ctx) => import('./handlers/order').then(m => m.payOrder(ctx)) },
  { method: 'POST', pattern: re('/api/v1/orders/([^/]+)/cancel'), handler: (ctx) => import('./handlers/order').then(m => m.cancelOrder(ctx)) },
  { method: 'POST', pattern: re('/api/v1/orders'),          handler: (ctx) => import('./handlers/order').then(m => m.createOrder(ctx)) },
  { method: 'GET',  pattern: re('/api/v1/orders/([^/]+)'), handler: (ctx) => import('./handlers/order').then(m => m.getOrderDetail(ctx)) },
  { method: 'GET',  pattern: re('/api/v1/orders'),          handler: (ctx) => import('./handlers/order').then(m => m.listOrders(ctx)) },

  // ===== C 端鉴权（H7 实装）=====
  { method: 'POST', pattern: re('/api/v1/auth/login'),     handler: (ctx) => import('./handlers/user').then(m => m.login(ctx)) },
  { method: 'POST', pattern: re('/api/v1/auth/logout'),    handler: (ctx) => import('./handlers/user').then(m => m.logout(ctx)) },
  { method: 'GET',  pattern: re('/api/v1/auth/me'),        handler: (ctx) => import('./handlers/user').then(m => m.getCurrentUser(ctx)) },

  // ===== H8：观演人（H8 实装；batch 必须排在 GET /:id 之前以防前缀抢匹配） =====
  { method: 'POST', pattern: re('/api/v1/viewers/batch'),  handler: (ctx) => import('./handlers/viewer').then(m => m.batchGetViewers(ctx)) },
  { method: 'GET',  pattern: re('/api/v1/viewers/([^/]+)'), handler: (ctx) => import('./handlers/viewer').then(m => m.getViewer(ctx)) },
  { method: 'PUT',  pattern: re('/api/v1/viewers/([^/]+)'), handler: (ctx) => import('./handlers/viewer').then(m => m.updateViewer(ctx)) },
  { method: 'DELETE', pattern: re('/api/v1/viewers/([^/]+)'), handler: (ctx) => import('./handlers/viewer').then(m => m.deleteViewer(ctx)) },
  { method: 'GET',  pattern: re('/api/v1/viewers'),         handler: (ctx) => import('./handlers/viewer').then(m => m.listViewers(ctx)) },
  { method: 'POST', pattern: re('/api/v1/viewers'),         handler: (ctx) => import('./handlers/viewer').then(m => m.createViewer(ctx)) },
]

export function matchHandler(ctx: MockRequestContext): Promise<unknown> | unknown {
  for (const r of routes) {
    if (r.method !== ctx.method) continue
    if (!r.pattern.test(ctx.url)) continue
    return r.handler(ctx)
  }
  return undefined
}