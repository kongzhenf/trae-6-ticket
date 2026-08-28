import type { AxiosInstance } from 'axios'
import type { ConcertListItem, PageQuery, PageResult } from '@trae/shared'

/** 列表查询参数（C 端） */
export interface ListConcertsQuery extends PageQuery {
  /** 关键字（活动名模糊匹配） */
  keyword?: string
  /** 状态多选（逗号分隔），如 'on_sale,sold_out,pending' */
  status?: string
  /** 开演时间范围 [from, to] ISO */
  startTimeRange?: [string, string]
}

/** 详情查询参数（C 端，可走 listTickets 单独获取票档） */
export type ConcertDetail = ConcertListItem

/** 详情返回（admin 通用） */
export type AdminConcert = ConcertListItem

/**
 * C 端 / 管理后台共用 concert API
 * - H1 阶段已稳定，后续阶段会按需扩字段
 */
export const concertApi = (client: AxiosInstance) => ({
  /** C 端首页列表 */
  listConcerts: (query: ListConcertsQuery = {}): Promise<PageResult<ConcertListItem>> =>
    client.get('/concerts', { params: query }).then(r => r.data as PageResult<ConcertListItem>),

  /** 详情（C 端 + 后台共用，含 priceRange 与 ticketCount） */
  getConcertDetail: (id: string): Promise<ConcertDetail> =>
    client.get(`/concerts/${id}`).then(r => r.data as ConcertDetail),

  /** 该演出下的可见票档（C 端票档选择页） */
  listTickets: (eventId: string): Promise<unknown[]> =>
    client.get(`/concerts/${eventId}/tickets`).then(r => r.data as unknown[]),

  /** 后台接口保留（H2 不使用，留给后续 admin / 后台面板） */
  createConcert: (payload: Partial<ConcertListItem>): Promise<ConcertListItem> =>
    client.post('/concerts', payload).then(r => r.data as ConcertListItem),
  updateConcert: (id: string, payload: Partial<ConcertListItem>): Promise<ConcertListItem> =>
    client.put(`/concerts/${id}`, payload).then(r => r.data as ConcertListItem),
  deleteConcert: (id: string): Promise<void> =>
    client.delete(`/concerts/${id}`).then(() => undefined),
})
