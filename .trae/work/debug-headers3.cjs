// 检查 mock adapter 实际看到的 ctx.headers
process.env.DEBUG = '1'
const axios = require('axios')
const api = require('/Users/kzf/Documents/trae-6/packages/api/dist/index.cjs')
const c = api.createApiClient({ baseURL: '/api/v1', getToken: () => 'mock-token-40001' })
// 自定义 mock 替换
api.installMock(c)
// 替换 mockAdapter，加 debug
const dist = require('/Users/kzf/Documents/trae-6/packages/api/dist/index.cjs')
// 通过 router 自定义
const origGet = c.get
c.get = function (url, cfg) {
  console.log('REQUEST URL:', url)
  console.log('REQUEST HEADERS:', c.defaults.headers)
  return origGet.call(c, url, cfg)
}
;(async () => {
  try {
    await c.get('/auth/me')
  } catch (e) {
    console.log('CAUGHT:', e.response?.data?.message)
  }
})()