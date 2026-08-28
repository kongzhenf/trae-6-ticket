import type { AxiosInstance } from 'axios'
import type { concertApi, orderApi, userApi, viewerApi } from '@trae/api'

export type H5Apis = {
  client: AxiosInstance
  concert: ReturnType<typeof concertApi>
  order: ReturnType<typeof orderApi>
  user: ReturnType<typeof userApi>
  /** H8 新增：观演人 */
  viewer: ReturnType<typeof viewerApi>
}
