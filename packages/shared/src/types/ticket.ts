/** 票档状态 */
export type TicketTierStatus = 'available' | 'sold_out' | 'hidden' | 'stopped'

/** 票档实体（PRD §5.3） */
export interface TicketTier {
  id: string
  eventId: string
  categoryName: string
  /** 单价（单位：分）。PRD §31 第 1 条：前端不可信，以服务端为准 */
  price: number
  totalStock: number
  availableStock: number
  lockedStock: number
  soldStock: number
  maxBuyQuantity: number
  saleStartTime: string
  saleEndTime: string
  status: TicketTierStatus
  sort: number
  description?: string
  createdAt: string
  updatedAt: string
}

/** 库存调整记录（PRD §8 票档接口要求写入日志） */
export interface StockAdjustment {
  id: string
  ticketTierId: string
  /** 调整量（正/负整数） */
  delta: number
  beforeAvailable: number
  afterAvailable: number
  reason: string
  operatorId: string
  createdAt: string
}