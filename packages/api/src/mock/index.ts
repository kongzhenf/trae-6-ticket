import type { AxiosInstance } from 'axios'
import { mockAdapter } from './adapter'
import { dbStats, reloadDB, resetDB } from './store'

/** 把 mock adapter 装到 axios client */
export function installMock(client: AxiosInstance): void {
  client.defaults.adapter = mockAdapter
}

export { resetDB, reloadDB, dbStats }
export { MockError } from './types'