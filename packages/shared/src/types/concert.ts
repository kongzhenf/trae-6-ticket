/** 演出状态机（对齐 PRD §9.1） */
export type ConcertStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'on_sale'
  | 'off_sale'
  | 'offline'
  | 'stopped'
  | 'sold_out'
  | 'finished'
  | 'cancelled'

export interface Artist {
  id: string
  name: string
  avatar?: string
}

export interface Venue {
  id: string
  name: string
  city: string
  address?: string
  longitude?: number
  latitude?: number
}

/** 完整 Event 实体（PRD §5.2） */
export interface Concert {
  id: string
  eventName: string
  subtitle?: string
  coverUrl?: string
  bannerUrl?: string
  detailContent?: string
  startTime: string
  endTime?: string
  venueName: string
  venueAddress?: string
  venueNameCity?: string
  longitude?: number
  latitude?: number
  saleStartTime: string
  saleEndTime: string
  orderTimeoutMinutes: number
  maxBuyQuantity: number
  showStock: boolean
  refundEnabled: boolean
  status: ConcertStatus
  publishStatus?: 'draft' | 'published'
  creatorId?: string
  createdAt: string
  updatedAt: string
}

/** C 端列表/详情专用：服务端聚合返回的票价区间（单位：分）。前端不计算。 */
export interface ConcertListItem extends Concert {
  /** 该演出所有可见票档的最低 / 最高价（分）；无票档时为 null */
  priceRange: [number, number] | null
  /** 可见票档总数 */
  ticketCount: number
}

/** Dashboard 顶部指标（PRD B01） */
export interface DashboardOverview {
  totalEvents: number
  onSaleEvents: number
  totalOrders: number
  paidOrders: number
  totalTicketsSold: number
  totalSalesAmount: number // 分
  todayOrders: number
  todaySalesAmount: number // 分
}

/** 热门演出行 */
export interface DashboardTopConcert {
  concertId: string
  eventName: string
  ticketsSold: number
  salesAmount: number // 分
}