import type { Concert, TicketTier, StockAdjustment, Order, User, Viewer, ExportTask } from '@trae/shared'

/** mock 数据库结构 */
export interface MockDB {
  events: Concert[]
  ticketTiers: TicketTier[]
  stockAdjustments: StockAdjustment[]
  orders: Order[]
  users: User[]
  /** H8 新增：用户级观演人库（按 userId 隔离） */
  viewers: Viewer[]
  /** H10 新增：导出任务 */
  exportTasks: ExportTask[]
  counters: {
    eventId: number
    ticketId: number
    orderId: number
    userId: number
    /** H8 新增 */
    viewerId: number
    adjustmentId: number
    /** H10 新增 */
    exportTaskId: number
  }
}

/** adapter 匹配时统一传入的请求上下文 */
export interface MockRequestContext {
  method: string
  url: string
  params?: Record<string, unknown>
  body?: unknown
  headers?: Record<string, string>
}

/** handler 返回值：data 字段原样包裹进 ApiResponse */
export type MockHandler = (ctx: MockRequestContext) => unknown | Promise<unknown>

/** mock 业务错误对象，router 在 handler throw 时转换为 Axios reject */
export class MockError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message)
    this.name = 'MockError'
  }
}
