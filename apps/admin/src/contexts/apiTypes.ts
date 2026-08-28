import type { AxiosInstance } from 'axios'
import type {
  adminDashboardApi,
  adminEventApi,
  adminExportApi,
  adminOrderApi,
  adminTicketApi,
  orderApi,
  userApi,
  viewerApi,
} from '@trae/api'

export type AdminApis = {
  client: AxiosInstance
  adminEvent: ReturnType<typeof adminEventApi>
  adminTicket: ReturnType<typeof adminTicketApi>
  adminDashboard: ReturnType<typeof adminDashboardApi>
  /** H9 新增：管理后台订单 API（B05 专用） */
  adminOrder: ReturnType<typeof adminOrderApi>
  /** H10 新增：管理后台导出中心 API */
  adminExport: ReturnType<typeof adminExportApi>
  /** C 端订单 API（兼容旧调用方） */
  order: ReturnType<typeof orderApi>
  user: ReturnType<typeof userApi>
  /** H8 新增：观演人 */
  viewer: ReturnType<typeof viewerApi>
}
