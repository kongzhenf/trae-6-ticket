// patch mockAdapter 把 ctx.headers 打印出来
const path = require('path')
process.chdir(path.resolve(__dirname, '../..'))

// 拦截 createApiClient 拿 mockAdapter
const apiModule = require('/Users/kzf/Documents/trae-6/packages/api/dist/index.cjs')
// 直接拿 mockAdapter 是 internal，但我们可以用 router 间接看到
// 改写：手动调用 axios 看实际 ctx
const axios = require('axios')
const api = apiModule

const c = api.createApiClient({ baseURL: '/api/v1', getToken: () => 'mock-token-40001' })
api.installMock(c)
c.interceptors.response.use(undefined, err => {
  // 错误日志里包含 status / headers，但我们要看的是 mock handler 内部
  console.log('REQUEST ERR status:', err.response?.status, 'msg:', err.response?.data?.message)
  throw err
})

// 替换 client 上的 adapter 调用来打印
const originalAdapter = c.defaults.adapter
c.defaults.adapter = async (config) => {
  // 这里能看到传进来时的 config.headers
  console.log('ADAPTER incoming headers:', JSON.stringify(config.headers?.toJSON?.() ?? null))
  const result = await originalAdapter(config)
  console.log('ADAPTER result.status:', result.status)
  return result
}

;(async () => {
  try {
    const r = await c.get('/auth/me')
    console.log('SUCCESS:', r.data?.id)
  } catch (e) {
    console.log('FINAL ERROR code:', e.response?.data?.code)
  }
})()