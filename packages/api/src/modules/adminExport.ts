import type { AxiosInstance } from 'axios'
import type { CreateExportPayload, ExportTask, PageQuery, PageResult } from '@trae/shared'

/** H10：管理后台导出中心 API */
export const adminExportApi = (client: AxiosInstance) => ({
  /** 任务列表（分页 + 倒序） */
  listTasks: (query: PageQuery = {}): Promise<PageResult<ExportTask>> =>
    client.get('/admin/v1/exports', { params: query }).then(r => r.data as PageResult<ExportTask>),

  /** 创建导出任务（异步；立即返回 processing 中的任务） */
  createTask: (payload: CreateExportPayload): Promise<ExportTask> =>
    client.post('/admin/v1/exports', payload).then(r => r.data as ExportTask),

  /** 任务详情 */
  getTask: (id: string): Promise<ExportTask> =>
    client.get(`/admin/v1/exports/${id}`).then(r => r.data as ExportTask),

  /**
   * 任务下载元数据（mock 端直接返回 base64；真实场景返回对象存储签名 URL）
   * - 前端拿到后用 atob + Uint8Array + Blob + a.download 触发浏览器下载
   */
  downloadTask: (id: string): Promise<{ base64: string; filename: string; mime: string }> =>
    client.get(`/admin/v1/exports/${id}/download`).then(r => r.data as { base64: string; filename: string; mime: string }),
})
