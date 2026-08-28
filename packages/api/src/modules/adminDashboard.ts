import type { AxiosInstance } from 'axios'
import type { DashboardOverview, DashboardTopConcert } from '@trae/shared'

export const adminDashboardApi = (client: AxiosInstance) => ({
  overview: (): Promise<DashboardOverview> =>
    client.get('/dashboard/overview').then(r => r.data as DashboardOverview),

  topConcerts: (): Promise<DashboardTopConcert[]> =>
    client.get('/dashboard/top-concerts').then(r => r.data as DashboardTopConcert[]),
})