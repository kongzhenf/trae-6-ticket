import type { ExportTaskStatus } from '../types/exportTask'

/** 导出任务状态展示元数据（PRD §B10 + H10） */
export const EXPORT_STATUS: Record<ExportTaskStatus, { label: string; color: 'default' | 'processing' | 'success' | 'warning' | 'error' }> = {
  processing: { label: '生成中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  expired: { label: '已过期', color: 'default' },
}

export const EXPORT_STATUS_LIST: ExportTaskStatus[] = [
  'processing',
  'completed',
  'failed',
  'expired',
]
