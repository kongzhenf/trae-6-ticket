const axios = require('axios')
const c = axios.create({ baseURL: '/api/v1' })
// 先看真实 axios 1.x 的 headers 行为
c.interceptors.request.use(req => {
  console.log('req.headers:', req.headers)
  console.log('typeof:', typeof req.headers)
  if (req.headers && typeof req.headers.entries === 'function') {
    console.log('it IS iterable, entries:')
    for (const [k, v] of req.headers.entries()) console.log(' ', k, '=', v)
  }
  req.headers.set('Authorization', 'Bearer mock-token-40001')
  console.log('after set:', [...req.headers.entries()])
  return req
})
;(async () => {
  await c.get('/auth/me', { adapter: async (config) => {
    // 自定义 adapter 看实际 config
    console.log('adapter config.headers:', config.headers)
    if (config.headers && typeof config.headers.entries === 'function') {
      console.log('  entries:')
      for (const [k, v] of config.headers.entries()) console.log('  ', k, '=', v)
    }
    return { status: 200, statusText: 'OK', headers: {}, config, data: { code: 0, data: { id: 'ok' } } }
  } })
})()