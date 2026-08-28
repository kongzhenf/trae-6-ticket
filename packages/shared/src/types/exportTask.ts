import type { OrderStatus } from './order'
import type { PaymentStatus } from './payment'

/** 导出任务状态机（H10 B10） */
export type ExportTaskStatus = 'processing' | 'completed' | 'failed' | 'expired'

/** 导出任务类型（本期只支持 order） */
export type ExportTaskType = 'order'

/** 创建导出时提交的过滤条件 */
export interface ExportTaskFilter {
  /** 单选演出 ID */
  eventId: string
  /** 订单状态多选；空数组 = 全部 */
  orderStatus?: OrderStatus[]
  /** 支付状态多选；空数组 = 全部 */
  paymentStatus?: PaymentStatus[]
  /** 创建时间区间 [start, end] ISO 字符串 */
  createdAtRange: [string, string]
}

/** 导出任务（H10） */
export interface ExportTask {
  /** 内部主键 */
  id: string
  /** 业务编号 EXP + YYYYMMDD + 4 位自增 */
  taskNo: string
  type: ExportTaskType
  eventId: string
  /** 冗余存，避免活动改名后历史任务失真 */
  eventName: string
  /** 创建时的过滤条件快照 */
  filter: ExportTaskFilter
  /** 命中订单数（completed 后才有值） */
  orderCount: number
  /** 用于列表展示的「订单状态」多选值 */
  orderStatuses: OrderStatus[]
  /** 用于列表展示的「支付状态」多选值 */
  paymentStatuses: PaymentStatus[]
  /** 创建人；mock 端默认 'admin-1' */
  createdBy: string
  /** ISO */
  createdAt: string
  status: ExportTaskStatus
  /** 仅 failed 时写 */
  errorMessage?: string
  /** 下载链接过期时间 = createdAt + 7d */
  expireAt: string
  /** mock 端把生成好的 CSV 内容 base64 存这里；真实场景会指向对象存储 */
  payloadBase64?: string
  /** mock 端文件下载元数据（仅 completed 后有） */
  filename?: string
  mime?: string
}

/** 创建导出 payload（客户端提交） */
export type CreateExportPayload = Pick<
  ExportTask,
  'type' | 'eventId' | 'filter' | 'orderStatuses' | 'paymentStatuses'
>
