import type { AxiosInstance } from 'axios'
import type { Viewer, ViewerInput } from '@trae/shared'

/**
 * 观演人 API（H8 落地）
 * - listViewers：按 userId 查该用户所有观演人（按 updatedAt 倒序）
 * - getViewer：单条
 * - createViewer：新增（C 端无需传 userId，自动从 auth 解析；admin 调用可显式传 userId 字段由后端覆盖）
 * - updateViewer：部分字段更新
 * - deleteViewer：删除
 * - batchGetViewers：批量
 */
export const viewerApi = (client: AxiosInstance) => ({
  listViewers: (userId: string): Promise<Viewer[]> =>
    client.get('/viewers', { params: { userId } }).then(r => r.data as Viewer[]),

  getViewer: (id: string): Promise<Viewer> =>
    client.get(`/viewers/${id}`).then(r => r.data as Viewer),

  createViewer: (payload: ViewerInput): Promise<Viewer> =>
    client.post('/viewers', payload).then(r => r.data as Viewer),

  updateViewer: (id: string, payload: Partial<ViewerInput>): Promise<Viewer> =>
    client.put(`/viewers/${id}`, payload).then(r => r.data as Viewer),

  deleteViewer: (id: string): Promise<{ ok: true }> =>
    client.delete(`/viewers/${id}`).then(r => r.data as { ok: true }),

  batchGetViewers: (ids: string[]): Promise<Viewer[]> =>
    client.post('/viewers/batch', { ids }).then(r => r.data as Viewer[]),
})
