import type { AxiosInstance } from 'axios'
import type { TicketTier, StockAdjustment } from '@trae/shared'
import { getDB } from '../mock/store'

export interface AdjustStockPayload {
  /** 正负整数，正为加，负为减 */
  delta: number
  /** 调整原因（≥4 字） */
  reason: string
}

export const adminTicketApi = (client: AxiosInstance) => ({
  listTickets: (eventId: string): Promise<TicketTier[]> =>
    client.get(`/events/${eventId}/tickets`).then(r => r.data as TicketTier[]),

  createTicket: (
    eventId: string,
    payload: Omit<TicketTier, 'id' | 'eventId' | 'availableStock' | 'lockedStock' | 'soldStock' | 'createdAt' | 'updatedAt'>,
  ): Promise<TicketTier> =>
    client.post(`/events/${eventId}/tickets`, payload).then(r => r.data as TicketTier),

  updateTicket: (id: string, payload: Partial<TicketTier>): Promise<TicketTier> =>
    client.put(`/tickets/${id}`, payload).then(r => r.data as TicketTier),

  enableTicket: (id: string): Promise<TicketTier> =>
    client.post(`/tickets/${id}/enable`).then(r => r.data as TicketTier),

  disableTicket: (id: string): Promise<TicketTier> =>
    client.post(`/tickets/${id}/disable`).then(r => r.data as TicketTier),

  adjustStock: (id: string, payload: AdjustStockPayload): Promise<TicketTier> =>
    client.post(`/tickets/${id}/adjust-stock`, payload).then(r => r.data as TicketTier),

  // 库存调整日志（mock 端存于 stockAdjustments，未来可能后端分离）
  listStockAdjustments: (ticketTierId: string): Promise<StockAdjustment[]> => {
    // 直接走 store 而非 axios（避免 mock router 与业务耦合）
    return Promise.resolve(
      getDB().stockAdjustments
        .filter((a: StockAdjustment) => a.ticketTierId === ticketTierId)
        .sort((a: StockAdjustment, b: StockAdjustment) => b.createdAt.localeCompare(a.createdAt)),
    )
  },
})