import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { AxiosInstance } from 'axios'
import { concertApi, orderApi, userApi, viewerApi } from '@trae/api'
import type { H5Apis } from './apiTypes'

const ApiCtx = createContext<H5Apis | null>(null)

/**
 * H5 端 API 上下文
 * - H1：concert（首页列表 + 详情 + 票档）
 * - H4：order（createOrder / listOrders / getOrderDetail）
 * - H7：user（login / me / logout）
 * - H8：viewer（list / get / create / update / delete / batch）
 */
export function ApiProvider({
  client,
  children,
}: {
  client: AxiosInstance
  children: ReactNode
}) {
  const value = useMemo<H5Apis>(
    () => ({
      client,
      concert: concertApi(client),
      order: orderApi(client),
      user: userApi(client),
      viewer: viewerApi(client),
    }),
    [client],
  )
  return <ApiCtx.Provider value={value}>{children}</ApiCtx.Provider>
}

export function useApi(): H5Apis {
  const v = useContext(ApiCtx)
  if (!v) throw new Error('useApi must be used inside <ApiProvider>')
  return v
}
