export { createApiClient } from './client'
export type { ApiClientConfig } from './client'
export type { ApiClientHooks } from './types/request'

// 业务 API（前后端共用）
export { concertApi } from './modules/concert'
export { orderApi, type CreateOrderPayload } from './modules/order'
export { userApi } from './modules/user'
export { uploadApi, type UploadResult } from './modules/upload'
/** H8 新增：观演人 */
export { viewerApi } from './modules/viewer'

// 后台 API（M1 新增）
export { adminEventApi, type ListEventsQuery } from './modules/adminEvent'
export { adminTicketApi, type AdjustStockPayload } from './modules/adminTicket'
export { adminDashboardApi } from './modules/adminDashboard'
/** H9 新增：管理后台订单 API */
export { adminOrderApi } from './modules/adminOrder'
/** H10 新增：管理后台导出中心 API */
export { adminExportApi } from './modules/adminExport'

// Mock 数据层（M1 新增）
export { installMock, resetDB, reloadDB, dbStats, MockError } from './mock'