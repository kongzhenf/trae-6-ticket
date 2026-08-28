import type { AxiosInstance } from 'axios'
import type { LoginPayload, LoginResult, User } from '@trae/shared'

export const userApi = (client: AxiosInstance) => ({
  login: (payload: LoginPayload): Promise<LoginResult> =>
    client
      .post('/auth/login', payload)
      .then((r) => r.data as unknown as LoginResult),
  logout: (): Promise<void> => client.post('/auth/logout').then(() => undefined),
  getCurrentUser: (): Promise<User> =>
    client.get('/auth/me').then((r) => r.data as unknown as User),
})
