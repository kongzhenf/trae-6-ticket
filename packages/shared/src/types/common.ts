/** 通用 API 响应包装 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页查询参数 */
export interface PageQuery {
  page?: number
  pageSize?: number
  keyword?: string
  /** H5 C 端按 userId 过滤；H5 mock 默认 40001 */
  userId?: string
  /** H5 C 端按订单状态过滤（逗号分隔） */
  status?: string
}

/** 分页结果 */
export interface PageResult<T = unknown> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
