// H5 路由 path 集中管理
export const H5_ROUTES = {
  home: '/',
  login: '/login',
  concertDetail: (id = ':id') => `/concerts/${id}`,
  ticketTier: (id = ':id') => `/concerts/${id}/tickets`,
  orderCreate: '/orders/create',
  orderDetail: (id = ':id') => `/orders/${id}`,
  profile: '/profile',
  /** H8 新增：个人中心 → 观演人管理 */
  profileViewers: '/profile/viewers',
} as const

// Admin 路由 path 集中管理
export const ADMIN_ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  concertList: '/concerts',
  concertEdit: (id = ':id') => `/concerts/${id}/edit`,
  /** M5 新增：票档管理 */
  concertTickets: (id = ':id') => `/concerts/${id}/tickets`,
  orderManage: '/orders',
  /** H9 新增：订单详情独立路由（本期默认 Drawer 内嵌，常量预留） */
  orderDetail: (id: string | ':id' = ':id') => `/orders/${id}`,
  userManage: '/users',
  /** H8 新增：观演人管理（只读） */
  adminViewersManage: '/users/viewers',
  /** H10 新增：导出中心 */
  exportCenter: '/exports',
  exportTaskDetail: (id: string | ':id' = ':id') => `/exports/${id}`,
} as const
