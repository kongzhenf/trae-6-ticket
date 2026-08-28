// 直接打印 mockAdapter 看到的 ctx.headers
const path = require('path')
process.chdir(path.resolve(__dirname, '../..'))
const axios = require('axios')

// 通过 axios.create + 自定义 adapter 完全模拟
const c = axios.create({
  baseURL: '/api/v1',
  adapter: async (config) => {
    const h = config.headers
    console.log('config.headers type:', typeof h)
    console.log('config.headers has toJSON:', typeof h?.toJSON)
    if (typeof h?.toJSON === 'function') {
      console.log('toJSON():', h.toJSON())
    }
    return { status: 200, statusText: 'OK', headers: {}, config, data: { code: 0, data: null } }
  },
})

c.interceptors.request.use(req => {
  console.log('interceptor: set Bearer')
  req.headers.set('Authorization', 'Bearer mock-token-40001')
  return req
})

;(async () => {
  // 直接打 adapter 抓到的
  console.log('---')
  await c.get('/auth/me')
  console.log('---')
})()