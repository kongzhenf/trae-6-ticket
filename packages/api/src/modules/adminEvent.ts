import type { AxiosInstance } from 'axios'
import type { Concert, PageQuery, PageResult } from '@trae/shared'

export interface ListEventsQuery extends PageQuery {
  keyword?: string
  /** 逗号分隔多选，如 'on_sale,off_sale' */
  status?: string
  startTimeRange?: [string, string]
}

export const adminEventApi = (client: AxiosInstance) => ({
  listEvents: (q: ListEventsQuery = {}): Promise<PageResult<Concert>> =>
    client.get('/events', { params: q }).then(r => r.data as PageResult<Concert>),

  getEvent: (id: string): Promise<Concert> =>
    client.get(`/events/${id}`).then(r => r.data as Concert),

  createEvent: (payload: Omit<Concert, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Concert> =>
    client.post('/events', payload).then(r => r.data as Concert),

  updateEvent: (id: string, payload: Partial<Concert>): Promise<Concert> =>
    client.put(`/events/${id}`, payload).then(r => r.data as Concert),

  deleteEvent: (id: string): Promise<{ ok: true }> =>
    client.delete(`/events/${id}`).then(r => r.data as { ok: true }),

  publishEvent: (id: string): Promise<Concert> =>
    client.post(`/events/${id}/publish`).then(r => r.data as Concert),

  offlineEvent: (id: string): Promise<Concert> =>
    client.post(`/events/${id}/offline`).then(r => r.data as Concert),

  stopSale: (id: string): Promise<Concert> =>
    client.post(`/events/${id}/stop-sale`).then(r => r.data as Concert),

  resumeSale: (id: string): Promise<Concert> =>
    client.post(`/events/${id}/resume-sale`).then(r => r.data as Concert),
})