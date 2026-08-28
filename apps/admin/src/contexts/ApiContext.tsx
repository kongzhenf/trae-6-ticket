import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { AxiosInstance } from 'axios'
import {
  adminEventApi,
  adminTicketApi,
  adminDashboardApi,
  adminOrderApi,
  adminExportApi,
  orderApi,
  userApi,
  viewerApi,
} from '@trae/api'
import type { AdminApis } from './apiTypes'

const ApiCtx = createContext<AdminApis | null>(null)

export function ApiProvider({
  client,
  children,
}: {
  client: AxiosInstance
  children: ReactNode
}) {
  const value = useMemo<AdminApis>(
    () => ({
      client,
      adminEvent: adminEventApi(client),
      adminTicket: adminTicketApi(client),
      adminDashboard: adminDashboardApi(client),
      adminOrder: adminOrderApi(client),
      adminExport: adminExportApi(client),
      order: orderApi(client),
      user: userApi(client),
      viewer: viewerApi(client),
    }),
    [client],
  )
  return <ApiCtx.Provider value={value}>{children}</ApiCtx.Provider>
}

export function useApi(): AdminApis {
  const v = useContext(ApiCtx)
  if (!v) throw new Error('useApi must be used inside <ApiProvider>')
  return v
}
