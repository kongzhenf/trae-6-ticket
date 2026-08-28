const axios = require('axios')
const api = require('/Users/kzf/Documents/trae-6/packages/api/dist/index.cjs')
const c = api.createApiClient({ baseURL: '/api/v1', getToken: () => 'mock-token-40001' })
api.installMock(c)
;(async () => {
  try {
    const r = await c.get('/auth/me')
    console.log('OK:', r.data?.id)
  } catch (e) {
    console.log('FAIL:', e.response?.data?.code, e.response?.data?.message)
  }
})()